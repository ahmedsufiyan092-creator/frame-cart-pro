import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ORDER_ROLES = ["ADMIN", "ORDER_MANAGER", "CUSTOMER_SUPPORT"] as const;
const PRODUCT_ROLES = ["ADMIN", "PRODUCT_MANAGER"] as const;
const INVENTORY_ROLES = ["ADMIN", "INVENTORY_MANAGER", "PRODUCT_MANAGER"] as const;
const MARKETING_ROLES = ["ADMIN", "MARKETING"] as const;

export const getAdminSession = createServerFn({ method: "POST" }).handler(async () => {
  const { optionalUser, getRoles } = await import("./auth.server");
  const user = await optionalUser();
  if (!user) return { signedIn: false, roles: [] as string[], email: null };
  const roles = await getRoles(user.id);
  return { signedIn: true, roles, email: user.email };
});

export const getDashboard = createServerFn({ method: "POST" }).handler(async () => {
  const { db, requireRole } = await import("./auth.server");
  await requireRole([...ORDER_ROLES, "MARKETING", "INVENTORY_MANAGER", "PRODUCT_MANAGER"]);

  const [{ data: orders }, { data: lowStock }, { count: customers }, { data: pendingReviews }] =
    await Promise.all([
      db
        .from("orders")
        .select("id, order_number, status, payment_status, grand_total, created_at, contact_name")
        .order("created_at", { ascending: false })
        .limit(200),
      db
        .from("products")
        .select("id, name, slug, stock_quantity, low_stock_threshold")
        .lte("stock_quantity", 5)
        .order("stock_quantity", { ascending: true })
        .limit(20),
      db.from("profiles").select("id", { count: "exact", head: true }),
      db.from("reviews").select("id", { count: "exact" }).eq("status", "pending"),
    ]);

  const all = (orders ?? []) as any[];
  const paid = all.filter((o) => o.payment_status === "captured" || o.payment_method === "cod");
  const revenue = paid.reduce((sum, o) => sum + Number(o.grand_total), 0);
  const since = new Date(Date.now() - 30 * 864e5).toISOString();

  return {
    revenue,
    revenue30d: paid
      .filter((o) => o.created_at >= since)
      .reduce((sum, o) => sum + Number(o.grand_total), 0),
    orderCount: all.length,
    pendingFulfilment: all.filter((o) =>
      ["confirmed", "processing", "packed"].includes(o.status),
    ).length,
    customers: customers ?? 0,
    pendingReviews: (pendingReviews ?? []).length,
    recentOrders: all.slice(0, 12),
    lowStock: (lowStock ?? []) as any[],
  };
});

export const listAdminOrders = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ status: z.string().max(40).nullable().optional(), search: z.string().max(80).optional() })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { db, requireRole } = await import("./auth.server");
    await requireRole([...ORDER_ROLES]);

    let query = db
      .from("orders")
      .select(
        "id, order_number, status, payment_status, payment_method, grand_total, created_at, contact_name, contact_email, contact_phone",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) query = query.eq("status", data.status as any);
    if (data.search) query = query.ilike("order_number", `%${data.search}%`);
    const { data: rows } = await query;
    return (rows ?? []) as any[];
  });

export const getAdminOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { db, requireRole } = await import("./auth.server");
    await requireRole([...ORDER_ROLES]);
    const { data: order } = await db
      .from("orders")
      .select(
        "*, order_items(*), order_status_history(status, note, created_at), payments(*), shipments(*), refunds(*), return_requests(*)",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    return order as any;
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        status: z.enum([
          "confirmed",
          "processing",
          "packed",
          "shipped",
          "out_for_delivery",
          "delivered",
          "cancelled",
          "returned",
        ]),
        note: z.string().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { db, requireRole } = await import("./auth.server");
    const { setOrderStatus, releaseInventory, logAudit } = await import("./store.server");
    const { dispatchNotification } = await import("./notifications.server");
    const { user } = await requireRole(["ADMIN", "ORDER_MANAGER"]);

    const { data: order } = await db
      .from("orders")
      .select("id, order_number, user_id, contact_email")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Order not found.");

    await setOrderStatus(db, data.orderId, data.status, data.note, user.id);
    if (data.status === "cancelled" || data.status === "returned") {
      await releaseInventory(db, data.orderId, `Order ${data.status}`);
    }
    if (data.status === "delivered") {
      await db.from("orders").update({ delivered_at: new Date().toISOString() }).eq("id", data.orderId);
    }
    if (data.status === "shipped" || data.status === "delivered") {
      await dispatchNotification(db, {
        userId: (order as any).user_id,
        orderId: data.orderId,
        channel: "email",
        template: data.status === "shipped" ? "order_shipped" : "order_delivered",
        recipient: (order as any).contact_email,
        data: { orderNumber: (order as any).order_number },
      });
    }
    await logAudit(db, {
      actorId: user.id,
      action: `order.status.${data.status}`,
      entityType: "order",
      entityId: data.orderId,
    });
    return { ok: true };
  });

