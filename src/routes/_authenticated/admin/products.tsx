import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listAdminProducts, upsertProduct } from "@/lib/admin.functions";
import { formatINR } from "@/lib/money";
import { AdminPage, Panel, Loading, ErrorNote, Empty } from "@/components/admin/panel";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => ({
    meta: [
      { title: "Products — Frame Cart admin" },
      { name: "description", content: "Create and edit Frame Cart products." },
      { property: "og:title", content: "Products — Frame Cart admin" },
      { property: "og:description", content: "Create and edit Frame Cart products." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminProducts,
});

const BLANK = {
  id: undefined as string | undefined,
  slug: "",
  name: "",
  tagline: "",
  description: "",
  basePrice: 0,
  compareAtPrice: "",
  stockQuantity: 0,
  status: "draft" as "active" | "draft" | "archived",
  badge: "",
};

function AdminProducts() {
  const fetchProducts = useServerFn(listAdminProducts);
  const save = useServerFn(upsertProduct);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...BLANK });

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchProducts({}),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          ...(form.id ? { id: form.id } : {}),
          slug: form.slug,
          name: form.name,
          tagline: form.tagline || undefined,
          description: form.description || undefined,
          basePrice: Number(form.basePrice),
          compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
          stockQuantity: Number(form.stockQuantity),
          status: form.status,
          badge: form.badge || null,
        },
      }),
    onSuccess: () => {
      toast.success("Product saved");
      setForm({ ...BLANK });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminPage title="Products" description="Catalogue managed directly in the database.">
      {error ? <ErrorNote error={error} /> : null}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Catalogue">
          {isLoading ? (
            <Loading />
          ) : (data ?? []).length === 0 ? (
            <Empty>No products yet.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2">Name</th>
                    <th>Status</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Stock</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data ?? []).map((p: any) => (
                    <tr key={p.id}>
                      <td className="py-2">
                        {p.name}
                        <span className="block text-xs text-muted-foreground">/{p.slug}</span>
                      </td>
                      <td className="text-xs capitalize">{p.status}</td>
                      <td className="text-right tabular-nums">{formatINR(Number(p.base_price))}</td>
                      <td className="text-right tabular-nums">{p.stock_quantity}</td>
                      <td className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setForm({
                              id: p.id,
                              slug: p.slug,
                              name: p.name,
                              tagline: "",
                              description: "",
                              basePrice: Number(p.base_price),
                              compareAtPrice: p.compare_at_price ?? "",
                              stockQuantity: p.stock_quantity ?? 0,
                              status: p.status,
                              badge: p.badge ?? "",
                            })
                          }
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title={form.id ? "Edit product" : "New product"}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <Field label="Name">
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Web address (slug)">
              <Input
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </Field>
            <Field label="Tagline">
              <Input
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (₹)">
                <Input
                  required
                  inputMode="decimal"
                  value={form.basePrice}
                  onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
                />
              </Field>
              <Field label="Compare at (₹)">
                <Input
                  inputMode="decimal"
                  value={form.compareAtPrice}
                  onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })}
                />
              </Field>
              <Field label="Stock">
                <Input
                  required
                  inputMode="numeric"
                  value={form.stockQuantity}
                  onChange={(e) => setForm({ ...form, stockQuantity: Number(e.target.value) })}
                />
              </Field>
              <Field label="Badge">
                <Input
                  value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Status">
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={mutation.isPending}>
                {form.id ? "Save changes" : "Create product"}
              </Button>
              {form.id ? (
                <Button type="button" variant="ghost" onClick={() => setForm({ ...BLANK })}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </Panel>
      </div>
    </AdminPage>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
