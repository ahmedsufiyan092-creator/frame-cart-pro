import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { listCoupons, upsertCoupon } from "@/lib/admin.functions";
import { formatINR } from "@/lib/money";
import { AdminPage, Panel, Loading, ErrorNote, Empty } from "@/components/admin/panel";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  head: () => ({
    meta: [
      { title: "Coupons — Frame Cart admin" },
      { name: "description", content: "Create and manage discount codes." },
      { property: "og:title", content: "Coupons — Frame Cart admin" },
      { property: "og:description", content: "Create and manage discount codes." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminCoupons,
});

const BLANK = {
  code: "",
  description: "",
  discountType: "percentage" as "percentage" | "fixed",
  discountValue: 10,
  maxDiscount: "",
  minOrderValue: 0,
  usageLimit: "",
  perUserLimit: 1,
  isActive: true,
  expiresAt: "",
};

function AdminCoupons() {
  const fetchCoupons = useServerFn(listCoupons);
  const save = useServerFn(upsertCoupon);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...BLANK });

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: () => fetchCoupons({}),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          code: form.code,
          description: form.description || undefined,
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
          minOrderValue: Number(form.minOrderValue),
          usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
          perUserLimit: Number(form.perUserLimit),
          isActive: form.isActive,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        },
      }),
    onSuccess: () => {
      toast.success("Coupon saved");
      setForm({ ...BLANK });
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminPage title="Coupons" description="Discounts are always recalculated on the server.">
      {error ? <ErrorNote error={error} /> : null}
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Panel title="Active codes">
          {isLoading ? (
            <Loading />
          ) : (data ?? []).length === 0 ? (
            <Empty>No coupons yet.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2">Code</th>
                    <th>Discount</th>
                    <th>Min order</th>
                    <th className="text-right">Used</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data ?? []).map((c: any) => (
                    <tr key={c.code}>
                      <td className="py-2 font-medium">{c.code}</td>
                      <td>
                        {c.discount_type === "percentage"
                          ? `${Number(c.discount_value)}%`
                          : formatINR(Number(c.discount_value))}
                      </td>
                      <td>{formatINR(Number(c.min_order_value))}</td>
                      <td className="text-right tabular-nums">
                        {c.used_count}
                        {c.usage_limit ? ` / ${c.usage_limit}` : ""}
                      </td>
                      <td className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setForm({
                              code: c.code,
                              description: c.description ?? "",
                              discountType: c.discount_type,
                              discountValue: Number(c.discount_value),
                              maxDiscount: c.max_discount ?? "",
                              minOrderValue: Number(c.min_order_value),
                              usageLimit: c.usage_limit ?? "",
                              perUserLimit: c.per_user_limit,
                              isActive: c.is_active,
                              expiresAt: c.expires_at ? c.expires_at.slice(0, 10) : "",
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

        <Panel title="Coupon details">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="space-y-1">
              <Label>Code</Label>
              <Input
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Type</Label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.discountType}
                  onChange={(e) => setForm({ ...form, discountType: e.target.value as any })}
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Value</Label>
                <Input
                  required
                  inputMode="decimal"
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label>Max discount (₹)</Label>
                <Input
                  value={form.maxDiscount}
                  onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Min order (₹)</Label>
                <Input
                  value={form.minOrderValue}
                  onChange={(e) => setForm({ ...form, minOrderValue: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label>Total uses</Label>
                <Input
                  value={form.usageLimit}
                  onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Per customer</Label>
                <Input
                  value={form.perUserLimit}
                  onChange={(e) => setForm({ ...form, perUserLimit: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Expires on</Label>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="coupon-active">Active</Label>
              <Switch
                id="coupon-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={mutation.isPending}>
                Save coupon
              </Button>
              <Button type="button" variant="ghost" onClick={() => setForm({ ...BLANK })}>
                Clear
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </AdminPage>
  );
}
