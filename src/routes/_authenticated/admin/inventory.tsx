import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listInventory } from "@/lib/admin-extra.functions";
import { adjustStock } from "@/lib/admin.functions";
import { AdminPage, Panel, Loading, ErrorNote, Empty } from "@/components/admin/panel";

export const Route = createFileRoute("/_authenticated/admin/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — Frame Cart admin" },
      { name: "description", content: "Stock levels and adjustments." },
      { property: "og:title", content: "Inventory — Frame Cart admin" },
      { property: "og:description", content: "Stock levels and adjustments." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminInventory,
});

function AdminInventory() {
  const fetchInventory = useServerFn(listInventory);
  const adjust = useServerFn(adjustStock);
  const queryClient = useQueryClient();
  const [changes, setChanges] = useState<Record<string, string>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-inventory"],
    queryFn: () => fetchInventory({}),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: ({ productId, change }: { productId: string; change: number }) =>
      adjust({ data: { productId, change, reason: "Manual adjustment from admin" } }),
    onSuccess: () => {
      toast.success("Stock updated");
      setChanges({});
      queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminPage title="Inventory" description="Adjust stock and review every movement.">
      {error ? <ErrorNote error={error} /> : null}
      {isLoading ? (
        <Loading />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Panel title="Stock on hand">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2">Product</th>
                    <th className="text-right">Stock</th>
                    <th className="text-right">Adjust</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data?.products ?? []).map((p: any) => (
                    <tr key={p.id}>
                      <td className="py-2">{p.name}</td>
                      <td
                        className={`text-right tabular-nums ${
                          p.stock_quantity <= (p.low_stock_threshold ?? 5) ? "text-destructive" : ""
                        }`}
                      >
                        {p.stock_quantity}
                      </td>
                      <td className="py-2">
                        <div className="flex justify-end gap-2">
                          <Input
                            className="h-8 w-20"
                            placeholder="±"
                            value={changes[p.id] ?? ""}
                            onChange={(e) => setChanges({ ...changes, [p.id]: e.target.value })}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!changes[p.id] || mutation.isPending}
                            onClick={() =>
                              mutation.mutate({
                                productId: p.id,
                                change: Number(changes[p.id]),
                              })
                            }
                          >
                            Apply
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Recent movements">
            {(data?.movements ?? []).length === 0 ? (
              <Empty>No stock movements yet.</Empty>
            ) : (
              <ul className="divide-y text-xs">
                {(data?.movements ?? []).map((m: any) => (
                  <li key={m.id} className="flex justify-between gap-2 py-2">
                    <span>
                      {m.products?.name ?? "Product"}
                      <span className="block text-muted-foreground">
                        {m.type} · {m.reason}
                      </span>
                    </span>
                    <span className={m.change < 0 ? "text-destructive" : "text-primary"}>
                      {m.change > 0 ? `+${m.change}` : m.change}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </AdminPage>
  );
}
