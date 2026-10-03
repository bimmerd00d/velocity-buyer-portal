const GRAPHQL = 'https://api-b2b.bigcommerce.com/graphql';
const API = 'https://api-b2b.bigcommerce.com/api/v3/io';
export function numericId(value) {
  const raw = String(value || '');
  if (/^[1-9]\d*$/.test(raw)) return raw;
  const decoded = Buffer.from(raw, 'base64').toString('utf8');
  return /^[A-Za-z]+:[1-9]\d*$/.test(decoded) ? decoded.split(':')[1] : null;
}
export function selectLogo(attachments) {
  const candidates = attachments.filter(item => {
    try {
      const url = new URL(item.attachmentUrl || item.attachmentFile);
      const name = decodeURIComponent(url.pathname.split('/').pop());
      return url.protocol === 'https:' && /^companylogo(?:_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?\.png$/i.test(name);
    } catch { return false; }
  });
  if (candidates.length !== 1) return null;
  return candidates[0].attachmentUrl || candidates[0].attachmentFile;
}
export async function lookupCompanyLogo({ token, companyId, managementToken, storeHash, fetcher = fetch }) {
  const query = async (query, variables = {}) => {
    const r = await fetcher(GRAPHQL, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error('unauthorized');
    const payload = await r.json();
    if (payload.errors?.length) throw new Error('unauthorized');
    return payload.data;
  };
  const { currentUser } = await query('query LogoBuyer { currentUser { id } }');
  const userId = numericId(currentUser?.id);
  if (!userId) throw new Error('unauthorized');
  const { userCompany } = await query('query LogoCompany($id: Int!) { userCompany(userId: $id) { id } }', { id: Number(userId) });
  const ownCompany = numericId(userCompany?.id);
  // Never use a client-supplied company ID to read management attachments without matching membership.
  if (!ownCompany || ownCompany !== companyId) throw new Error('forbidden');
  const r = await fetcher(`${API}/companies/${ownCompany}/attachments`, { headers: { 'X-Auth-Token': managementToken, 'X-Store-Hash': storeHash }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('upstream');
  const payload = await r.json();
  if (!Array.isArray(payload.data)) throw new Error('upstream');
  return { companyId: ownCompany, url: selectLogo(payload.data) };
}
