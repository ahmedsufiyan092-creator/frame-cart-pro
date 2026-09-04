/**
 * Server-only store helpers: authoritative pricing, cart resolution,
 * inventory movement and audit logging. Never import from client code.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type Db = SupabaseClient<any, "public", any>;

export interface PricedLine {
  cartItemId: string;
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  sizeId: string;
  sizeLabel: string;
  frameId: string;
  frameName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  stockQuantity: number;
  inStock: boolean;
}

export interface PricedCart {
  cartId: string;
  lines: PricedLine[];
  itemCount: number;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  couponCode: string | null;
  couponMessage: string | null;
  freeShippingThreshold: number;
  amountToFreeShipping: number;
}

export async function getSettings(db: Db) {
  const { data } = await db.from("store_settings").select("key, value");
  const map = new Map((data ?? []).map((r: any) => [r.key, r.value]));
  const shipping = (map.get("shipping") as any) ?? {};
  const tax = (map.get("tax") as any) ?? {};
  return {
    freeShippingThreshold: Number(shipping.free_shipping_threshold ?? 1499),
    flatRate: Number(shipping.flat_rate ?? 99),
    codFee: Number(shipping.cod_fee ?? 49),
    taxEnabled: Boolean(tax.enabled ?? false),
    taxRate: Number(tax.rate ?? 0),
  };
}

/** Authoritative unit price. Browser-supplied prices are always ignored. */
export function unitPriceFor(
  basePrice: number,
  sizeModifier: number,
  frameModifier: number,
  variantOverride?: number | null,
): number {
  if (variantOverride != null) return Number(variantOverride);
  return Number(basePrice) + Number(sizeModifier) + Number(frameModifier);
}

export async function priceCart(
  db: Db,
  cartId: string,
  opts: { couponCode?: string | null; userId?: string | null; paymentMethod?: string | null } = {},
): Promise<PricedCart> {
  const settings = await getSettings(db);

  const { data: items } = await db
    .from("cart_items")
    .select(
      "id, quantity, size_id, frame_id, product_id, products(id, slug, name, base_price, stock_quantity, status), size_options(label, price_modifier), frame_options(name, price_modifier)",
    )
    .eq("cart_id", cartId)
    .order("created_at", { ascending: true });

  const productIds = (items ?? []).map((i: any) => i.product_id);
  const imageMap = new Map<string, string>();
  if (productIds.length) {
    const { data: imgs } = await db
      .from("product_images")
      .select("product_id, url, sort_order")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true });
    for (const img of imgs ?? []) {
      if (!imageMap.has(img.product_id)) imageMap.set(img.product_id, img.url);
    }
  }

  const variantMap = new Map<string, { stock: number; price: number | null }>();
  if (productIds.length) {
    const { data: variants } = await db
      .from("product_variants")
      .select("product_id, size_id, frame_id, stock_quantity, price_override")
      .in("product_id", productIds);
    for (const v of variants ?? []) {
      variantMap.set(`${v.product_id}:${v.size_id}:${v.frame_id}`, {
        stock: v.stock_quantity,
        price: v.price_override,
      });
    }
  }

  const lines: PricedLine[] = [];
  for (const item of (items ?? []) as any[]) {
    const product = item.products;
    if (!product || product.status !== "active") continue;
    const variant = variantMap.get(`${item.product_id}:${item.size_id}:${item.frame_id}`);
    const unitPrice = unitPriceFor(
      product.base_price,
      item.size_options?.price_modifier ?? 0,
      item.frame_options?.price_modifier ?? 0,
      variant?.price ?? null,
    );
    const stockQuantity = variant?.stock ?? product.stock_quantity ?? 0;
    lines.push({
      cartItemId: item.id,
      productId: item.product_id,
      slug: product.slug,
      name: product.name,
      image: imageMap.get(item.product_id) ?? null,
      sizeId: item.size_id,
      sizeLabel: item.size_options?.label ?? item.size_id,
      frameId: item.frame_id,
      frameName: item.frame_options?.name ?? item.frame_id,
      unitPrice,
      quantity: item.quantity,
      lineTotal: unitPrice * item.quantity,
      stockQuantity,
      inStock: stockQuantity >= item.quantity,
    });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);

  let discount = 0;
  let couponCode: string | null = null;
  let couponMessage: string | null = null;
  const code = (opts.couponCode ?? "").trim().toUpperCase();
  if (code) {
    const { data: coupon } = await db.from("coupons").select("*").eq("code", code).maybeSingle();
    if (!coupon || !coupon.is_active) {
      couponMessage = "This coupon code is not valid.";
    } else if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      couponMessage = "This coupon has expired.";
    } else if (subtotal < Number(coupon.min_order_value)) {
      couponMessage = `Add items worth ₹${Math.ceil(Number(coupon.min_order_value) - subtotal)} more to use ${code}.`;
    } else if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit) {
      couponMessage = "This coupon has reached its usage limit.";
    } else {
      let perUserOk = true;
      if (opts.userId) {
        const { count } = await db
          .from("coupon_redemptions")
          .select("id", { count: "exact", head: true })
          .eq("code", code)
          .eq("user_id", opts.userId);
        perUserOk = (count ?? 0) < coupon.per_user_limit;
      }
      if (!perUserOk) {
        couponMessage = "You have already used this coupon.";
      } else {
        discount =
          coupon.discount_type === "percentage"
            ? (subtotal * Number(coupon.discount_value)) / 100
            : Number(coupon.discount_value);
        if (coupon.max_discount != null) discount = Math.min(discount, Number(coupon.max_discount));
        discount = Math.min(discount, subtotal);
        couponCode = code;
        couponMessage = coupon.description ?? `${code} applied.`;
      }
    }
  }

  const afterDiscount = Math.max(subtotal - discount, 0);
  let shipping =
    lines.length === 0 || afterDiscount >= settings.freeShippingThreshold ? 0 : settings.flatRate;
  if (opts.paymentMethod === "cod") shipping += settings.codFee;

  const tax = settings.taxEnabled ? (afterDiscount * settings.taxRate) / 100 : 0;
  const total = Math.round(afterDiscount + shipping + tax);

  return {
    cartId,
    lines,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: Math.round(subtotal),
    discount: Math.round(discount),
    shipping: Math.round(shipping),
    tax: Math.round(tax),
    total,
    couponCode,
    couponMessage,
    freeShippingThreshold: settings.freeShippingThreshold,
    amountToFreeShipping: Math.max(settings.freeShippingThreshold - afterDiscount, 0),
  };
}

