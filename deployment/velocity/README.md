# Velocity Dealer — deployed October 3, 2026

Live: https://dealers.velocity-stack.net/

The approved dealer design is live on channel 1 with the customized open-source Buyer Portal. BigCommerce serves Stencil, catalog, pricing, sessions and checkout. Vercel serves the portal assets. No Catalyst or DNS changes were needed.

## Source and ownership

- Stencil working tree: `/Users/brandon.holloway/.codex/worktrees/velocity-dealer/velocity`, branch `codex/dealer-portal`.
- Settings: `storefront/theme-configs/dealer.settings.json` in that tree.
- Portal: `/Users/brandon.holloway/Projects/velocity-buyer-portal`, https://github.com/bimmerd00d/velocity-buyer-portal.
- Vercel: `velocity-buyer-portal` under `bimmerd00ds-projects`.
- Assets: https://velocity-buyer-portal.vercel.app/.
- Static design exploration remains in `marketing/dealer-portal/public`; its demo parts list is not production functionality.

## Live configuration

- Theme: Velocity Dealer — Trade Desk, UUID `efc1a460-a188-013f-e6c0-5e53173c381a`.
- Variation: `f0987fa0-a188-013f-e6c0-5e53173c381a`.
- Active configuration: `fd862430-a188-013f-0a03-6654d1f26f17` (370 settings verified).
- B2B Storefronts → Velocity Group → Buyer portal → Type: Custom, Use global unchecked. Other B2B options retain existing values.
- Channel-scoped footer loader: Script Manager UUID `eae572a2-6f94-408b-b791-6fdcc420c929`, `/dealer-loader.js` on Vercel.
- Selecting Custom removes native app modules automatically. The loader also checks against duplicate mounting.
- Old Cart Entries Widget and Product Entries Badge retain their complete source in Script Manager, but their opening script tag uses `type="text/plain" data-disabled="dealer-redesign-2026-10-03"` so they no longer execute.

## Validation

Production build and lint passed; 54 login/logout/shopping-list tests passed. Real dealer login and account navigation work without captured browser errors. Desktop and mobile layouts inspected. Dealer price $399.20 for the $499 Kenwood product persisted through cart and BigCommerce checkout. Test cart restored to empty; no order, payment or address submitted. All six other channels retain their exact previous active theme/configuration/version identifiers.

The account shows empty order/quote/list states. Existing seed list 1050378 has no channel association and belongs to another company user; seeded quotes remain In Process. Existing record visibility has not been changed. Full quote submission, list lifecycle, company switching and payment completion are not certified by these checks.

## Rollback

Backups: `snapshots/dealer-before-2026-10-03/` in the main project.

Restore previous Elevate theme `c161c760-e5de-013b-509c-32be06899b7d`, configuration `780aba30-018c-013c-a067-42edc270f7d4`, version `c20daa80-e5de-013b-509c-32be06899b7d` on channel 1 only. Restore Buyer portal Type to Use global / Default; native scripts return and the guarded custom loader skips mounting. Disable the custom Script Manager entry when retiring it. To restore giveaway widgets, change their opening tags back to `<script>`.

## Releasing portal changes

Build locally with the production public environment variables before publishing. Regenerate the index.js SHA-384 in public/dealer-loader.js. Add the new loader SHA-384 alongside the previous one in the BigCommerce script integrity_hashes before deploying; otherwise the browser blocks the release. Push to main to trigger Vercel, then verify remote loader and index hashes match. Keep the previous deployment and integrity hash for rollback. Never put management credentials in VITE variables.

The fork needs reviewed upstream updates; it no longer receives BigCommerce hosted-portal changes automatically.
