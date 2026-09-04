import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const contactSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(8).max(20),
  fullName: z.string().min(2).max(80),
});

const shippingSchema = z.object({
  line1: z.string().min(3).max(160),
  line2: z.string().max(160).optional().default(""),
  city: z.string().min(2).max(80),
  state: z.string().min(2).max(80),
  pincode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit PIN code"),
  country: z.string().max(60).default("India"),
});

/**
 * Creates an order from the server-side priced cart.
 * Prices, discounts, shipping and totals are recomputed here; anything the
 * browser sends about money is ignored.
 */
export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        guestToken: z.string().uuid().nullable().optional(),
        couponCode: z.string().max(40).nullable().optional(),
        paymentMethod: z.enum(["razorpay", "cod"]),
        contact: contactSchema,
        shipping: shippingSchema,
        notes: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { db, optionalUser } = await import("./auth.server");
    const {
      priceCart,
      makeOrderNumber,
      reserveInventory,
      setOrderStatus,
      logAudit,
    } = await import("./store.server");
    const { dispatchNotification } = await import("./notifications.server");

    const user = await optionalUser();

    let cartId: string | null = null;
    if (user) {
      const { data: cart } = await db
        .from("carts")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      cartId = (cart as any)?.id ?? null;
    } else if (data.guestToken) {
      const { data: cart } = await db
        .from("carts")
        .select("id")
        .eq("guest_token", data.guestToken)
        .maybeSingle();
      cartId = (cart as any)?.id ?? null;
    }
    if (!cartId) throw new Error("Your cart is empty.");

    const priced = await priceCart(db, cartId, {
      couponCode: data.couponCode ?? null,
      userId: user?.id ?? null,
      paymentMethod: data.paymentMethod,
    });
    if (priced.lines.length === 0) throw new Error("Your cart is empty.");

    const outOfStock = priced.lines.filter((l) => !l.inStock);
    if (outOfStock.length) {
      throw new Error(
        `Out of stock: ${outOfStock.map((l) => `${l.name} (${l.sizeLabel})`).join(", ")}`,
      );
    }

    const orderNumber = makeOrderNumber();
    const { data: order, error } = await db
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: user?.id ?? null,
        guest_token: user ? null : (data.guestToken ?? null),
        status: "payment_pending",
        payment_method: data.paymentMethod,
        payment_status: "created",
        contact_email: data.contact.email,
        contact_phone: data.contact.phone,
        contact_name: data.contact.fullName,
        shipping_address: { ...data.shipping, full_name: data.contact.fullName, phone: data.contact.phone },
        subtotal: priced.subtotal,
        discount_total: priced.discount,
        shipping_total: priced.shipping,
        tax_total: priced.tax,
        grand_total: priced.total,
        coupon_code: priced.couponCode,
        notes: data.notes ?? null,
      })
      .select("id, order_number, grand_total")
      .maybeSingle();

    if (error || !order) throw new Error(error?.message ?? "Could not create your order.");
    const orderId = (order as any).id as string;

    // Historical snapshot of every line — later price changes never rewrite history.
    await db.from("order_items").insert(
      priced.lines.map((l) => ({
        order_id: orderId,
        product_id: l.productId,
        product_name: l.name,
        product_slug: l.slug,
        product_image: l.image,
        size_id: l.sizeId,
        size_label: l.sizeLabel,
        frame_id: l.frameId,
        frame_name: l.frameName,
        unit_price: l.unitPrice,
        quantity: l.quantity,
        line_total: l.lineTotal,
      })),
    );

    await db.from("order_status_history").insert({
      order_id: orderId,
      status: "payment_pending",
      note: "Order created",
    });

    if (data.paymentMethod === "cod") {
      await setOrderStatus(db, orderId, "confirmed", "Cash on delivery order confirmed");
      await db.from("orders").update({ payment_status: "created" }).eq("id", orderId);
      await reserveInventory(db, orderId);
      await db.from("cart_items").delete().eq("cart_id", cartId);
      if (priced.couponCode) {
        await db.from("coupon_redemptions").insert({
          code: priced.couponCode,
          user_id: user?.id ?? null,
          order_id: orderId,
          discount_amount: priced.discount,
        });
      }
      await dispatchNotification(db, {
        userId: user?.id ?? null,
        orderId,
        channel: "email",
        template: "order_confirmed",
        recipient: data.contact.email,
        data: { orderNumber, total: priced.total },
      });
      await logAudit(db, {
        actorId: user?.id ?? null,
        action: "order.placed.cod",
        entityType: "order",
        entityId: orderId,
      });
    }

    return {
      orderId,
      orderNumber,
      amount: priced.total,
      paymentMethod: data.paymentMethod,
    };
  });

export const getMyOrders = createServerFn({ method: "POST" }).handler(async () => {
  const { db, requireUser } = await import("./auth.server");
  const user = await requireUser();
  const { data } = await db
    .from("orders")
    .select(
      "id, order_number, status, payment_status, payment_method, grand_total, created_at, order_items(id, product_name, product_image, size_label, frame_name, quantity, unit_price)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (data ?? []) as any[];
});

/** Order detail scoped by owner (or guest token) — no id-guessing access. */
export const getOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        guestToken: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { db, optionalUser } = await import("./auth.server");
    const user = await optionalUser();

    const { data: order } = await db
      .from("orders")
      .select(
        "*, order_items(*), order_status_history(status, note, created_at), payments(provider_payment_id, status, amount, method, created_at), shipments(carrier, tracking_number, status, shipped_at, delivered_at), refunds(amount, status, created_at)",
      )
      .eq("id", data.orderId)
      .maybeSingle();

    if (!order) return null;
    const o = order as any;
    const owns = user ? o.user_id === user.id : Boolean(data.guestToken && o.guest_token === data.guestToken);
    if (!owns) return null;
    return o;
  });

export const cancelOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ orderId: z.string().uuid(), reason: z.string().max(300).optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { db, requireUser } = await import("./auth.server");
    const { setOrderStatus, releaseInventory, logAudit } = await import("./store.server");
    const user = await requireUser();

    const { data: order } = await db
      .from("orders")
      .select("id, user_id, status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order || (order as any).user_id !== user.id) throw new Error("Order not found.");

    const cancellable = ["payment_pending", "confirmed", "processing"];
    if (!cancellable.includes((order as any).status))
      throw new Error("This order can no longer be cancelled. Please request a return instead.");

    await setOrderStatus(db, data.orderId, "cancelled", data.reason ?? "Cancelled by customer", user.id);
    await releaseInventory(db, data.orderId, "Order cancelled");
    await logAudit(db, {
      actorId: user.id,
      action: "order.cancelled",
      entityType: "order",
      entityId: data.orderId,
    });
    return { ok: true };
  });

export const requestReturn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        reason: z.string().min(5).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { db, requireUser } = await import("./auth.server");
    const { setOrderStatus } = await import("./store.server");
    const user = await requireUser();

    const { data: order } = await db
      .from("orders")
      .select("id, user_id, status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order || (order as any).user_id !== user.id) throw new Error("Order not found.");
    if ((order as any).status !== "delivered")
      throw new Error("Returns can be requested only after delivery.");

    await db.from("return_requests").insert({
      order_id: data.orderId,
      user_id: user.id,
      reason: data.reason,
      status: "requested",
    });
    await setOrderStatus(db, data.orderId, "return_requested", data.reason, user.id);
    return { ok: true };
  });
