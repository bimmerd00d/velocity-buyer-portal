import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/company-sales-reps.mjs';

function invoke({ method = 'GET', authorization = 'Bearer buyer', companyId = '123' } = {}) {
  const result = { headers: {} };
  const res = {
    setHeader(key, value) { result.headers[key] = value; return this; },
    status(value) { result.status = value; return this; },
    json(value) { result.body = value; return this; },
    end() { return this; },
  };
  return handler({ method, headers: { authorization }, query: { companyId } }, res).then(() => result);
}

test('validates method, bearer token, company ID, and configuration before fetching', async () => {
  const previousToken = process.env.BC_LOGO_ACCESS_TOKEN;
  delete process.env.BC_LOGO_ACCESS_TOKEN;
  try {
    assert.equal((await invoke({ method: 'POST' })).status, 405);
    assert.equal((await invoke({ authorization: '' })).status, 401);
    assert.equal((await invoke({ companyId: '../123' })).status, 400);
    assert.equal((await invoke()).status, 503);
    assert.equal((await invoke({ method: 'OPTIONS' })).status, 204);
  } finally {
    if (previousToken !== undefined) process.env.BC_LOGO_ACCESS_TOKEN = previousToken;
  }
});

test('sets private no-store and restricted origin headers', async () => {
  const result = await invoke({ method: 'OPTIONS' });
  assert.equal(result.headers['Cache-Control'], 'private, no-store');
  assert.equal(result.headers['Access-Control-Allow-Origin'], 'https://dealers.velocity-stack.net');
  assert.equal(result.headers['Access-Control-Allow-Headers'], 'Authorization');
  assert.equal(result.headers.Vary, 'Origin');
});

test('maps denied company access to 403 without calling management', async () => {
  const previousFetch = global.fetch;
  const previousToken = process.env.BC_LOGO_ACCESS_TOKEN;
  const previousStore = process.env.BC_LOGO_STORE_HASH;
  let calls = 0;
  process.env.BC_LOGO_ACCESS_TOKEN = 'management';
  process.env.BC_LOGO_STORE_HASH = 'store';
  global.fetch = async (_url, init) => {
    calls++;
    const { query } = JSON.parse(init.body);
    return { ok: true, json: async () => ({ data: query.includes('currentUser') ? { currentUser: { id: '10', role: 2 } } : { userCompany: { id: '456' } } }) };
  };
  try {
    const result = await invoke();
    assert.equal(result.status, 403);
    assert.deepEqual(result.body, { error: 'Company access denied' });
    assert.equal(calls, 2);
  } finally {
    global.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.BC_LOGO_ACCESS_TOKEN;
    else process.env.BC_LOGO_ACCESS_TOKEN = previousToken;
    if (previousStore === undefined) delete process.env.BC_LOGO_STORE_HASH;
    else process.env.BC_LOGO_STORE_HASH = previousStore;
  }
});
