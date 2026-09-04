-- ==========================================================
-- FRAME CART :: core commerce schema
-- ==========================================================

create type public.app_role as enum (
  'SUPER_ADMIN','ADMIN','ORDER_MANAGER','PRODUCT_MANAGER',
  'INVENTORY_MANAGER','CUSTOMER_SUPPORT','MARKETING'
);

create type public.order_status as enum (
  'payment_pending','confirmed','processing','packed','shipped',
  'out_for_delivery','delivered','cancelled','return_requested','returned','refunded'
);

create type public.payment_status as enum (
  'created','authorized','captured','failed','refunded','partially_refunded'
);

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          new.email,
          coalesce(new.raw_user_meta_data->>'phone', ''))
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- roles ----------
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id);
$$;

create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "staff read roles" on public.user_roles for select to authenticated using (public.is_staff(auth.uid()));

-- ---------- catalog ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.categories to anon, authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "public read categories" on public.categories for select to anon, authenticated using (is_active);

create table public.size_options (
  id text primary key,
  label text not null,
  dimensions text not null,
  price_modifier numeric(10,2) not null default 0,
  sort_order int not null default 0,
  is_active boolean not null default true
);
grant select on public.size_options to anon, authenticated;
grant all on public.size_options to service_role;
alter table public.size_options enable row level security;
create policy "public read sizes" on public.size_options for select to anon, authenticated using (is_active);

create table public.frame_options (
  id text primary key,
  name text not null,
  color_code text not null,
  price_modifier numeric(10,2) not null default 0,
  sort_order int not null default 0,
  is_active boolean not null default true
);
grant select on public.frame_options to anon, authenticated;
grant all on public.frame_options to service_role;
alter table public.frame_options enable row level security;
create policy "public read frames" on public.frame_options for select to anon, authenticated using (is_active);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  tagline text,
  description text not null default '',
  base_price numeric(10,2) not null check (base_price >= 0),
  compare_at_price numeric(10,2),
  sku text unique,
  status text not null default 'active',
  orientation text not null default 'portrait',
  theme text,
  style text,
  color_palette jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  materials text,
  paper_gsm text,
  frame_material text,
  care_instructions text,
  shipping_time text,
  rating numeric(3,2) not null default 5,
  review_count int not null default 0,
  stock_quantity int not null default 0,
  low_stock_threshold int not null default 5,
  is_featured boolean not null default false,
  is_best_seller boolean not null default false,
  is_new_arrival boolean not null default false,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "public read products" on public.products for select to anon, authenticated using (status = 'active');
create index products_status_idx on public.products (status);
create index products_created_idx on public.products (created_at desc);

create table public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (product_id, category_id)
);
grant select on public.product_categories to anon, authenticated;
grant all on public.product_categories to service_role;
alter table public.product_categories enable row level security;
create policy "public read product categories" on public.product_categories for select to anon, authenticated using (true);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  kind text not null default 'gallery',
  sort_order int not null default 0
);
grant select on public.product_images to anon, authenticated;
grant all on public.product_images to service_role;
alter table public.product_images enable row level security;
create policy "public read product images" on public.product_images for select to anon, authenticated using (true);
create index product_images_product_idx on public.product_images (product_id);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size_id text not null references public.size_options(id),
  frame_id text not null references public.frame_options(id),
  sku text unique,
  price_override numeric(10,2),
  stock_quantity int not null default 0,
  is_active boolean not null default true,
  unique (product_id, size_id, frame_id)
);
grant select on public.product_variants to anon, authenticated;
grant all on public.product_variants to service_role;
alter table public.product_variants enable row level security;
create policy "public read variants" on public.product_variants for select to anon, authenticated using (is_active);

-- ---------- addresses ----------
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  mobile_number text not null,
  email text,
  house_no text not null,
  street text not null,
  area text,
  landmark text,
  city text not null,
  state text not null,
  pin_code text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.addresses to authenticated;
grant all on public.addresses to service_role;
alter table public.addresses enable row level security;
create policy "own addresses" on public.addresses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create index addresses_user_idx on public.addresses (user_id);

-- ---------- carts ----------
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  guest_token text unique,
  coupon_code text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant all on public.carts to service_role;
grant select on public.carts to authenticated;
alter table public.carts enable row level security;
create policy "own cart read" on public.carts for select to authenticated using (user_id = auth.uid());
create index carts_user_idx on public.carts (user_id);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  size_id text not null references public.size_options(id),
  frame_id text not null references public.frame_options(id),
  quantity int not null default 1 check (quantity > 0 and quantity <= 20),
  created_at timestamptz not null default now(),
  unique (cart_id, product_id, size_id, frame_id)
);
grant all on public.cart_items to service_role;
grant select on public.cart_items to authenticated;
alter table public.cart_items enable row level security;
create policy "own cart items read" on public.cart_items for select to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));
create index cart_items_cart_idx on public.cart_items (cart_id);

-- ---------- coupons ----------
create table public.coupons (
  code text primary key,
  discount_type text not null check (discount_type in ('percentage','flat')),
  discount_value numeric(10,2) not null check (discount_value >= 0),
  min_order_value numeric(10,2) not null default 0,
  max_discount numeric(10,2),
  description text,
  usage_limit int,
  used_count int not null default 0,
  per_user_limit int not null default 1,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
grant all on public.coupons to service_role;
alter table public.coupons enable row level security;

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  code text not null references public.coupons(code) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid,
  created_at timestamptz not null default now()
);
grant all on public.coupon_redemptions to service_role;
alter table public.coupon_redemptions enable row level security;

