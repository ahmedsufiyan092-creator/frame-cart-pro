import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCustomers } from "@/lib/admin-extra.functions";
import { formatINR } from "@/lib/money";
import { AdminPage, Panel, Loading, ErrorNote, Empty } from "@/components/admin/panel";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Frame Cart admin" },
      { name: "description", content: "Customer accounts and lifetime value." },
      { property: "og:title", content: "Customers — Frame Cart admin" },
      { property: "og:description", content: "Customer accounts and lifetime value." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminCustomers,
});

function AdminCustomers() {
  const fetchCustomers = useServerFn(listCustomers);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => fetchCustomers({}),
    retry: false,
  });

  return (
    <AdminPage title="Customers" description="Registered accounts and their order history.">
      {error ? <ErrorNote error={error} /> : null}
      {isLoading ? (
        <Loading />
      ) : (
        <Panel>
          {(data ?? []).length === 0 ? (
            <Empty>No customer accounts yet.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2">Customer</th>
                    <th>Phone</th>
                    <th className="text-right">Orders</th>
                    <th className="text-right">Lifetime spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data ?? []).map((c: any) => (
                    <tr key={c.id}>
                      <td className="py-2">
                        {c.full_name ?? "—"}
                        <span className="block text-xs text-muted-foreground">{c.email}</span>
                      </td>
                      <td className="text-xs">{c.phone ?? "—"}</td>
                      <td className="text-right tabular-nums">{c.orderCount}</td>
                      <td className="text-right tabular-nums">{formatINR(c.lifetimeSpend)}</td>
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
