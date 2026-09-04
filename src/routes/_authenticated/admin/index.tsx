import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboard } from "@/lib/admin.functions";
import { formatINR, ORDER_STATUS_LABELS } from "@/lib/money";
import { AdminPage, Panel, Stat, Loading, ErrorNote, Empty } from "@/components/admin/panel";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — Frame Cart" },
      { name: "description", content: "Operations dashboard for Frame Cart staff." },
      { property: "og:title", content: "Admin dashboard — Frame Cart" },
      { property: "og:description", content: "Operations dashboard for Frame Cart staff." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminHome,
});

function AdminHome() {
  const fetchDashboard = useServerFn(getDashboard);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => fetchDashboard({}),
    retry: false,
  });

  return (
    <AdminPage title="Dashboard" description="Live trading view of the store.">
      {error ? <ErrorNote error={error} /> : null}
      {isLoading ? (
        <Loading />
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Revenue (30 days)" value={formatINR(data.revenue30d)} />
            <Stat label="Revenue (all time)" value={formatINR(data.revenue)} />
            <Stat label="Orders" value={String(data.orderCount)} />
            <Stat label="To fulfil" value={String(data.pendingFulfilment)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Recent orders">
              {data.recentOrders.length === 0 ? (
                <Empty>No orders yet.</Empty>
              ) : (
                <ul className="divide-y text-sm">
                  {data.recentOrders.map((o: any) => (
                    <li key={o.id} className="flex items-center justify-between gap-3 py-2">
                      <Link
                        to="/admin/orders/$orderId"
                        params={{ orderId: o.id }}
                        className="font-medium hover:underline"
                      >
                        {o.order_number}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {ORDER_STATUS_LABELS[o.status] ?? o.status}
                      </span>
                      <span className="tabular-nums">{formatINR(Number(o.grand_total))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Low stock">
              {data.lowStock.length === 0 ? (
                <Empty>Stock levels are healthy.</Empty>
              ) : (
                <ul className="divide-y text-sm">
                  {data.lowStock.map((p: any) => (
                    <li key={p.id} className="flex items-center justify-between py-2">
                      <span>{p.name}</span>
                      <span className="tabular-nums text-destructive">{p.stock_quantity} left</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Stat label="Customers" value={String(data.customers)} />
            <Stat label="Reviews awaiting moderation" value={String(data.pendingReviews)} />
          </div>
        </>
      ) : null}
    </AdminPage>
  );
}
