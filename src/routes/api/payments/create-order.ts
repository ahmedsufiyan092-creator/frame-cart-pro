import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  orderId: z.string().uuid(),
  guestToken: z.string().uuid().nullable().optional(),
});

export const Route = createFileRoute("/api/payments/create-order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = schema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

        const { razorpayKeys, createRazorpayOrder } = await import("@/lib/razorpay.server");
        const { keyId, configured } = razorpayKeys();
        if (!configured)
          return Response.json(
            { error: "Online payment is not configured yet. Please choose cash on delivery." },
            { status: 503 },
          );

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        // Caller identity from the bearer token; guests fall back to their cart token.
        let userId: string | null = null;
        const auth = request.headers.get("authorization");
        if (auth) {
          const { data } = await supabaseAdmin.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
          userId = data.user?.id ?? null;
        }

        const { data: order } = await db
          .from("orders")
          .select("id, order_number, grand_total, status, payment_status, user_id, guest_token, payment_method")
          .eq("id", parsed.data.orderId)
          .maybeSingle();
        if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

        const owns = order.user_id
          ? order.user_id === userId
          : Boolean(parsed.data.guestToken && order.guest_token === parsed.data.guestToken);
        if (!owns) return Response.json({ error: "Not found" }, { status: 404 });

        if (order.payment_status === "captured")
          return Response.json({ error: "This order is already paid." }, { status: 409 });
        if (order.payment_method !== "razorpay")
          return Response.json({ error: "This order is not an online payment." }, { status: 400 });

        // Amount always comes from the stored order total, never from the client.
        const amountPaise = Math.round(Number(order.grand_total) * 100);

        try {
          const rzpOrder = await createRazorpayOrder({
            amountPaise,
            receipt: order.order_number,
            notes: { order_id: order.id, order_number: order.order_number },
          });

          await db.from("payments").insert({
            order_id: order.id,
            provider: "razorpay",
            provider_order_id: rzpOrder.id,
            status: "created",
            amount: Number(order.grand_total),
            currency: "INR",
          });
          await db.from("payment_events").insert({
            order_id: order.id,
            event_type: "checkout.order_created",
            payload: { razorpay_order_id: rzpOrder.id, amount: amountPaise },
          });

          return Response.json({
            keyId,
            razorpayOrderId: rzpOrder.id,
            amount: amountPaise,
            currency: "INR",
            orderNumber: order.order_number,
          });
        } catch (error) {
          console.error("[razorpay] create-order failed", error);
          return Response.json(
            { error: "Could not start the payment. Please try again." },
            { status: 502 },
          );
        }
      },
    },
  },
});
