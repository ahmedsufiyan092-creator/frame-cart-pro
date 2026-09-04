-- ORDERS
ALTER TABLE public.orders RENAME COLUMN guest_email TO contact_email;
ALTER TABLE public.orders RENAME COLUMN guest_phone TO contact_phone;
ALTER TABLE public.orders RENAME COLUMN placed_at TO created_at;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS guest_token uuid,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
CREATE INDEX IF NOT EXISTS orders_guest_token_idx ON public.orders(guest_token);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at DESC);

-- ORDER ITEMS
ALTER TABLE public.order_items
  ALTER COLUMN product_snapshot DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS product_slug text,
  ADD COLUMN IF NOT EXISTS product_image text;

-- PAYMENTS
ALTER TABLE public.payments RENAME COLUMN razorpay_order_id TO provider_order_id;
ALTER TABLE public.payments RENAME COLUMN razorpay_payment_id TO provider_payment_id;
ALTER TABLE public.payments RENAME COLUMN razorpay_signature TO provider_signature;

-- PAYMENT EVENTS
ALTER TABLE public.payment_events RENAME COLUMN razorpay_order_id TO provider_order_id;
ALTER TABLE public.payment_events RENAME COLUMN razorpay_payment_id TO provider_payment_id;
ALTER TABLE public.payment_events
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL;

-- REFUNDS
ALTER TABLE public.refunds RENAME COLUMN razorpay_refund_id TO provider_refund_id;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS provider_payment_id text;

-- COUPON REDEMPTIONS
ALTER TABLE public.coupon_redemptions ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0;

-- SHIPMENTS
ALTER TABLE public.shipments RENAME COLUMN courier_partner TO carrier;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS tracking_url text;

-- PRODUCTS
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS badge text;

-- REVIEWS
ALTER TABLE public.reviews RENAME COLUMN comment TO body;
ALTER TABLE public.reviews RENAME COLUMN is_verified TO is_verified_purchase;
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS moderated_by uuid,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz;
DELETE FROM public.reviews a USING public.reviews b
  WHERE a.ctid < b.ctid AND a.product_id = b.product_id AND a.user_id = b.user_id AND a.user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reviews_product_user_key ON public.reviews(product_id, user_id) WHERE user_id IS NOT NULL;

-- FRAME OPTIONS
ALTER TABLE public.frame_options RENAME COLUMN color_code TO swatch;