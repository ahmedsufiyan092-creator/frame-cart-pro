import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { listCategories, upsertCategory } from "@/lib/admin-extra.functions";
import { AdminPage, Panel, Loading, ErrorNote, Empty } from "@/components/admin/panel";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => ({
    meta: [
      { title: "Categories & options — Frame Cart admin" },
      { name: "description", content: "Manage catalogue categories, sizes and frame finishes." },
      { property: "og:title", content: "Categories & options — Frame Cart admin" },
      {
        property: "og:description",
        content: "Manage catalogue categories, sizes and frame finishes.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminCategories,
});

const BLANK = { id: "", name: "", slug: "", description: "", sortOrder: 0, isActive: true };

function AdminCategories() {
  const fetchAll = useServerFn(listCategories);
  const save = useServerFn(upsertCategory);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...BLANK });

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => fetchAll({}),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          ...(form.id ? { id: form.id } : {}),
          name: form.name,
          slug: form.slug,
          description: form.description || undefined,
          sortOrder: Number(form.sortOrder),
          isActive: form.isActive,
        },
      }),
    onSuccess: () => {
      toast.success("Category saved");
      setForm({ ...BLANK });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminPage title="Categories & options" description="Catalogue structure used across the shop.">
      {error ? <ErrorNote error={error} /> : null}
      {isLoading ? (
        <Loading />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <Panel title="Categories">
              {(data?.categories ?? []).length === 0 ? (
                <Empty>No categories yet.</Empty>
              ) : (
                <ul className="divide-y text-sm">
                  {(data?.categories ?? []).map((c: any) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                      <span>
                        {c.name}
                        <span className="block text-xs text-muted-foreground">
                          /{c.slug} · order {c.sort_order} · {c.is_active ? "active" : "hidden"}
                        </span>
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setForm({
                            id: c.id,
                            name: c.name,
                            slug: c.slug,
                            description: c.description ?? "",
                            sortOrder: c.sort_order ?? 0,
                            isActive: c.is_active,
                          })
                        }
                      >
                        Edit
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title={form.id ? "Edit category" : "New category"}>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  mutation.mutate();
                }}
              >
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input
                    required
                    value={form.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setForm((f) => ({
                        ...f,
                        name,
                        slug: f.id
                          ? f.slug
                          : name
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-")
                              .replace(/^-|-$/g, ""),
                      }));
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Slug</Label>
                  <Input
                    required
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Sort order</Label>
                  <Input
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label htmlFor="cat-active">Visible in shop</Label>
                  <Switch
                    id="cat-active"
                    checked={form.isActive}
                    onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={mutation.isPending}>
                    Save
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setForm({ ...BLANK })}>
                    Clear
                  </Button>
                </div>
              </form>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Sizes">
              <ul className="divide-y text-sm">
                {(data?.sizes ?? []).map((s: any) => (
                  <li key={s.id} className="flex justify-between py-2">
                    <span>{s.label}</span>
                    <span className="text-xs text-muted-foreground">
                      ×{Number(s.price_multiplier ?? 1)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Frame finishes">
              <ul className="divide-y text-sm">
                {(data?.frames ?? []).map((f: any) => (
                  <li key={f.id} className="flex items-center justify-between py-2">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block size-4 rounded-full border"
                        style={{ background: f.swatch ?? "transparent" }}
                      />
                      {f.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      +{Number(f.price_delta ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </>
      )}
    </AdminPage>
  );
}
