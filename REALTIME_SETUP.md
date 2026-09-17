# Supabase Realtime integration

Frontend synchronization is now event-driven for orders, kitchen and delivery.
The existing Express/Prisma Server remains the source of truth for reads and writes.
Supabase Realtime only tells the browser that database data changed, then the browser
refetches through the existing Server API.

## Required environment variables

Copy `.env.local.example` to `.env.local` (or keep your existing file) and set:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Never put `service_role` in the frontend.

## Enable database tables for Postgres Changes

Run `supabase/realtime.sql` in Supabase SQL Editor, or add these tables manually to
`Database -> Publications -> supabase_realtime`:

- `orders`
- `order_items`
- `deliveries`
- `tracking_events`

## How it works

- `src/lib/realtime.js` subscribes to Supabase Postgres Changes.
- `App.jsx` listens for order/delivery changes and refetches `/api/orders`.
- `KitchenDashboard.jsx` listens to `orders` + `order_items` and refetches the Kitchen API.
- `DeliveryDashboard.jsx` listens to `deliveries` + `tracking_events` + `orders` and refetches the Delivery API.
- Same-browser mutations still trigger the existing local sync event immediately.
- A 30-second polling fallback remains for temporary WebSocket/network failures.
- Delivery creation compatibility was moved to `MainApp` so Cashier/Admin keeps creating/assigning delivery jobs even while navigating between staff pages.

## Test

1. Start frontend and Server.
2. Log in as Cashier on one browser/device and Kitchen on another.
3. Browser DevTools should show `[Realtime] ... connected`.
4. Create/confirm an order and verify Kitchen updates without waiting for polling.
5. Mark an order READY and verify Delivery updates immediately after the delivery record is created.

If Inspector works with role `postgres` but the frontend receives no changes, inspect RLS/policies.
The browser uses the publishable/anon key, not the `postgres` role.