export const saveShipment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        carrier: z.string().min(2).max(60),
        trackingNumber: z.string().min(3).max(80),
        trackingUrl: z.string().url().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { db, requireRole } = await import("./auth.server");
    const { setOrderStatus } = await import("./store.server");
    const { dispatchNotification } = await import("./notifications.server");
    const { user } = await requireRole(["ADMIN", "ORDER_MANAGER"]);

    await db.from("shipments").insert({
      order_id: data.orderId,
      carrier: data.carrier,
      tracking_number: data.trackingNumber,
      tracking_url: data.trackingUrl ?? null,
      status: "shipped",
      shipped_at: new Date().toISOString(),
    });
    await setOrderStatus(db, data.orderId, "shipped", `Shipped via ${data.carrier}`, user.id);

    const { data: order } = await db
      .from("orders")
      .select("order_number, user_id, contact_email")
      .eq("id", data.orderId)
      .maybeSingle();
    if (order) {
      await dispatchNotification(db, {
        userId: (order as any).user_id,
        orderId: data.orderId,
        channel: "email",
        template: "order_shipped",
        recipient: (order as any).contact_email,
        data: { orderNumber: (order as any).order_number, trackingNumber: data.trackingNumber },
      });
    }
    return { ok: true };
  });

export const refundOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        amount: z.number().positive().optional(),
        reason: z.string().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { db, requireRole } = await import("./auth.server");
    const { logAudit } = await import("./store.server");
    const { createRazorpayRefund, razorpayKeys } = await import("./razorpay.server");
    const { markRefund } = await import("./payments.server");
    const { user } = await requireRole(["ADMIN", "ORDER_MANAGER"]);

    const { data: order } = await db
      .from("orders")
      .select("id, grand_total, payment_method, payments(provider_payment_id, status, amount)")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Order not found.");

    const captured = ((order as any).payments ?? []).find((p: any) => p.status === "captured");
    if (!captured) throw new Error("No captured online payment to refund for this order.");
    if (!razorpayKeys().configured) throw new Error("Razorpay keys are not configured.");

    const amount = data.amount ?? Number((order as any).grand_total);
    if (amount > Number((order as any).grand_total)) throw new Error("Refund exceeds order total.");

    const refund = await createRazorpayRefund({
      paymentId: captured.provider_payment_id,
      amountPaise: Math.round(amount * 100),
      notes: { reason: data.reason ?? "Admin refund", order_id: data.orderId },
      idempotencyKey: `${data.orderId}:${Math.round(amount * 100)}`,
    });

    await markRefund(db, {
      orderId: data.orderId,
      providerRefundId: refund.id,
      providerPaymentId: captured.provider_payment_id,
      amount,
      fullyRefunded: amount >= Number((order as any).grand_total),
    });
    await logAudit(db, {
      actorId: user.id,
      action: "order.refunded",
      entityType: "order",
      entityId: data.orderId,
      meta: { amount },
    });
    return { ok: true };
  });

export const listAdminProducts = createServerFn({ method: "POST" }).handler(async () => {
  const { db, requireRole } = await import("./auth.server");
  await requireRole([...PRODUCT_ROLES, "INVENTORY_MANAGER"]);
  const { data } = await db
    .from("products")
    .select("id, slug, name, base_price, compare_at_price, stock_quantity, status, badge, low_stock_threshold")
    .order("name");
  return (data ?? []) as any[];
});

