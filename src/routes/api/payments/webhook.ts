import { createFileRoute } from "@tanstack/react-router";

/** Alias of /api/public/payments/webhook — both verify X-Razorpay-Signature. */
export const Route = createFileRoute("/api/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleRazorpayWebhook } = await import("@/lib/webhook.server");
        return handleRazorpayWebhook(request);
      },
    },
  },
});