export function emptyCart(cartId = ""): PricedCart {
  return {
    cartId,
    lines: [],
    itemCount: 0,
    subtotal: 0,
    discount: 0,
    shipping: 0,
    tax: 0,
    total: 0,
    couponCode: null,
    couponMessage: null,
    freeShippingThreshold: 1499,
    amountToFreeShipping: 1499,
  };
}

export function makeOrderNumber(): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `FC-${stamp}-${rand}`;
}

export async function logAudit(
  db: Db,
  entry: {
    actorId?: string | null;
    actorEmail?: string | null;
    action: string;
    entityType?: string;
    entityId?: string;
    meta?: Record<string, unknown>;
  },
) {
  await db.from("audit_logs").insert({
    actor_id: entry.actorId ?? null,
    actor_email: entry.actorEmail ?? null,
    action: entry.action,
    entity_type: entry.entityType ?? null,
    entity_id: entry.entityId ?? null,
    meta: entry.meta ?? {},
  });
}

/** Reserve stock for an order. Idempotent via orders.inventory_reserved. */
export async function reserveInventory(db: Db, orderId: string) {
  const { data: order } = await db
    .from("orders")
    .select("id, inventory_reserved")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.inventory_reserved) return;

  const { data: items } = await db
    .from("order_items")
    .select("product_id, size_id, frame_id, quantity")
    .eq("order_id", orderId);

  for (const item of items ?? []) {
    if (!item.product_id) continue;
    const { data: variant } = await db
      .from("product_variants")
      .select("id, stock_quantity")
      .eq("product_id", item.product_id)
      .eq("size_id", item.size_id)
      .eq("frame_id", item.frame_id)
      .maybeSingle();
    if (variant) {
      await db
        .from("product_variants")
        .update({ stock_quantity: Math.max(variant.stock_quantity - item.quantity, 0) })
        .eq("id", variant.id);
    }
    const { data: product } = await db
      .from("products")
      .select("stock_quantity")
      .eq("id", item.product_id)
      .maybeSingle();
    if (product) {
      await db
        .from("products")
        .update({ stock_quantity: Math.max(product.stock_quantity - item.quantity, 0) })
        .eq("id", item.product_id);
    }
    await db.from("inventory_movements").insert({
      product_id: item.product_id,
      variant_id: variant?.id ?? null,
      order_id: orderId,
      change: -item.quantity,
      type: "reservation",
      reason: "Order confirmed",
    });
  }

  await db.from("orders").update({ inventory_reserved: true }).eq("id", orderId);
}

/** Return stock to the shelf (cancellation / refund). */
export async function releaseInventory(db: Db, orderId: string, reason: string) {
  const { data: order } = await db
    .from("orders")
    .select("id, inventory_reserved")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || !order.inventory_reserved) return;

  const { data: items } = await db
    .from("order_items")
    .select("product_id, size_id, frame_id, quantity")
    .eq("order_id", orderId);

  for (const item of items ?? []) {
    if (!item.product_id) continue;
    const { data: variant } = await db
      .from("product_variants")
      .select("id, stock_quantity")
      .eq("product_id", item.product_id)
      .eq("size_id", item.size_id)
      .eq("frame_id", item.frame_id)
      .maybeSingle();
    if (variant) {
      await db
        .from("product_variants")
        .update({ stock_quantity: variant.stock_quantity + item.quantity })
        .eq("id", variant.id);
    }
    const { data: product } = await db
      .from("products")
      .select("stock_quantity")
      .eq("id", item.product_id)
      .maybeSingle();
    if (product) {
      await db
        .from("products")
        .update({ stock_quantity: product.stock_quantity + item.quantity })
        .eq("id", item.product_id);
    }
    await db.from("inventory_movements").insert({
      product_id: item.product_id,
      variant_id: variant?.id ?? null,
      order_id: orderId,
      change: item.quantity,
      type: "release",
      reason,
    });
  }

  await db.from("orders").update({ inventory_reserved: false }).eq("id", orderId);
}

export async function setOrderStatus(
  db: Db,
  orderId: string,
  status: string,
  note?: string,
  changedBy?: string | null,
) {
  await db
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId);
  await db.from("order_status_history").insert({
    order_id: orderId,
    status,
    note: note ?? null,
    changed_by: changedBy ?? null,
  });
}

/** Queue a notification row. Real delivery happens once providers are configured. */
export async function queueNotification(
  db: Db,
  payload: {
    userId?: string | null;
    orderId?: string | null;
    channel: "email" | "whatsapp" | "sms";
    template: string;
    recipient?: string | null;
    data?: Record<string, unknown>;
  },
) {
  await db.from("notifications").insert({
    user_id: payload.userId ?? null,
    order_id: payload.orderId ?? null,
    channel: payload.channel,
    template: payload.template,
    recipient: payload.recipient ?? null,
    payload: payload.data ?? {},
    status: "queued",
  });
}