export const upsertProduct = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        slug: z
          .string()
          .min(2)
          .max(80)
          .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes"),
        name: z.string().min(2).max(120),
        tagline: z.string().max(160).optional(),
        description: z.string().max(4000).optional(),
        basePrice: z.number().min(0),
        compareAtPrice: z.number().min(0).nullable().optional(),
        stockQuantity: z.number().int().min(0),
        status: z.enum(["active", "draft", "archived"]),
        badge: z.string().max(40).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { db, requireRole } = await import("./auth.server");
    const { logAudit } = await import("./store.server");
    const { user } = await requireRole([...PRODUCT_ROLES]);

    const row = {
      slug: data.slug,
      name: data.name,
      tagline: data.tagline ?? null,
      description: data.description ?? null,
      base_price: data.basePrice,
      compare_at_price: data.compareAtPrice ?? null,
      stock_quantity: data.stockQuantity,
      status: data.status,
      badge: data.badge ?? null,
    };

    if (data.id) {
      await db.from("products").update(row).eq("id", data.id);
      await logAudit(db, {
        actorId: user.id,
        action: "product.updated",
        entityType: "product",
        entityId: data.id,
      });
      return { id: data.id };
    }
    const { data: created, error } = await db
      .from("products")
      .insert(row)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    await logAudit(db, {
      actorId: user.id,
      action: "product.created",
      entityType: "product",
      entityId: (created as any)?.id,
    });
    return { id: (created as any)?.id as string };
  });

export const adjustStock = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        productId: z.string().uuid(),
        change: z.number().int(),
        reason: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { db, requireRole } = await import("./auth.server");
    const { user } = await requireRole([...INVENTORY_ROLES]);

    const { data: product } = await db
      .from("products")
      .select("stock_quantity")
      .eq("id", data.productId)
      .maybeSingle();
    if (!product) throw new Error("Product not found.");
    const next = Math.max(Number((product as any).stock_quantity) + data.change, 0);
    await db.from("products").update({ stock_quantity: next }).eq("id", data.productId);
    await db.from("inventory_movements").insert({
      product_id: data.productId,
      change: data.change,
      type: "adjustment",
      reason: data.reason ?? "Manual adjustment",
      created_by: user.id,
    });
    return { stockQuantity: next };
  });

export const listCoupons = createServerFn({ method: "POST" }).handler(async () => {
  const { db, requireRole } = await import("./auth.server");
  await requireRole([...MARKETING_ROLES]);
  const { data } = await db.from("coupons").select("*").order("created_at", { ascending: false });
  return (data ?? []) as any[];
});

export const upsertCoupon = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        code: z.string().min(3).max(40),
        description: z.string().max(200).optional(),
        discountType: z.enum(["percentage", "fixed"]),
        discountValue: z.number().positive(),
        maxDiscount: z.number().positive().nullable().optional(),
        minOrderValue: z.number().min(0),
        usageLimit: z.number().int().positive().nullable().optional(),
        perUserLimit: z.number().int().positive(),
        isActive: z.boolean(),
        expiresAt: z.string().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { db, requireRole } = await import("./auth.server");
    await requireRole([...MARKETING_ROLES]);
    await db.from("coupons").upsert(
      {
        code: data.code.toUpperCase(),
        description: data.description ?? null,
        discount_type: data.discountType,
        discount_value: data.discountValue,
        max_discount: data.maxDiscount ?? null,
        min_order_value: data.minOrderValue,
        usage_limit: data.usageLimit ?? null,
        per_user_limit: data.perUserLimit,
        is_active: data.isActive,
        expires_at: data.expiresAt ?? null,
      },
      { onConflict: "code" },
    );
    return { ok: true };
  });

export const listPendingReviews = createServerFn({ method: "POST" }).handler(async () => {
  const { db, requireRole } = await import("./auth.server");
  await requireRole(["ADMIN", "CUSTOMER_SUPPORT", "MARKETING"]);
  const { data } = await db
    .from("reviews")
    .select("id, rating, title, body, author_name, created_at, status, products(name, slug)")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as any[];
});

export const moderateReview = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ reviewId: z.string().uuid(), status: z.enum(["approved", "rejected"]) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { db, requireRole } = await import("./auth.server");
    const { user } = await requireRole(["ADMIN", "CUSTOMER_SUPPORT", "MARKETING"]);
    await db
      .from("reviews")
      .update({ status: data.status, moderated_by: user.id, moderated_at: new Date().toISOString() })
      .eq("id", data.reviewId);
    return { ok: true };
  });

export const getIntegrationStatus = createServerFn({ method: "POST" }).handler(async () => {
  const { requireRole } = await import("./auth.server");
  const { providerStatuses } = await import("./notifications.server");
  const { razorpayKeys, webhookSecret } = await import("./razorpay.server");
  await requireRole(["ADMIN"]);
  return {
    razorpay: {
      keysConfigured: razorpayKeys().configured,
      webhookConfigured: Boolean(webhookSecret()),
    },
    notifications: providerStatuses(),
  };
});

export const listAuditLogs = createServerFn({ method: "POST" }).handler(async () => {
  const { db, requireRole } = await import("./auth.server");
  await requireRole(["ADMIN"]);
  const { data } = await db
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as any[];
});
