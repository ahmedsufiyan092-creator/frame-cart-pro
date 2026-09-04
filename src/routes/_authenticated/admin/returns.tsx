import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listReturns, decideReturn, listRefunds } from "@/lib/admin-extra.functions";
import { formatINR } from "@/lib/money";
import { AdminPage, Panel, Loading, ErrorNote, Empty, StatusPill } from "@/components/admin/panel";

export const Route = createFileRoute("/_authenticated/admin/returns")({
  head: () => ({
    meta: [
      { title: "Returns & refunds — Frame Cart admin" },
      { name: "description", content: "Approve returns and review refund history." },
      { property: "og:title", content: "Returns & refunds — Frame Cart admin" },
      { property: "og:description", content: "Approve returns and review refund history." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminReturns,
});

function AdminReturns() {
  const fetchReturns = useServerFn(listReturns);
  const fetchRefunds = useServerFn(listRefunds);
  const decide = useServerFn(decideReturn);
  const queryClient = useQueryClient();

  const returns = useQuery({
    queryKey: ["admin-returns"],
    queryFn: () => fetchReturns({}),
    retry: false,
  });
  const refunds = useQuery({
    queryKey: ["admin-refunds"],
    queryFn: () => fetchRefunds({}),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: ({
      returnId,
      status,
    }: {
      returnId: string;
      status: "approved" | "rejected" | "completed";
    }) => decide({ data: { returnId, status } }),
    onSuccess: () => {
      toast.success("Return updated");
      queryClient.invalidateQueries({ queryKey: ["admin-returns"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminPage
      title="Returns & refunds"
      description="Refunds are issued through the payment gateway from the order page."
    >
      {returns.error ? <ErrorNote error={returns.error} /> : null}
      <Panel title="Return requests">
        {returns.isLoading ? (
          <Loading />
        ) : (returns.data ?? []).length === 0 ? (
          <Empty>No return requests.</Empty>
        ) : (
          <ul className="divide-y">
            {(returns.data ?? []).map((r: any) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1 text-sm">
                  <Link
                    to="/admin/orders/$orderId"
                    params={{ orderId: r.order_id }}
                    className="font-medium hover:underline"
                  >
                    {r.orders?.order_number ?? "Order"}
                  </Link>
                  <p className="text-muted-foreground">{r.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.orders?.contact_email} · {new Date(r.created_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={r.status} />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ returnId: r.id, status: "approved" })}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ returnId: r.id, status: "completed" })}
                  >
                    Mark returned
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ returnId: r.id, status: "rejected" })}
                  >
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Refund history">
        {refunds.isLoading ? (
          <Loading />
        ) : (refunds.data ?? []).length === 0 ? (
          <Empty>No refunds issued yet.</Empty>
        ) : (
          <ul className="divide-y text-sm">
            {(refunds.data ?? []).map((r: any) => (
              <li key={r.id} className="flex justify-between gap-3 py-2">
                <span>
                  {r.orders?.order_number ?? "Order"}
                  <span className="block text-xs text-muted-foreground">
                    {r.provider_refund_id ?? "—"} · {new Date(r.created_at).toLocaleString("en-IN")}
                  </span>
                </span>
                <span className="text-right">
                  {formatINR(Number(r.amount))}
                  <span className="block text-xs text-muted-foreground">{r.status}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </AdminPage>
  );
}
