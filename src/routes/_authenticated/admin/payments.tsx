import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPayments } from "@/lib/admin-extra.functions";
import { formatINR } from "@/lib/money";
import { AdminPage, Panel, Loading, ErrorNote, Empty, StatusPill } from "@/components/admin/panel";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  head: () => ({
    meta: [
      { title: "Payments — Frame Cart admin" },
      { name: "description", content: "Gateway payment records and statuses." },
      { property: "og:title", content: "Payments — Frame Cart admin" },
      { property: "og:description", content: "Gateway payment records and statuses." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPayments,
});

function AdminPayments() {
  const fetchPayments = useServerFn(listPayments);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: () => fetchPayments({}),
    retry: false,
  });

  return (
    <AdminPage
      title="Payments"
      description="Recorded from verified gateway responses and webhooks only."
    >
      {error ? <ErrorNote error={error} /> : null}
      {isLoading ? (
        <Loading />
      ) : (
        <Panel>
          {(data ?? []).length === 0 ? (
            <Empty>No payments recorded yet.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2">Order</th>
                    <th>Gateway reference</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data ?? []).map((p: any) => (
                    <tr key={p.id}>
                      <td className="py-2">
                        <Link
                          to="/admin/orders/$orderId"
                          params={{ orderId: p.order_id }}
                          className="font-medium hover:underline"
                        >
                          {p.orders?.order_number ?? "Order"}
                        </Link>
                      </td>
                      <td className="text-xs">{p.provider_payment_id ?? "—"}</td>
                      <td className="text-xs">{p.method ?? "—"}</td>
                      <td>
                        <StatusPill status={p.status} />
                      </td>
                      <td className="text-right tabular-nums">{formatINR(Number(p.amount))}</td>
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
