import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listAdminOrders } from "@/lib/admin.functions";
import { formatINR, ORDER_STATUS_LABELS } from "@/lib/money";
import { AdminPage, Panel, Loading, ErrorNote, Empty, StatusPill } from "@/components/admin/panel";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({
    meta: [
      { title: "Orders — Frame Cart admin" },
      { name: "description", content: "Manage Frame Cart orders and fulfilment." },
      { property: "og:title", content: "Orders — Frame Cart admin" },
      { property: "og:description", content: "Manage Frame Cart orders and fulfilment." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminOrders,
});

const STATUSES = Object.keys(ORDER_STATUS_LABELS);

function AdminOrders() {
  const fetchOrders = useServerFn(listAdminOrders);
  const [status, setStatus] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-orders", status, search],
    queryFn: () => fetchOrders({ data: { status, search } }),
    retry: false,
  });

  return (
    <AdminPage title="Orders" description="Every order, newest first.">
      <Panel>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search order number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Button
            size="sm"
            variant={status === null ? "default" : "outline"}
            onClick={() => setStatus(null)}
          >
            All
          </Button>
          {STATUSES.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? "default" : "outline"}
              onClick={() => setStatus(s)}
            >
              {ORDER_STATUS_LABELS[s]}
            </Button>
          ))}
        </div>
      </Panel>

      {error ? <ErrorNote error={error} /> : null}
      {isLoading ? (
        <Loading />
      ) : (
        <Panel>
          {(data ?? []).length === 0 ? (
            <Empty>No orders match this filter.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2">Order</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data ?? []).map((o: any) => (
                    <tr key={o.id}>
                      <td className="py-2">
                        <Link
                          to="/admin/orders/$orderId"
                          params={{ orderId: o.id }}
                          className="font-medium hover:underline"
                        >
                          {o.order_number}
                        </Link>
                        <span className="block text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td>
                        {o.contact_name ?? "—"}
                        <span className="block text-xs text-muted-foreground">
                          {o.contact_email}
                        </span>
                      </td>
                      <td>
                        <StatusPill status={o.status} />
                      </td>
                      <td className="text-xs">
                        {o.payment_method?.toUpperCase()} · {o.payment_status}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatINR(Number(o.grand_total))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </AdminPage>
  );
}
