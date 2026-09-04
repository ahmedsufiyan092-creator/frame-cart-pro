import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteShell } from "@/components/site/site-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyOrders } from "@/lib/checkout.functions";
import { formatINR, ORDER_STATUS_LABELS } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/account/orders")({
  head: () => ({
    meta: [
      { title: "Your orders — Frame Cart" },
      { name: "description", content: "Track, cancel or return your Frame Cart orders." },
      { property: "og:title", content: "Your orders — Frame Cart" },
      { property: "og:description", content: "Track, cancel or return your Frame Cart orders." },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const fetchOrders = useServerFn(getMyOrders);
  const { data, isLoading } = useQuery({ queryKey: ["my-orders"], queryFn: () => fetchOrders({}) });

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="eyebrow">Account</p>
        <h1 className="mt-2 text-3xl">Your orders</h1>

        {isLoading ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : (data ?? []).length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-muted-foreground">No orders yet.</p>
            <Button asChild className="mt-6">
              <Link to="/shop">Start framing</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {(data ?? []).map((order: any) => (
              <li key={order.id} className="surface-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("en-IN")} ·{" "}
                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </p>
                  </div>
                  <p className="font-display text-lg">{formatINR(Number(order.grand_total))}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {(order.order_items ?? []).map((item: any) => (
                    <span key={item.id}>
                      {item.product_name} × {item.quantity}
                    </span>
                  ))}
                </div>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link to="/order/$orderId" params={{ orderId: order.id }}>
                    View order
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SiteShell>
  );
}
