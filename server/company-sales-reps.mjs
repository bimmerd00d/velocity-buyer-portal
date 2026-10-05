import { numericId } from './company-logo.mjs';

const GRAPHQL = 'https://api-b2b.bigcommerce.com/graphql';
const API = 'https://api-b2b.bigcommerce.com/api/v3/io';
const contactText = value => typeof value === 'string' ? value : '';

export async function lookupCompanySalesReps({ token, companyId, managementToken, storeHash, fetcher = fetch }) {
  const query = async (query, variables = {}) => {
    const response = await fetcher(GRAPHQL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('unauthorized');
    const payload = await response.json();
    if (payload.errors?.length || !payload.data) throw new Error('unauthorized');
    return payload.data;
  };

  const { currentUser } = await query('query SalesRepBuyer { currentUser { id bcId role masqueradingCompanyId } }');
  const userId = numericId(currentUser?.id);
  if (!userId) throw new Error('unauthorized');

  const { userCompany } = await query('query SalesRepCompany($id: Int!) { userCompany(userId: $id) { id } }', { id: Number(userId) });
  const ownCompany = numericId(userCompany?.id);
  if (ownCompany !== companyId) {
    // A super admin can see only the company in the active server-side masquerade.
    if (currentUser.role !== 3 || numericId(currentUser.masqueradingCompanyId) !== companyId) {
      throw new Error('forbidden');
    }
    const customerId = Number(currentUser.bcId);
    if (!Number.isSafeInteger(customerId) || customerId < 1) throw new Error('forbidden');
    const { superAdminMasquerading } = await query(
      'query SalesRepMasquerade($id: Int!) { superAdminMasquerading(customerId: $id) { id } }',
      { id: customerId },
    );
    if (numericId(superAdminMasquerading?.id) !== companyId) throw new Error('forbidden');
  }

  const headers = { 'X-Auth-Token': managementToken, 'X-Store-Hash': storeHash };
  const managementGet = async (path) => {
    const response = await fetcher(`${API}${path}`, { headers, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('upstream');
    const payload = await response.json();
    if (!payload || !Object.hasOwn(payload, 'data')) throw new Error('upstream');
    return payload.data;
  };

  const staff = await managementGet(`/sales-staffs?companyId=${companyId}`);
  if (!Array.isArray(staff)) throw new Error('upstream');

  const representatives = [];
  const seen = new Set();
  for (const summary of staff) {
    const id = numericId(summary?.id);
    if (!id || seen.has(id)) throw new Error('upstream');
    seen.add(id);
    const detail = await managementGet(`/sales-staffs/${id}`);
    if (numericId(detail?.id) !== id || !Array.isArray(detail.assignedCompanies)) throw new Error('upstream');
    if (!detail.assignedCompanies.some(company => numericId(company?.id) === companyId)) continue;
    representatives.push({
      id: Number(id),
      name: contactText(detail.name) || contactText(summary.salesRepName),
      email: contactText(detail.email) || contactText(summary.email),
      phone: contactText(detail.phoneNumber),
    });
  }
  return { representatives };
}
