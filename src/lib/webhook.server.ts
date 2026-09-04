/** Razorpay webhook processing, shared by the public and app webhook routes. */
import { verifyWebhookSignature, webhookSecret } from "./razorpay.server";

export async function handleRazorpayWebhook(request: Request): Promise<Response> {
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const rawBody = await request.text(); // raw body — required for HMAC

  if (!webhookSecret()) {
    console.error("[razorpay] RAZORPAY_WEBHOOK_SECRET is not configured");
    return new Response("Webhook not configured", { status: 503 });
  }

  const valid = await verifyWebhookSignature(rawBody, signature);
  if (!valid) return new Response("Invalid signature", { status: 401 });

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const { recordPaymentEvent, markPaymentCaptured, markPaymentFailed, markRefund } = await import(
    "./payments.server"
  );

  const eventId = request.headers.get("x-razorpay-event-id") ?? event?.id ?? null;
  const type: string = event?.event ?? "unknown";
  const paymentEntity = event?.payload?.payment?.entity;
  const refundEntity = event?.payload?.refund?.entity;
  const orderEntity = event?.payload?.order?.entity;

  const providerOrderId: string | null =
    paymentEntity?.order_id ?? refundEntity?.notes?.razorpay_order_id ?? orderEntity?.id ?? null;

  let orderId: string | null = paymentEntity?.notes?.order_id ?? orderEntity?.notes?.order_id ?? null;
  if (!orderId && providerOrderId) {
    const { data } = await db
      .from("payments")
      .select("order_id")
      .eq("provider_order_id", providerOrderId)
      .maybeSingle();
    orderId = data?.order_id ?? null;
  }
  if (!orderId && refundEntity?.payment_id) {
    const { data } = await db
      .from("payments")
      .select("order_id")
      .eq("provider_payment_id", refundEntity.payment_id)
      .maybeSingle();
    orderId = data?.order_id ?? null;
  }

  const { duplicate } = await recordPaymentEvent(db, {
    orderId,
    eventId,
    eventType: type,
    payload: event,
  });
  if (duplicate) return Response.json({ received: true, duplicate: true });

  if (!orderId) return Response.json({ received: true, matched: false });

  switch (type) {
    case "payment.captured":
    case "order.paid": {
      const entity = paymentEntity ?? {};
      await markPaymentCaptured(db, {
        orderId,
        providerPaymentId: entity.id ?? `order_paid_${providerOrderId}`,
        providerOrderId: providerOrderId ?? "",
        amount: (entity.amount ?? orderEntity?.amount_paid ?? 0) / 100,
        method: entity.method ?? null,
      });
      break;
    }
    case "payment.authorized": {
      await db
        .from("orders")
        .update({ payment_status: "authorized" })
        .eq("id", orderId)
        .neq("payment_status", "captured");
      break;
    }
    case "payment.failed": {
      await markPaymentFailed(db, {
        orderId,
        providerPaymentId: paymentEntity?.id ?? null,
        providerOrderId,
        reason: paymentEntity?.error_description ?? "Payment failed at gateway",
      });
      break;
    }
    case "refund.processed":
    case "refund.created": {
      if (refundEntity) {
        const { data: order } = await db
          .from("orders")
          .select("grand_total")
          .eq("id", orderId)
          .maybeSingle();
        const amount = (refundEntity.amount ?? 0) / 100;
        await markRefund(db, {
          orderId,
          providerRefundId: refundEntity.id,
          providerPaymentId: refundEntity.payment_id,
          amount,
          fullyRefunded: amount >= Number(order?.grand_total ?? 0),
        });
      }
      break;
    }
    default:
      break;
  }

  return Response.json({ received: true });
}
