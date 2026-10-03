# Velocity Dealer Buyer Portal

This fork serves the open-source Buyer Portal inside the existing BigCommerce Stencil storefront. It does not require Catalyst or move checkout to Vercel.

## Ownership and hosting

- GitHub: bimmerd00d/velocity-buyer-portal
- Vercel team: bimmerd00ds-projects
- Vercel project: velocity-buyer-portal
- Asset origin: https://velocity-buyer-portal.vercel.app/
- BigCommerce dealer channel: 1; store hash: kl9eidhjei
- Storefront: https://dealers.velocity-stack.net/
- Initial upstream revision: e64fba78fe2816c3ae38f3dc047f85d83cc14f03

Run commands from apps/storefront. Node >=22.16 and Corepack Yarn 1.22.22 are required. Install with `corepack yarn install --frozen-lockfile`, then `corepack yarn build`.

Production build variables (public configuration, never credentials):

```
VITE_IS_LOCAL_ENVIRONMENT=FALSE
VITE_DISABLE_BUILD_HASH=TRUE
VITE_ASSETS_ABSOLUTE_PATH=https://velocity-buyer-portal.vercel.app/
```

The trailing slash is required. Production API endpoints come from upstream defaults. Do not copy the internal bcdev API endpoint in the upstream example. Never add management API tokens to VITE variables or browser code.

## Integration status and next validation

The hosted build is an asset deployment, not a standalone storefront. No dealer-channel scripts or Buyer Portal settings have been switched. The existing Stencil theme and native Buyer Portal remain active.

Before activation:

1. Back up channel 1 Header/Footer scripts and its Buyer Portal configuration.
2. Load the custom module in an isolated Stencil preview, replacing the native module only in that preview. Avoid mounting both portal builds.
3. Validate buyer login/logout, account navigation, company switching/roles, shopping lists, quote flow, dealer pricing, cart and BigCommerce checkout. Use existing demo accounts and avoid submitting orders or payments.
4. Review the actual portal branding on desktop and mobile. The current changes establish typography, shapes and default palette; remotely configured portal colors can override defaults.
5. For channel 1 only, choose the Custom Buyer Portal type and install the reviewed loader following upstream docs/stencil.md. Keep other channels unchanged.
6. Verify module/CSS requests are public (no Vercel deployment protection challenge) and CORS headers are present.
7. Roll back by restoring the backed-up channel configuration and native scripts.

Do not change dealer DNS. Vercel serves public JavaScript/CSS; browser sessions and commerce continue on the dealer storefront. Stable index.js must revalidate; hashed chunks may cache indefinitely. Retain old deployments for rollback. A future release should pin its asset base to an immutable public deployment and update the store loader together, avoiding mixed-version imports.

## Branding

Graphite, paper and deep teal defaults align with the approved Velocity Dealer direction. The supplied editable logo is in apps/storefront/public/velocity-dealer.svg. Barlow typography falls back to Arial until loaded by the host Stencil theme. Full dashboard layout customization remains a separate integration step.

## Maintenance

Keep upstream as the BigCommerce remote. Review and test upstream security and feature updates before merging. This fork does not receive hosted Buyer Portal updates automatically.
