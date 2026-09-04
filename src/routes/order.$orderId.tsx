import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock } from "lucide-react";
import { SiteShell } from "@/components/site/site-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrder } from "@/lib/checkout.functions";
import { peekGuestToken } from "@/lib/guest";
import { formatINR, ORDER_STATUS_LABELS } from "@/lib/money";

export const Route = createFileRoute("/order/$orderId")({
  head: () => ({
    meta: [
      { title: "Your order — Frame Cart" },
      { name: "description", content: "Track the status of your Frame Cart order." },
      { property: "og:title", content: "Your order — Frame Cart" },
      { property: "og:description", content: "Track the status of your Frame Cart order." },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { orderId } = Route.useParams();
  const fetchOrder = useServerFn(getOrder);
  const { data, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrder({ data: { orderId, guestToken: peekGuestToken() } }),
  });

  if (isLoading) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 sm:px-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      </SiteShell>
    );
  }

  if (!data) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <h1 className="text-2xl">Order not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with the account used at checkout to view this order.
          </p>
          <Button asChild className="mt-6">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </SiteShell>
    );
  }

  const paid = data.payment_status === "captured" || data.payment_method === "cod";

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="flex items-center gap-3">
          {paid ? (
            <CheckCircle2 className="size-7 text-success" />
          ) : (
            <Clock className="size-7 text-warning" />
          )}
          <div>
            <h1 className="text-2xl">
              {paid ? "Order confirmed" : "Payment pending"}
            </h1>
            <p className="text-sm text-muted-foreground">Order {data.order_number}</p>
          </div>
        </div>

        <div className="surface-card mt-8 p-6">
          <p className="eyebrow">Status</p>
          <p className="mt-2 text-lg">
            {ORDER_STATUS_LABELS[data.status] ?? data.status}
          </p>
          <ol className="mt-5 space-y-2 text-sm text-muted-foreground">
            {(data.order_status_history ?? []).map((h: any, i: number) => (
              <li key={i}>
                {ORDER_STATUS_LABELS[h.status] ?? h.status}
                {h.note ? ` — ${h.note}` : ""}
              </li>
            ))}
          </ol>
        </div>

        <div className="surface-card mt-6 p-6">
          <p className="eyebrow">Items</p>
          <ul className="mt-4 space-y-3 text-sm">
            {(data.order_items ?? []).map((item: any) => (
              <li key={item.id} className="flex justify-between gap-4">
                <span>
                  {item.product_name} × {item.quantity}
                  <span className="block text-xs text-muted-foreground">
                    {item.size_label} · {item.frame_name}
                  </span>
                </span>
                <span>{formatINR(Number(item.line_total))}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex justify-between border-t border-border pt-4">
            <span>Total</span>
            <span className="font-display text-xl">{formatINR(Number(data.grand_total))}</span>
          </div>
        </div>

        <Button asChild variant="outline" className="mt-8">
          <Link to="/shop">Continue shopping</Link>
        </Button>
      </div>
    </SiteShell>
  );
}
