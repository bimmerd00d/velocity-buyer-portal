# Company logos

Updated October 3, 2026. The six companies have transparent 1500 × 420 PNG logos attached as companylogo.png. Editable SVG originals remain in public/company-logos and their earlier company attachments were preserved.

## Adding or replacing a logo

In BigCommerce B2B, open the company and upload a transparent PNG named **companylogo.png** in its attachments. Keep exactly one current matching PNG per company. Remove the previous companylogo PNG when replacing it; do not remove unrelated company documents. BigCommerce adds a UUID to stored filenames; the service recognizes this suffix. PNGs should have generous clear space and a transparent background. 1500 × 420 works well for a horizontal logo.

The portal reads the designated attachment on login/page navigation and rechecks after a minute when queried. A page refresh forces a new session lookup. Missing, duplicate or failed images fall back to the company name. No redeploy or company-ID mapping is needed for new companies.

## Implementation

api/company-logo.mjs runs on Vercel, validates the B2B bearer session through currentUser and userCompany, and matches the requested company against verified membership before using the management API. It returns only the matching logo URL, never the attachment list. BC_LOGO_ACCESS_TOKEN and BC_LOGO_STORE_HASH are encrypted production server variables, never VITE variables. Results use private/no-store. Sales-rep masquerade and subsidiary contexts that do not match the verified user company intentionally fall back to the name; no access is granted implicitly.

CompanyIdentity appears in the desktop sidebar, mobile account area and Account settings. The preview's upload control is local-only; live uploads are managed in BigCommerce, not yet through Buyer Portal Account settings.

## Verification

Six server tests cover matching, missing/duplicate logos, numeric/GraphQL IDs, invalid sessions and cross-company denial. Nine identity/account settings tests pass. Live API verification with the seeded Apex buyer retrieved its PNG and rejected a request for Redline's logo.

## Sources

https://docs.bigcommerce.com/developer/api-reference/rest/b2b/management/company/companies/get-companies-company-id-attachments
https://docs.bigcommerce.com/developer/api-reference/rest/b2b/management/company/companies/post-companies-company-id-attachments
