import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/site-shell";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Frame Cart" },
      {
        name: "description",
        content:
          "Questions about an order, a custom size or bulk framing? Reach the Frame Cart support team.",
      },
      { property: "og:title", content: "Contact Frame Cart" },
      { property: "og:description", content: "Reach the Frame Cart support team." },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <p className="eyebrow">Support</p>
        <h1 className="mt-3 text-4xl">Talk to us</h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          Order questions, custom sizes, gifting and bulk framing — our team replies within one
          working day.
        </p>

        <div className="mt-10 space-y-4">
          <div className="surface-card p-6">
            <p className="eyebrow">Email</p>
            <p className="mt-2 text-lg">support@framecart.example</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Replace this with your real support inbox before going live.
            </p>
          </div>
          <div className="surface-card p-6">
            <p className="eyebrow">Order help</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Signed-in customers can track, cancel or request a return directly from
              their orders page — that is the fastest route for anything order-specific.
            </p>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
