# ShopLedger

## Stack
- Node.js with CommonJS JavaScript.
- Express 4 serves the static browser app and JSON API; `body-parser` parses JSON request bodies.
- Browser UI is plain HTML, CSS, and JavaScript under `public/`.
- Application data is stored in `data/db.json` by synchronous file reads and writes in `lib/store.js`.

## Module map
- `routes/customers.js` — customer listing and Khata settlement endpoints.
- `routes/orders.js` — order listing, lookup, placement, and cancellation endpoints.
- `routes/products.js` — product and active coupon listing endpoints.
- `routes/reports.js` — dashboard, GST reconciliation, pricing preview, and admin export endpoints.
- `lib/coupons.js` — coupon lookup, validation, normalization, and discount calculation.
- `lib/dates.js` — local date formatting, date-key normalization, and fiscal-year formatting.
- `lib/inventory.js` — product lookup, sellable stock checks, stock updates, and inventory summary.
- `lib/invoice.js` — invoice figure calculation and printable HTML rendering.
- `lib/ledger.js` — customer balances, Khata order charges/reversals, and settlements.
- `lib/orders.js` — order creation, lookup, cancellation, and filtered listing.
- `lib/pricing.js` — subtotal, coupon discount, and checkout totals with line GST breakdown.
- `lib/reports.js` — dashboard summary and comparison of stored order totals with invoice calculations.
- `lib/store.js` — reads and writes `data/db.json` and appends audit entries.
- `lib/tax.js` — GST rate lookup by item rate or HSN and CGST/SGST splitting.

## Commands
- Start the app: `npm start` (runs `node server.js`).
- Run tests: `node --test` (no test files are currently present; `package.json` has a placeholder `test` script).

## Rules
1. Write characterization tests before changing behaviour.
2. Change only the module(s) the ticket is about.
3. Tests never read or write `data/db.json`; use in-memory data.
4. Add no dependencies.
5. Make the smallest fix that works.

## Current ticket
- Invoice total and GST breakdown do not match what the customer was billed.
- Allowed files: `lib/invoice.js` (`lib/tax.js` only if truly needed).
