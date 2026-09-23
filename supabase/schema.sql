begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    name text not null default '',
    email text,
    phone text,
    avatar_url text,
    role text not null default 'customer' check (role in ('customer', 'kitchen', 'delivery', 'cashier', 'waiter', 'admin')),
    status text not null default 'active' check (status in ('active', 'blocked')),
    points integer not null default 0 check (points >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists name text not null default '';
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists title text default 'นาย';
alter table public.profiles add column if not exists birthday date;
alter table public.profiles add column if not exists addresses jsonb default '[]'::jsonb;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists role text not null default 'customer';
alter table public.profiles add column if not exists status text not null default 'active';
alter table public.profiles add column if not exists points integer not null default 0;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('customer', 'kitchen', 'delivery', 'cashier', 'waiter', 'admin'));
alter table public.profiles drop constraint if exists profiles_status_check;
update public.profiles set status = 'unable' where status = 'blocked';
alter table public.profiles add constraint profiles_status_check check (status in ('active', 'unable'));

create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.products (
    id uuid primary key default gen_random_uuid(),
    category_id uuid references public.categories(id) on delete restrict,
    name text not null,
    name_en text not null default '',
    price numeric(10,2) not null check (price >= 0),
    image_url text,
    status text not null default 'มี' check (status in ('มี', 'เหลือน้อย', 'หมด')),
    stock_quantity integer not null default 0 check (stock_quantity >= 0),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check check (status in ('หมด', 'มี', 'เหลือน้อย', 'วัตถุดิบไม่เพียงพอ'));

create table if not exists public.promotions (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,
    description text not null default '',
    discount_type text not null default 'percent' check (discount_type in ('percent', 'fixed')),
    discount_value numeric(10,2) not null check (discount_value > 0),
    starts_at timestamptz,
    ends_at timestamptz,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (ends_at is null or starts_at is null or ends_at > starts_at)
);
alter table public.promotions add column if not exists title text;
alter table public.promotions add column if not exists image_url text;
alter table public.promotions add column if not exists button_label text not null default 'ดูเมนู';
alter table public.promotions add column if not exists button_link text not null default '/order';
alter table public.promotions add column if not exists sort_order integer not null default 0;

create table if not exists public.hero_slides (
    id uuid primary key default gen_random_uuid(),
    eyebrow text not null default '',
    title text not null,
    description text not null default '',
    button_label text not null default 'ดูเพิ่มเติม',
    button_link text not null default '/order',
    image_url text not null,
    background_color text not null default '#b8ff35',
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.ingredient_categories (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    name_en text,
    slug text not null unique,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.inventory (
    id uuid primary key default gen_random_uuid(),
    category_id uuid references public.ingredient_categories(id) on delete restrict,
    ingredient_name text not null unique,
    ingredient_name_en text,
    quantity numeric(12,2) not null default 0 check (quantity >= 0),
    unit text not null,
    low_stock_threshold numeric(12,2) not null default 10 check (low_stock_threshold >= 0),
    updated_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.inventory add column if not exists status text not null default 'ยังคงเหลือ';
alter table public.inventory add column if not exists expires_at date;
alter table public.inventory add column if not exists category_id uuid references public.ingredient_categories(id) on delete restrict;
alter table public.inventory add column if not exists ingredient_name_en text;
alter table public.inventory drop constraint if exists inventory_status_check;
alter table public.inventory add constraint inventory_status_check check (status in ('หมดอายุ', 'ยังคงเหลือ'));

create table if not exists public.orders (
    id uuid primary key default gen_random_uuid(),
    order_number text not null unique default ('ORD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
    customer_id uuid references public.profiles(id) on delete set null,
    customer_name text,
    subtotal numeric(10,2) not null default 0 check (subtotal >= 0),
    discount_amount numeric(10,2) not null default 0 check (discount_amount >= 0),
    delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0),
    total_amount numeric(10,2) not null default 0 check (total_amount >= 0),
    payment_method text not null,
    is_paid boolean not null default false,
    delivery_type text not null,
    delivery_address text,
    delivery_schedule_type text,
    scheduled_at timestamptz,
    food_status text not null default 'รอยืนยัน' check (food_status in ('รอยืนยัน', 'กำลังทำ', 'ทำเสร็จแล้ว', 'พร้อมจัดส่ง', 'จัดส่งเสร็จสิ้น', 'ยกเลิก')),
    approved_at timestamptz,
    approved_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.orders add column if not exists cash_collected_amount numeric(10,2) not null default 0;
alter table public.orders add column if not exists cash_collected_at timestamptz;
alter table public.orders add column if not exists cash_collected_by uuid references public.profiles(id) on delete set null;
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists paid_by uuid references public.profiles(id) on delete set null;
alter table public.orders add column if not exists payment_reference text;
alter table public.orders add column if not exists payment_note text;
alter table public.orders add column if not exists tendered_amount numeric(10,2) not null default 0;
alter table public.orders add column if not exists promotion_id uuid references public.promotions(id) on delete set null;
alter table public.orders add column if not exists promotion_code text;
alter table public.orders add column if not exists delivery_schedule_type text;
alter table public.orders add column if not exists scheduled_at timestamptz;
alter table public.orders drop constraint if exists orders_delivery_type_check;
alter table public.orders add constraint orders_delivery_type_check check (delivery_type in ('ทานที่ร้าน', 'รับเองที่ร้าน', 'ให้จัดส่ง'));
alter table public.orders drop constraint if exists orders_delivery_schedule_type_check;
alter table public.orders add constraint orders_delivery_schedule_type_check check (delivery_schedule_type is null or delivery_schedule_type in ('ทันที', 'ระบุเวลา'));
alter table public.orders drop constraint if exists orders_food_status_check;
alter table public.orders add constraint orders_food_status_check check (food_status in ('รอยืนยัน', 'กำลังทำ', 'กำลังจัดส่ง', 'ทำเสร็จแล้ว', 'พร้อมจัดส่ง', 'จัดส่งเสร็จสิ้น', 'ยกเลิก'));

create table if not exists public.order_items (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders(id) on delete cascade,
    product_id uuid references public.products(id) on delete set null,
    product_name text not null,
    quantity integer not null check (quantity > 0),
    price_at_time numeric(10,2) not null check (price_at_time >= 0),
    note text,
    created_at timestamptz not null default now()
);

create table if not exists public.points_transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    order_id uuid references public.orders(id) on delete set null,
    transaction_type text not null check (transaction_type in ('earn', 'redeem', 'adjust')),
    amount integer not null,
    description text not null default '',
    created_at timestamptz not null default now(),
    unique(order_id, transaction_type)
);

create table if not exists public.product_ingredients (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id) on delete cascade,
    inventory_id uuid not null references public.inventory(id) on delete restrict,
    quantity_required numeric(12,3) not null check (quantity_required > 0),
    unit text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(product_id, inventory_id)
);

create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists orders_food_status_idx on public.orders(food_status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_paid_at_idx on public.orders(paid_at desc);
create index if not exists orders_is_paid_idx on public.orders(is_paid);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists points_transactions_user_id_idx on public.points_transactions(user_id, created_at desc);
create index if not exists product_ingredients_product_id_idx on public.product_ingredients(product_id);
create index if not exists product_ingredients_inventory_id_idx on public.product_ingredients(inventory_id);
create index if not exists inventory_category_id_idx on public.inventory(category_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
drop trigger if exists promotions_set_updated_at on public.promotions;
create trigger promotions_set_updated_at before update on public.promotions for each row execute function public.set_updated_at();
drop trigger if exists hero_slides_set_updated_at on public.hero_slides;
create trigger hero_slides_set_updated_at before update on public.hero_slides for each row execute function public.set_updated_at();
drop trigger if exists inventory_set_updated_at on public.inventory;
create trigger inventory_set_updated_at before update on public.inventory for each row execute function public.set_updated_at();
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();
drop trigger if exists product_ingredients_set_updated_at on public.product_ingredients;
create trigger product_ingredients_set_updated_at before update on public.product_ingredients for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    insert into public.profiles (id, name, email)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)), new.email)
    on conflict (id) do nothing;
    return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.has_role(allowed_roles text[])
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid() and role = any(allowed_roles) and status = 'active'
    );
$$;

create or replace function public.protect_profile_access_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if tg_op = 'INSERT' and auth.uid() is not null and not public.has_role(array['admin']) then
        new.role := 'customer';
        new.status := 'active';
    elsif tg_op = 'UPDATE' and auth.uid() is not null and not public.has_role(array['admin']) then
        new.role := old.role;
        new.status := old.status;
        if pg_trigger_depth() = 1 then new.points := old.points; end if;
        new.email := old.email;
    end if;
    return new;
end;
$$;
drop trigger if exists profiles_protect_access_fields on public.profiles;
create trigger profiles_protect_access_fields before insert or update on public.profiles for each row execute function public.protect_profile_access_fields();

create or replace function public.set_order_approval_actor()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if old.food_status = 'รอยืนยัน' and new.food_status = 'กำลังทำ' then
        new.approved_at := coalesce(new.approved_at, now());
        new.approved_by := auth.uid();
    end if;
    if old.cash_collected_at is null and new.cash_collected_at is not null then
        new.cash_collected_by := auth.uid();
    end if;
    if not old.is_paid and new.is_paid then
        new.paid_at := coalesce(new.paid_at, now());
        new.paid_by := auth.uid();
    end if;
    return new;
end;
$$;
drop trigger if exists orders_set_approval_actor on public.orders;
create trigger orders_set_approval_actor before update on public.orders for each row execute function public.set_order_approval_actor();

create or replace function public.award_order_points()
returns trigger language plpgsql security definer set search_path = public as $$
declare
    earned_points integer := floor(new.total_amount / 10);
    inserted_points integer;
begin
    if earned_points > 0 and new.customer_id is not null then
        insert into public.points_transactions (user_id, order_id, transaction_type, amount, description)
        values (new.customer_id, new.id, 'earn', earned_points, 'คะแนนจากออเดอร์ ' || new.order_number)
        on conflict (order_id, transaction_type) do nothing
        returning amount into inserted_points;
        if inserted_points is not null then
            update public.profiles set points = points + inserted_points where id = new.customer_id;
        end if;
    end if;
    return new;
end;
$$;
drop trigger if exists orders_award_points on public.orders;
create trigger orders_award_points after update of is_paid on public.orders for each row when (old.is_paid = false and new.is_paid = true) execute function public.award_order_points();

drop function if exists public.place_order(jsonb, text, text, text);
drop function if exists public.place_order(jsonb, text, text, text, text, timestamptz);
drop function if exists public.place_order(jsonb, text, text, text, text, timestamptz, text);
create function public.place_order(
    p_items jsonb,
    p_payment_method text,
    p_delivery_type text,
    p_delivery_address text default null,
    p_delivery_schedule_type text default null,
    p_scheduled_at timestamptz default null,
    p_promotion_code text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
    new_order_id uuid;
    calculated_subtotal numeric(10,2);
    calculated_fee numeric(10,2);
    calculated_discount numeric(10,2) := 0;
    selected_promotion public.promotions%rowtype;
begin
    if auth.uid() is null then raise exception 'Authentication required'; end if;
    if jsonb_array_length(p_items) = 0 then raise exception 'Order must contain at least one item'; end if;
    if p_delivery_type not in ('ทานที่ร้าน', 'รับเองที่ร้าน', 'ให้จัดส่ง') then raise exception 'Invalid delivery type'; end if;
    if p_payment_method not in ('ชำระที่ร้าน', 'เงินสด', 'ชำระเงินปลายทาง', 'บัตรเครดิต/เดบิต', 'QR Payment') then raise exception 'Invalid payment method'; end if;
    if p_payment_method = 'ชำระเงินปลายทาง' and p_delivery_type <> 'ให้จัดส่ง' then raise exception 'Cash on delivery is only available for delivery orders'; end if;
    if p_payment_method = 'เงินสด' and p_delivery_type = 'ให้จัดส่ง' then raise exception 'Counter cash is only available for dine-in or pickup orders'; end if;
    if p_payment_method = 'ชำระที่ร้าน' and p_delivery_type <> 'ทานที่ร้าน' then raise exception 'Pay at store is only available for dine-in orders'; end if;
    if p_delivery_type = 'ให้จัดส่ง' and p_delivery_schedule_type not in ('ทันที', 'ระบุเวลา') then raise exception 'Delivery schedule is required'; end if;
    if p_delivery_schedule_type = 'ระบุเวลา' and (p_scheduled_at is null or p_scheduled_at <= now()) then raise exception 'Scheduled delivery time must be in the future'; end if;

    if exists (
        select 1
        from jsonb_to_recordset(p_items) as requested(product_id uuid, quantity integer, note text)
        left join public.products product on product.id = requested.product_id
        where product.id is null or not product.is_active or product.status in ('หมด', 'วัตถุดิบไม่เพียงพอ')
            or requested.quantity <= 0 or product.stock_quantity < requested.quantity
    ) then
        raise exception 'One or more products are unavailable or have insufficient stock';
    end if;

    if exists (
        select 1
        from (
            select ingredient.inventory_id, sum(ingredient.quantity_required * requested.quantity) as required_quantity
            from jsonb_to_recordset(p_items) as requested(product_id uuid, quantity integer, note text)
            join public.product_ingredients ingredient on ingredient.product_id = requested.product_id
            group by ingredient.inventory_id
        ) usage
        join public.inventory stock on stock.id = usage.inventory_id
        where stock.status = 'หมดอายุ' or stock.quantity < usage.required_quantity
    ) then
        raise exception 'Ingredients are expired or insufficient';
    end if;

    select sum(product.price * requested.quantity)
    into calculated_subtotal
    from jsonb_to_recordset(p_items) as requested(product_id uuid, quantity integer, note text)
    join public.products product on product.id = requested.product_id
    where product.is_active and product.status not in ('หมด', 'วัตถุดิบไม่เพียงพอ') and requested.quantity > 0;

    if calculated_subtotal is null then raise exception 'No valid products in order'; end if;
    calculated_fee := case when p_delivery_type <> 'ให้จัดส่ง' or calculated_subtotal >= 499 then 0 else 39 end;

    if nullif(trim(p_promotion_code), '') is not null then
        select * into selected_promotion
        from public.promotions
        where upper(code) = upper(trim(p_promotion_code)) and is_active
            and (starts_at is null or starts_at <= now())
            and (ends_at is null or ends_at > now());
        if selected_promotion.id is null then raise exception 'Promotion code is invalid or expired'; end if;
        calculated_discount := least(
            case when selected_promotion.discount_type = 'fixed' then selected_promotion.discount_value else calculated_subtotal * selected_promotion.discount_value / 100 end,
            calculated_subtotal
        );
    end if;

    insert into public.orders (customer_id, customer_name, subtotal, discount_amount, promotion_id, promotion_code, delivery_fee, total_amount, payment_method, delivery_type, delivery_address, delivery_schedule_type, scheduled_at)
    select auth.uid(), profile.name, calculated_subtotal, calculated_discount, selected_promotion.id, selected_promotion.code, calculated_fee, calculated_subtotal - calculated_discount + calculated_fee, p_payment_method, p_delivery_type, p_delivery_address,
        case when p_delivery_type = 'ให้จัดส่ง' then p_delivery_schedule_type else null end,
        case when p_delivery_type = 'ให้จัดส่ง' and p_delivery_schedule_type = 'ระบุเวลา' then p_scheduled_at else null end
    from public.profiles profile where profile.id = auth.uid()
    returning id into new_order_id;

    insert into public.order_items (order_id, product_id, product_name, quantity, price_at_time, note)
    select new_order_id, product.id, product.name, requested.quantity, product.price, requested.note
    from jsonb_to_recordset(p_items) as requested(product_id uuid, quantity integer, note text)
    join public.products product on product.id = requested.product_id
    where product.is_active and product.status not in ('หมด', 'วัตถุดิบไม่เพียงพอ') and requested.quantity > 0;

    update public.products product
    set stock_quantity = product.stock_quantity - requested.quantity,
        status = case
            when product.stock_quantity - requested.quantity = 0 then 'หมด'
            when product.stock_quantity - requested.quantity <= 5 then 'เหลือน้อย'
            else product.status
        end
    from jsonb_to_recordset(p_items) as requested(product_id uuid, quantity integer, note text)
    where product.id = requested.product_id;

    update public.inventory stock
    set quantity = stock.quantity - usage.required_quantity
    from (
        select ingredient.inventory_id, sum(ingredient.quantity_required * requested.quantity) as required_quantity
        from jsonb_to_recordset(p_items) as requested(product_id uuid, quantity integer, note text)
        join public.product_ingredients ingredient on ingredient.product_id = requested.product_id
        group by ingredient.inventory_id
    ) usage
    where stock.id = usage.inventory_id;

    return new_order_id;
end;
$$;

create or replace function public.cancel_own_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
    target_order public.orders%rowtype;
begin
    select * into target_order from public.orders where id = p_order_id and customer_id = auth.uid() for update;
    if target_order.id is null then raise exception 'Order not found'; end if;
    if target_order.food_status <> 'รอยืนยัน' then raise exception 'Only pending orders can be cancelled'; end if;
    if target_order.is_paid then raise exception 'Paid orders require staff assistance for cancellation'; end if;

    update public.products product
    set stock_quantity = product.stock_quantity + item.quantity,
        status = case when product.status in ('หมด', 'เหลือน้อย') then 'มี' else product.status end
    from public.order_items item
    where item.order_id = target_order.id and product.id = item.product_id;

    update public.inventory stock
    set quantity = stock.quantity + usage.return_quantity
    from (
        select ingredient.inventory_id, sum(ingredient.quantity_required * item.quantity) as return_quantity
        from public.order_items item
        join public.product_ingredients ingredient on ingredient.product_id = item.product_id
        where item.order_id = target_order.id
        group by ingredient.inventory_id
    ) usage
    where stock.id = usage.inventory_id;

    update public.orders set food_status = 'ยกเลิก' where id = target_order.id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.promotions enable row level security;
alter table public.hero_slides enable row level security;
alter table public.inventory enable row level security;
alter table public.ingredient_categories enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.points_transactions enable row level security;
alter table public.product_ingredients enable row level security;

drop policy if exists "profiles read self or admin" on public.profiles;
create policy "profiles read self or admin" on public.profiles for select using (id = auth.uid() or public.has_role(array['admin']));
drop policy if exists "profiles update self or admin" on public.profiles;
create policy "profiles update self or admin" on public.profiles for update using (id = auth.uid() or public.has_role(array['admin'])) with check (id = auth.uid() or public.has_role(array['admin']));
drop policy if exists "profiles insert self" on public.profiles;
create policy "profiles insert self" on public.profiles for insert with check (id = auth.uid());

drop policy if exists "catalog is publicly readable" on public.categories;
create policy "catalog is publicly readable" on public.categories for select using (is_active or public.has_role(array['admin']));
drop policy if exists "admin manages categories" on public.categories;
create policy "admin manages categories" on public.categories for all using (public.has_role(array['admin'])) with check (public.has_role(array['admin']));
drop policy if exists "products are publicly readable" on public.products;
create policy "products are publicly readable" on public.products for select using (is_active or public.has_role(array['admin']));
drop policy if exists "admin manages products" on public.products;
create policy "admin manages products" on public.products for all using (public.has_role(array['admin'])) with check (public.has_role(array['admin']));
drop policy if exists "active promotions are publicly readable" on public.promotions;
create policy "active promotions are publicly readable" on public.promotions for select using (is_active or public.has_role(array['admin']));
drop policy if exists "admin manages promotions" on public.promotions;
create policy "admin manages promotions" on public.promotions for all using (public.has_role(array['admin'])) with check (public.has_role(array['admin']));
drop policy if exists "active hero slides are publicly readable" on public.hero_slides;
create policy "active hero slides are publicly readable" on public.hero_slides for select using (is_active or public.has_role(array['admin']));
drop policy if exists "admin manages hero slides" on public.hero_slides;
create policy "admin manages hero slides" on public.hero_slides for all using (public.has_role(array['admin'])) with check (public.has_role(array['admin']));
drop policy if exists "staff reads inventory" on public.inventory;
create policy "staff reads inventory" on public.inventory for select using (public.has_role(array['admin','kitchen']));
drop policy if exists "admin manages inventory" on public.inventory;
create policy "admin manages inventory" on public.inventory for all using (public.has_role(array['admin'])) with check (public.has_role(array['admin']));
drop policy if exists "kitchen manages inventory" on public.inventory;
create policy "kitchen manages inventory" on public.inventory for all using (public.has_role(array['kitchen'])) with check (public.has_role(array['kitchen']));
drop policy if exists "staff reads ingredient categories" on public.ingredient_categories;
create policy "staff reads ingredient categories" on public.ingredient_categories for select using (public.has_role(array['admin','kitchen']));
drop policy if exists "admin manages ingredient categories" on public.ingredient_categories;
create policy "admin manages ingredient categories" on public.ingredient_categories for all using (public.has_role(array['admin'])) with check (public.has_role(array['admin']));
drop policy if exists "kitchen updates product status" on public.products;
create policy "kitchen updates product status" on public.products for update using (public.has_role(array['kitchen'])) with check (public.has_role(array['kitchen']));
drop policy if exists "staff reads product ingredients" on public.product_ingredients;
create policy "staff reads product ingredients" on public.product_ingredients for select using (public.has_role(array['admin','kitchen']));
drop policy if exists "kitchen manages product ingredients" on public.product_ingredients;
create policy "kitchen manages product ingredients" on public.product_ingredients for all using (public.has_role(array['admin','kitchen'])) with check (public.has_role(array['admin','kitchen']));

drop policy if exists "users read own orders and staff read all" on public.orders;
create policy "users read own orders and staff read all" on public.orders for select using (customer_id = auth.uid() or public.has_role(array['admin','kitchen','delivery','cashier','waiter']));
drop policy if exists "staff update orders" on public.orders;
create policy "staff update orders" on public.orders for update using (public.has_role(array['admin','kitchen','delivery','cashier','waiter'])) with check (public.has_role(array['admin','kitchen','delivery','cashier','waiter']));
drop policy if exists "users read own order items and staff read all" on public.order_items;
create policy "users read own order items and staff read all" on public.order_items for select using (
    exists (select 1 from public.orders where orders.id = order_items.order_id and (orders.customer_id = auth.uid() or public.has_role(array['admin','kitchen','delivery','cashier','waiter'])))
);
drop policy if exists "users read own points and admin reads all" on public.points_transactions;
create policy "users read own points and admin reads all" on public.points_transactions for select using (user_id = auth.uid() or public.has_role(array['admin']));

revoke execute on function public.place_order(jsonb, text, text, text, text, timestamptz, text) from public, anon;
grant execute on function public.place_order(jsonb, text, text, text, text, timestamptz, text) to authenticated;
revoke execute on function public.cancel_own_order(uuid) from public, anon;
grant execute on function public.cancel_own_order(uuid) to authenticated;
grant execute on function public.has_role(text[]) to anon, authenticated;
grant select on public.categories, public.products, public.promotions, public.hero_slides to anon, authenticated;
grant select on public.profiles, public.inventory, public.orders, public.order_items, public.points_transactions to authenticated;
grant insert, update, delete on public.categories, public.products, public.promotions, public.hero_slides, public.inventory to authenticated;
grant select, insert, update, delete on public.ingredient_categories to authenticated;
grant select, insert, update, delete on public.product_ingredients to authenticated;
grant insert, update on public.profiles to authenticated;
grant update on public.orders to authenticated;

insert into public.categories (name, sort_order) values
    ('ข้าว', 1), ('เส้น', 2), ('ของทานเล่น', 3), ('ของหวาน', 4), ('เครื่องดื่ม', 5)
on conflict (name) do nothing;

insert into public.products (category_id, name, name_en, price, image_url, status, stock_quantity)
select category.id, seed.name, seed.name_en, seed.price, seed.image_url, seed.status, seed.stock_quantity
from (values
    ('ข้าว','ข้าวกะเพราไก่กรอบ','Crispy Basil Chicken Rice',119,'/assets/basil-rice.png','มี',34),
    ('เส้น','สปาเกตตีต้มยำกุ้ง','Tom Yum Prawn Spaghetti',159,'/assets/pad-thai.png','มี',18),
    ('ข้าว','ข้าวแกงเขียวหวานไก่ย่าง','Green Curry Grilled Chicken',145,'/assets/green-curry.png','เหลือน้อย',7),
    ('ของทานเล่น','ลาบไก่ควินัวโบวล์','Larb Quinoa Bowl',169,'/assets/larb.png','มี',25),
    ('ของหวาน','ชีสเค้กข้าวเหนียวมะม่วง','Mango Sticky Rice Cheesecake',109,'/assets/mango-sticky-rice.png','มี',12),
    ('เครื่องดื่ม','ชาไทยมะนาวโซดา','Thai Tea Lemon Soda',79,'/assets/lemon-tea.png','หมด',0)
) as seed(category_name,name,name_en,price,image_url,status,stock_quantity)
join public.categories category on category.name = seed.category_name
where not exists (select 1 from public.products product where product.name = seed.name);

insert into public.promotions (code, description, discount_type, discount_value)
values ('LIME20', 'ลด 20%', 'percent', 20)
on conflict (code) do nothing;

update public.promotions
set title = coalesce(title, 'สมาชิกใหม่ลดทันที'),
    image_url = coalesce(image_url, '/assets/basil-rice.png')
where code = 'LIME20';

insert into public.hero_slides (eyebrow, title, description, button_label, button_link, image_url, background_color, sort_order)
select seed.* from (values
    ('LIMELEAF CATERING', 'สดใหม่ทุกโอกาส', 'บริการจัดเลี้ยงอาหารไทยและฟิวชั่น สำหรับประชุม งานเลี้ยง และอีเวนต์', 'สั่งเลย', '/order', '/assets/hero-food.png', '#b8ff35', 1),
    ('FRESH FUSION', 'อร่อยง่าย ได้ทุกวัน', 'เมนูจานเดียว ของทานเล่น และเครื่องดื่ม ส่งตรงถึงบ้าน', 'ดูเมนู', '/order', '/assets/pad-thai.png', '#ffd43b', 2),
    ('PARTY BOX', 'ครบอร่อยในกล่องเดียว', 'เลือกเมนูได้หลายแบบ เหมาะกับทีมเล็กหรือปาร์ตี้ใหญ่', 'เลือกชุดอาหาร', '/order', '/assets/green-curry.png', '#ff9f1c', 3)
) as seed(eyebrow, title, description, button_label, button_link, image_url, background_color, sort_order)
where not exists (select 1 from public.hero_slides slide where slide.title = seed.title);

insert into public.ingredient_categories (name, name_en, slug, sort_order) values
    ('เนื้อสัตว์', 'Meat & Seafood', 'meat-seafood', 1),
    ('ผักและสมุนไพร', 'Vegetables & Herbs', 'vegetables-herbs', 2),
    ('เครื่องปรุง', 'Seasonings', 'seasonings', 3),
    ('ของแห้ง', 'Dry Goods', 'dry-goods', 4),
    ('นมและเบเกอรี', 'Dairy & Bakery', 'dairy-bakery', 5),
    ('เครื่องดื่มและผลไม้', 'Beverages & Fruit', 'beverages-fruit', 6)
on conflict (name) do nothing;

insert into public.inventory (ingredient_name, ingredient_name_en, quantity, unit, low_stock_threshold, category_id)
select seed.name, seed.name_en, seed.quantity, seed.unit, seed.low_threshold, category.id
from (values
    ('เนื้อไก่', 'Chicken', 50000::numeric, 'g', 10000::numeric, 'meat-seafood'),
    ('กุ้งสด', 'Fresh Shrimp', 10000::numeric, 'g', 2000::numeric, 'meat-seafood'),
    ('ใบกะเพรา', 'Holy Basil', 5000::numeric, 'g', 500::numeric, 'vegetables-herbs')
) as seed(name, name_en, quantity, unit, low_threshold, category_slug)
join public.ingredient_categories category on category.slug = seed.category_slug
on conflict (ingredient_name) do nothing;

insert into public.profiles (id, name, email)
select id, coalesce(raw_user_meta_data ->> 'name', split_part(email, '@', 1)), email
from auth.users
on conflict (id) do update set email = excluded.email;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('marketing', 'marketing', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "avatar images are public" on storage.objects;
create policy "avatar images are public" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "users upload own avatar" on storage.objects;
create policy "users upload own avatar" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "users update own avatar" on storage.objects;
create policy "users update own avatar" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "marketing images are public" on storage.objects;
create policy "marketing images are public" on storage.objects for select using (bucket_id = 'marketing');
drop policy if exists "admins upload marketing images" on storage.objects;
create policy "admins upload marketing images" on storage.objects for insert to authenticated with check (bucket_id = 'marketing' and public.has_role(array['admin']));
drop policy if exists "admins update marketing images" on storage.objects;
create policy "admins update marketing images" on storage.objects for update to authenticated using (bucket_id = 'marketing' and public.has_role(array['admin'])) with check (bucket_id = 'marketing' and public.has_role(array['admin']));
drop policy if exists "admins delete marketing images" on storage.objects;
create policy "admins delete marketing images" on storage.objects for delete to authenticated using (bucket_id = 'marketing' and public.has_role(array['admin']));

do $$
begin
    alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null;
end $$;

do $$
begin
    alter publication supabase_realtime add table public.products;
exception when duplicate_object then null;
end $$;

do $$
begin
    alter publication supabase_realtime add table public.categories;
exception when duplicate_object then null;
end $$;

do $$
begin
    alter publication supabase_realtime add table public.hero_slides;
exception when duplicate_object then null;
end $$;

do $$
begin
    alter publication supabase_realtime add table public.promotions;
exception when duplicate_object then null;
end $$;

do $$
begin
    alter publication supabase_realtime add table public.points_transactions;
exception when duplicate_object then null;
end $$;

commit;

-- หลังรันไฟล์นี้ ให้กำหนดผู้ใช้แอดมินครั้งแรกด้วย UUID จาก Authentication > Users:
-- update public.profiles set role = 'admin' where id = 'YOUR-USER-UUID';
