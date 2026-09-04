/**
 * Shared payment state machine. Payment state and order state are tracked
 * separately: `payments.status` reflects the gateway, `orders.status` the
 * fulfilment lifecycle.
 */
import type { Db } from "./store.server";
import { reserveInventory, setOrderStatus, releaseInventory, logAudit } from "./store.server";
import { dispatchNotification } from "./notifications.server";

export async function recordPaymentEvent(
  db: Db,
  input: {
    paymentId?: string | null;
    orderId?: string | null;
    eventId?: string | null;
    eventType: string;
    payload: unknown;
  },
) {
  // Idempotency: the same gateway event is never processed twice.
  if (input.eventId) {
    const { data: existing } = await db
      .from("payment_events")
      .select("id")
      .eq("event_id", input.eventId)
      .maybeSingle();
    if (existing) return { duplicate: true };
  }
  await db.from("payment_events").insert({
    payment_id: input.paymentId ?? null,
    order_id: input.orderId ?? null,
    event_id: input.eventId ?? null,
    event_type: input.eventType,
    payload: input.payload as any,
  });
  return { duplicate: false };
}

export async function markPaymentCaptured(
  db: Db,
  args: {
    orderId: string;
    providerPaymentId: string;
    providerOrderId: string;
    amount: number;
    method?: string | null;
  },
) {
  const { data: order } = await db
    .from("orders")
    .select("id, order_number, status, payment_status, user_id, contact_email, contact_phone, coupon_code, discount_total, grand_total")
    .eq("id", args.orderId)
    .maybeSingle();
  if (!order) return;
  const o = order as any;
  if (o.payment_status === "captured") return; // already settled

  const { data: existingPayment } = await db
    .from("payments")
    .select("id")
    .eq("provider_payment_id", args.providerPaymentId)
    .maybeSingle();

  if (existingPayment) {
    await db
      .from("payments")
      .update({ status: "captured", amount: args.amount, method: args.method ?? null })
      .eq("id", (existingPayment as any).id);
  } else {
    await db.from("payments").insert({
      order_id: args.orderId,
      provider: "razorpay",
      provider_order_id: args.providerOrderId,
      provider_payment_id: args.providerPaymentId,
      status: "captured",
      amount: args.amount,
      currency: "INR",
      method: args.method ?? null,
    });
  }

  await db
    .from("orders")
    .update({ payment_status: "captured", paid_at: new Date().toISOString() })
    .eq("id", args.orderId);

  if (o.status === "payment_pending") {
    await setOrderStatus(db, args.orderId, "confirmed", "Payment captured");
  }
  await reserveInventory(db, args.orderId);

  // Clear the cart that produced this order and record coupon usage once.
  if (o.user_id) {
    const { data: cart } = await db.from("carts").select("id").eq("user_id", o.user_id).maybeSingle();
    if (cart) await db.from("cart_items").delete().eq("cart_id", (cart as any).id);
  }
  if (o.coupon_code) {
    const { data: redeemed } = await db
      .from("coupon_redemptions")
      .select("id")
      .eq("order_id", args.orderId)
      .maybeSingle();
    if (!redeemed) {
      await db.from("coupon_redemptions").insert({
        code: o.coupon_code,
        user_id: o.user_id,
        order_id: args.orderId,
        discount_amount: o.discount_total,
      });
    }
  }

  await dispatchNotification(db, {
    userId: o.user_id,
    orderId: args.orderId,
    channel: "email",
    template: "order_confirmed",
    recipient: o.contact_email,
    data: { orderNumber: o.order_number, total: o.grand_total },
  });

  await logAudit(db, {
    action: "payment.captured",
    entityType: "order",
    entityId: args.orderId,
    meta: { providerPaymentId: args.providerPaymentId },
  });
}

export async function markPaymentFailed(
  db: Db,
  args: {
    orderId: string;
    providerPaymentId?: string | null;
    providerOrderId?: string | null;
    reason?: string | null;
  },
) {
  const { data: order } = await db
    .from("orders")
    .select("id, order_number, payment_status, user_id, contact_email")
    .eq("id", args.orderId)
    .maybeSingle();
  if (!order) return;
  const o = order as any;
  if (o.payment_status === "captured") return;

  if (args.providerPaymentId) {
    const { data: existing } = await db
      .from("payments")
      .select("id")
      .eq("provider_payment_id", args.providerPaymentId)
      .maybeSingle();
    if (existing) {
      await db
        .from("payments")
        .update({ status: "failed", error_description: args.reason ?? null })
        .eq("id", (existing as any).id);
    } else {
      await db.from("payments").insert({
        order_id: args.orderId,
        provider: "razorpay",
        provider_order_id: args.providerOrderId ?? null,
        provider_payment_id: args.providerPaymentId,
        status: "failed",
        amount: 0,
        currency: "INR",
        error_description: args.reason ?? null,
      });
    }
  }

  await db.from("orders").update({ payment_status: "failed" }).eq("id", args.orderId);
  await dispatchNotification(db, {
    userId: o.user_id,
    orderId: args.orderId,
    channel: "email",
    template: "payment_failed",
    recipient: o.contact_email,
    data: { orderNumber: o.order_number },
  });
}

export async function markRefund(
  db: Db,
  args: {
    orderId: string;
    providerRefundId: string;
    providerPaymentId: string;
    amount: number;
    fullyRefunded: boolean;
  },
) {
  const { data: existing } = await db
    .from("refunds")
    .select("id")
    .eq("provider_refund_id", args.providerRefundId)
    .maybeSingle();
  if (existing) {
    await db.from("refunds").update({ status: "processed" }).eq("id", (existing as any).id);
  } else {
    await db.from("refunds").insert({
      order_id: args.orderId,
      provider_refund_id: args.providerRefundId,
      provider_payment_id: args.providerPaymentId,
      amount: args.amount,
      status: "processed",
    });
  }

  await db
    .from("orders")
    .update({ payment_status: args.fullyRefunded ? "refunded" : "partially_refunded" })
    .eq("id", args.orderId);

  if (args.fullyRefunded) {
    await setOrderStatus(db, args.orderId, "refunded", "Refund processed by gateway");
    await releaseInventory(db, args.orderId, "Order refunded");
  }

  const { data: order } = await db
    .from("orders")
    .select("order_number, user_id, contact_email")
    .eq("id", args.orderId)
    .maybeSingle();
  if (order) {
    await dispatchNotification(db, {
      userId: (order as any).user_id,
      orderId: args.orderId,
      channel: "email",
      template: "refund_processed",
      recipient: (order as any).contact_email,
      data: { orderNumber: (order as any).order_number, amount: args.amount },
    });
  }
}
