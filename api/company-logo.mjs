import { lookupCompanyLogo } from '../server/company-logo.mjs';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Access-Control-Allow-Origin', 'https://dealers.velocity-stack.net');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const authorization = req.headers.authorization || '';
  if (!/^Bearer \S+$/.test(authorization) || authorization.length > 10000) return res.status(401).json({ error: 'Sign in required' });
  const companyId = String(req.query.companyId || '');
  if (!/^[1-9]\d{0,12}$/.test(companyId)) return res.status(400).json({ error: 'Invalid company' });
  if (!process.env.BC_LOGO_ACCESS_TOKEN || !process.env.BC_LOGO_STORE_HASH) return res.status(503).json({ error: 'Logo service unavailable' });
  try {
    const result = await lookupCompanyLogo({ token: authorization.slice(7), companyId, managementToken: process.env.BC_LOGO_ACCESS_TOKEN, storeHash: process.env.BC_LOGO_STORE_HASH });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.message === 'unauthorized' ? 401 : error.message === 'forbidden' ? 403 : 502;
    return res.status(status).json({ error: status === 502 ? 'Logo service unavailable' : 'Company access denied' });
  }
}