-- ---------- orders ----------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  guest_email text,
  guest_phone text,
  status public.order_status not null default 'payment_pending',
  payment_status public.payment_status not null default 'created',
  payment_method text,
  subtotal numeric(10,2) not null default 0,
  discount_total numeric(10,2) not null default 0,
  shipping_total numeric(10,2) not null default 0,
  tax_total numeric(10,2) not null default 0,
  grand_total numeric(10,2) not null default 0,
  currency text not null default 'INR',
  coupon_code text,
  shipping_address jsonb not null,
  customer_snapshot jsonb not null default '{}'::jsonb,
  notes text,
  tracking_number text,
  courier_partner text,
  inventory_reserved boolean not null default false,
  inventory_finalized boolean not null default false,
  cancelled_reason text,
  placed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "own orders read" on public.orders for select to authenticated using (user_id = auth.uid());
create index orders_user_idx on public.orders (user_id);
create index orders_status_idx on public.orders (status);
create index orders_placed_idx on public.orders (placed_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_snapshot jsonb not null,
  size_id text,
  frame_id text,
  size_label text,
  frame_name text,
  unit_price numeric(10,2) not null,
  quantity int not null check (quantity > 0),
  line_total numeric(10,2) not null
);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "own order items read" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create index order_items_order_idx on public.order_items (order_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  note text,
  changed_by uuid,
  created_at timestamptz not null default now()
);
grant select on public.order_status_history to authenticated;
grant all on public.order_status_history to service_role;
alter table public.order_status_history enable row level security;
create policy "own order history read" on public.order_status_history for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- ---------- payments ----------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'razorpay',
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  razorpay_signature text,
  amount numeric(10,2) not null,
  currency text not null default 'INR',
  status public.payment_status not null default 'created',
  method text,
  error_code text,
  error_description text,
  amount_refunded numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "own payments read" on public.payments for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create index payments_order_idx on public.payments (order_id);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  event_id text unique,
  event_type text not null,
  razorpay_order_id text,
  razorpay_payment_id text,
  payload jsonb not null default '{}'::jsonb,
  processed boolean not null default false,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);
grant all on public.payment_events to service_role;
alter table public.payment_events enable row level security;

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  razorpay_refund_id text unique,
  amount numeric(10,2) not null,
  reason text,
  status text not null default 'pending',
  requested_by uuid,
  created_at timestamptz not null default now()
);
grant select on public.refunds to authenticated;
grant all on public.refunds to service_role;
alter table public.refunds enable row level security;
create policy "own refunds read" on public.refunds for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- ---------- inventory ----------
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  change int not null,
  type text not null,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now()
);
grant all on public.inventory_movements to service_role;
alter table public.inventory_movements enable row level security;

-- ---------- wishlist / reviews ----------
create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
grant select, insert, delete on public.wishlist_items to authenticated;
grant all on public.wishlist_items to service_role;
alter table public.wishlist_items enable row level security;
create policy "own wishlist" on public.wishlist_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  title text,
  comment text not null,
  is_verified boolean not null default false,
  status text not null default 'approved',
  helpful_count int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.reviews to authenticated;
grant select on public.reviews to anon;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "public read approved reviews" on public.reviews for select to anon, authenticated using (status = 'approved');
create policy "own reviews manage" on public.reviews for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create index reviews_product_idx on public.reviews (product_id);

-- ---------- shipments / returns / invoices ----------
create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  courier_partner text,
  tracking_number text,
  status text not null default 'created',
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.shipments to authenticated;
grant all on public.shipments to service_role;
alter table public.shipments enable row level security;
create policy "own shipments read" on public.shipments for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

create table public.return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'requested',
  refund_amount numeric(10,2),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert on public.return_requests to authenticated;
grant all on public.return_requests to service_role;
alter table public.return_requests enable row level security;
create policy "own returns read" on public.return_requests for select to authenticated using (user_id = auth.uid());
create policy "own returns create" on public.return_requests for insert to authenticated with check (user_id = auth.uid());

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade unique,
  invoice_number text not null unique,
  amount numeric(10,2) not null,
  issued_at timestamptz not null default now(),
  pdf_url text
);
grant select on public.invoices to authenticated;
grant all on public.invoices to service_role;
alter table public.invoices enable row level security;
create policy "own invoices read" on public.invoices for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- ---------- notifications / audit / settings ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  channel text not null,
  template text not null,
  recipient text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  provider_message_id text,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
grant select on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notifications read" on public.notifications for select to authenticated using (user_id = auth.uid());

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text not null,
  entity_type text,
  entity_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create index audit_logs_created_idx on public.audit_logs (created_at desc);

create table public.store_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
grant select on public.store_settings to anon, authenticated;
grant all on public.store_settings to service_role;
alter table public.store_settings enable row level security;
create policy "public read settings" on public.store_settings for select to anon, authenticated using (key in ('shipping','storefront'));

insert into public.store_settings (key, value) values
  ('shipping', '{"free_shipping_threshold": 1499, "flat_rate": 99, "cod_fee": 49}'::jsonb),
  ('tax', '{"enabled": false, "rate": 0}'::jsonb),
  ('storefront', '{"brand":"FRAME CART","currency":"INR","support_email":"","support_phone":""}'::jsonb);