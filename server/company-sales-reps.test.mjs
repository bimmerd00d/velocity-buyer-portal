import test from 'node:test';
import assert from 'node:assert/strict';
import { lookupCompanySalesReps } from './company-sales-reps.mjs';

const options = { token: 'buyer', companyId: '123', managementToken: 'management', storeHash: 'store' };
const response = data => ({ ok: true, json: async () => ({ data }) });
const buyer = overrides => ({ id: '10', bcId: 20, role: 2, masqueradingCompanyId: null, ...overrides });

function fetcherFor({ user = buyer(), company = { id: '123' }, masquerade, staff = [], details = {} } = {}) {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith('/graphql')) {
      const { query } = JSON.parse(init.body);
      if (query.includes('currentUser')) return response({ currentUser: user });
      if (query.includes('userCompany')) return response({ userCompany: company });
      if (query.includes('superAdminMasquerading')) return response({ superAdminMasquerading: masquerade });
    }
    if (url.endsWith('/sales-staffs?companyId=123')) return response(staff);
    const id = url.match(/\/sales-staffs\/(\d+)$/)?.[1];
    if (id && Object.hasOwn(details, id)) return response(details[id]);
    throw new Error(`Unexpected request: ${url}`);
  };
  return { fetcher, calls };
}

test('returns only contact fields for reps verified as assigned to the requested company', async () => {
  const { fetcher, calls } = fetcherFor({
    staff: [{ id: 7, salesRepName: 'A summary', email: 'summary@example.test' }, { id: 8, salesRepName: 'B summary' }],
    details: {
      7: { id: 7, name: 'A Rep', email: 'a@example.test', phoneNumber: '555-1234', assignedCompanies: [{ id: 123, secret: 'hidden' }], privateField: 'hidden' },
      8: { id: 8, name: 'B Rep', email: 'b@example.test', assignedCompanies: [{ id: 456 }] },
    },
  });
  assert.deepEqual(await lookupCompanySalesReps({ ...options, fetcher }), {
    representatives: [{ id: 7, name: 'A Rep', email: 'a@example.test', phone: '555-1234' }],
  });
  assert.equal(calls.length, 5);
  assert.equal(calls[2].init.headers['X-Store-Hash'], 'store');
  assert.equal(calls[2].init.headers['X-Auth-Token'], 'management');
});

test('missing phone is blank without inventing a number', async () => {
  const { fetcher } = fetcherFor({
    staff: [{ id: 7, salesRepName: 'A Rep', email: 'a@example.test' }],
    details: { 7: { id: 7, name: 'A Rep', email: 'a@example.test', assignedCompanies: [{ id: '123' }] } },
  });
  assert.deepEqual(await lookupCompanySalesReps({ ...options, fetcher }), {
    representatives: [{ id: 7, name: 'A Rep', email: 'a@example.test', phone: '' }],
  });
});

test('cross-company access never calls management', async () => {
  const { fetcher, calls } = fetcherFor({ company: { id: '456' } });
  await assert.rejects(lookupCompanySalesReps({ ...options, fetcher }), /forbidden/);
  assert.equal(calls.length, 2);
});

test('active super admin masquerade allows only its server-confirmed company', async () => {
  const { fetcher, calls } = fetcherFor({
    user: buyer({ role: 3, masqueradingCompanyId: 123 }),
    company: { id: '456' },
    masquerade: { id: '123' },
  });
  assert.deepEqual(await lookupCompanySalesReps({ ...options, fetcher }), { representatives: [] });
  assert.equal(calls.length, 4);
});

test('a mismatched or inactive masquerade cannot call management', async () => {
  for (const scenario of [
    { user: buyer({ role: 3, masqueradingCompanyId: 456 }), masquerade: { id: '123' }, expectedCalls: 2 },
    { user: buyer({ role: 2, masqueradingCompanyId: 123 }), masquerade: { id: '123' }, expectedCalls: 2 },
    { user: buyer({ role: 3, masqueradingCompanyId: 123 }), masquerade: { id: '456' }, expectedCalls: 3 },
  ]) {
    const { fetcher, calls } = fetcherFor({ ...scenario, company: { id: '456' } });
    await assert.rejects(lookupCompanySalesReps({ ...options, fetcher }), /forbidden/);
    assert.equal(calls.length, scenario.expectedCalls);
  }
});

test('invalid token and malformed management responses fail closed', async () => {
  let calls = 0;
  await assert.rejects(lookupCompanySalesReps({ ...options, fetcher: async () => { calls++; return { ok: false }; } }), /unauthorized/);
  assert.equal(calls, 1);

  const invalidList = fetcherFor({ staff: { data: [] } });
  await assert.rejects(lookupCompanySalesReps({ ...options, fetcher: invalidList.fetcher }), /upstream/);

  const unverifiedDetail = fetcherFor({ staff: [{ id: 7 }], details: { 7: { id: 7, name: 'A Rep' } } });
  await assert.rejects(lookupCompanySalesReps({ ...options, fetcher: unverifiedDetail.fetcher }), /upstream/);
});
