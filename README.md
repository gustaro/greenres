# LimeLeaf Kitchen — McDelivery-inspired structure V3

React + Vite mockup. The layout is intentionally closer to the supplied reference in overall information hierarchy and proportions: centered floating navbar, large promotional hero, lower service strip, menu ordering view, login/logout, cart and checkout. Branding, colors, copy and food assets are original mock content.

## Run
```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## Supabase setup

1. Create a Supabase project and open **SQL Editor**.
2. Run the complete [`supabase/schema.sql`](supabase/schema.sql) file. The script is idempotent and can be run again when upgrading an existing project.
3. Copy `.env.local` values from **Project Settings → API**:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

4. Sign up once, copy the user UUID from **Authentication → Users**, then run:

```sql
update public.profiles set role = 'admin' where id = 'YOUR-USER-UUID';
```

The schema includes products, categories, editable hero slides, promotions, profiles, inventory, orders, order items, seed data, image storage policies, transactional order placement, and RLS policies.

## Interactions
- Delivery / ORDER NOW opens ordering screen
- Login / logout
- Add products to cart
- Cart drawer
- Checkout form
- Order success screen
- Hero slides and promotion cards can be created, edited, reordered, enabled, disabled, and deleted from the admin console
- Marketing images can be uploaded directly from the Hero and promotion forms
- Cashier portal supports counter payments, cash change, payment references, printable receipts, transaction search, daily/weekly sales summaries, payment breakdowns, best sellers, and CSV export
- Customers can apply promotion codes, track order progress, cancel pending unpaid orders, and review order history
- Paid orders automatically earn one point per 10 baht with a customer-visible points ledger
- Admins can rename and reorder categories and edit product names, images, prices, categories, and statuses
- Catalog, users, stock, promotions and orders persist in Supabase
- Cart persists in localStorage
