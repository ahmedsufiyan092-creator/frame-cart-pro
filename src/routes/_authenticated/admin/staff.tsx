import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listStaff, grantStaffRole, revokeStaffRole } from "@/lib/admin-extra.functions";
import { AdminPage, Panel, Loading, ErrorNote, Empty } from "@/components/admin/panel";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  head: () => ({
    meta: [
      { title: "Staff access — Frame Cart admin" },
      { name: "description", content: "Grant and revoke staff roles." },
      { property: "og:title", content: "Staff access — Frame Cart admin" },
      { property: "og:description", content: "Grant and revoke staff roles." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminStaff,
});

const ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "ORDER_MANAGER",
  "PRODUCT_MANAGER",
  "SUPPORT",
  "MARKETING",
] as const;

function AdminStaff() {
  const fetchStaff = useServerFn(listStaff);
  const grant = useServerFn(grantStaffRole);
  const revoke = useServerFn(revokeStaffRole);
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("ORDER_MANAGER");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: () => fetchStaff({}),
    retry: false,
  });

  const grantMutation = useMutation({
    mutationFn: () => grant({ data: { email, role } }),
    onSuccess: () => {
      toast.success("Role granted");
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (roleId: string) => revoke({ data: { roleId } }),
    onSuccess: () => {
      toast.success("Role removed");
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminPage
      title="Staff access"
      description="Only a super admin can change who works in the back office."
    >
      {error ? <ErrorNote error={error} /> : null}
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Panel title="Current team">
          {isLoading ? (
            <Loading />
          ) : (data ?? []).length === 0 ? (
            <Empty>No staff roles assigned.</Empty>
          ) : (
            <ul className="divide-y text-sm">
              {(data ?? []).map((r: any) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    {r.fullName ?? r.email ?? r.user_id}
                    <span className="block text-xs text-muted-foreground">
                      {r.email} · {r.role}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={revokeMutation.isPending}
                    onClick={() => revokeMutation.mutate(r.id)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Grant a role">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              grantMutation.mutate();
            }}
          >
            <div className="space-y-1">
              <Label>Account email</Label>
              <Input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="person@example.com"
              />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              The person must already have a customer account on the shop.
            </p>
            <Button type="submit" disabled={grantMutation.isPending}>
              Grant role
            </Button>
          </form>
        </Panel>
      </div>
    </AdminPage>
  );
}
