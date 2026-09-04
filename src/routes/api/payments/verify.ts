import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  orderId: z.string().uuid(),
  guestToken: z.string().uuid().nullable().optional(),
  razorpay_order_id: z.string().min(4),
  razorpay_payment_id: z.string().min(4),
  razorpay_signature: z.string().min(10),
});

export const Route = createFileRoute("/api/payments/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = schema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
        const input = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;
        const { verifyPaymentSignature, fetchRazorpayPayment } = await import(
          "@/lib/razorpay.server"
        );
        const { markPaymentCaptured, markPaymentFailed, recordPaymentEvent } = await import(
          "@/lib/payments.server"
        );

        let userId: string | null = null;
        const auth = request.headers.get("authorization");
        if (auth) {
          const { data } = await supabaseAdmin.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
          userId = data.user?.id ?? null;
        }

        const { data: order } = await db
          .from("orders")
          .select("id, order_number, grand_total, user_id, guest_token, payment_status")
          .eq("id", input.orderId)
          .maybeSingle();
        if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

        const owns = order.user_id
          ? order.user_id === userId
          : Boolean(input.guestToken && order.guest_token === input.guestToken);
        if (!owns) return Response.json({ error: "Not found" }, { status: 404 });

        const validSignature = await verifyPaymentSignature({
          razorpayOrderId: input.razorpay_order_id,
          razorpayPaymentId: input.razorpay_payment_id,
          signature: input.razorpay_signature,
        });

        await recordPaymentEvent(db, {
          orderId: order.id,
          eventType: validSignature ? "checkout.verified" : "checkout.signature_invalid",
          payload: {
            razorpay_order_id: input.razorpay_order_id,
            razorpay_payment_id: input.razorpay_payment_id,
          },
        });

        if (!validSignature) {
          await markPaymentFailed(db, {
            orderId: order.id,
            providerPaymentId: input.razorpay_payment_id,
            providerOrderId: input.razorpay_order_id,
            reason: "Signature verification failed",
          });
          return Response.json({ error: "Payment could not be verified." }, { status: 400 });
        }

        // Re-read the payment from Razorpay: the gateway is the source of truth.
        try {
          const payment = await fetchRazorpayPayment(input.razorpay_payment_id);
          const expected = Math.round(Number(order.grand_total) * 100);
          if (payment.order_id !== input.razorpay_order_id || payment.amount < expected) {
            await markPaymentFailed(db, {
              orderId: order.id,
              providerPaymentId: input.razorpay_payment_id,
              providerOrderId: input.razorpay_order_id,
              reason: "Amount or order mismatch",
            });
            return Response.json({ error: "Payment amount mismatch." }, { status: 400 });
          }
          if (payment.status === "captured" || payment.status === "authorized") {
            await markPaymentCaptured(db, {
              orderId: order.id,
              providerPaymentId: payment.id,
              providerOrderId: payment.order_id,
              amount: payment.amount / 100,
              method: payment.method ?? null,
            });
            return Response.json({ ok: true, orderNumber: order.order_number });
          }
          await markPaymentFailed(db, {
            orderId: order.id,
            providerPaymentId: payment.id,
            providerOrderId: payment.order_id,
            reason: payment.error_description ?? `Payment status ${payment.status}`,
          });
          return Response.json({ error: "Payment was not completed." }, { status: 400 });
        } catch (error) {
          console.error("[razorpay] verify failed", error);
          return Response.json({ error: "Could not verify the payment." }, { status: 502 });
        }
      },
    },
  },
});
