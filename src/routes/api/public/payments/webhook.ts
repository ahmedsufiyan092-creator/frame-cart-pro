import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleRazorpayWebhook } = await import("@/lib/webhook.server");
        return handleRazorpayWebhook(request);
      },
    },
  },
});
