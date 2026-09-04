import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminSession } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const NAV: { to: string; label: string; roles: string[] }[] = [
  { to: "/admin", label: "Dashboard", roles: [] },
  { to: "/admin/orders", label: "Orders", roles: ["ADMIN", "ORDER_MANAGER", "CUSTOMER_SUPPORT"] },
  { to: "/admin/customers", label: "Customers", roles: ["ADMIN", "CUSTOMER_SUPPORT", "ORDER_MANAGER", "MARKETING"] },
  { to: "/admin/products", label: "Products", roles: ["ADMIN", "PRODUCT_MANAGER", "INVENTORY_MANAGER"] },
  { to: "/admin/categories", label: "Categories & options", roles: ["ADMIN", "PRODUCT_MANAGER", "MARKETING"] },
  { to: "/admin/inventory", label: "Inventory", roles: ["ADMIN", "INVENTORY_MANAGER", "PRODUCT_MANAGER"] },
  { to: "/admin/coupons", label: "Coupons", roles: ["ADMIN", "MARKETING"] },
  { to: "/admin/reviews", label: "Reviews", roles: ["ADMIN", "CUSTOMER_SUPPORT", "MARKETING"] },
  { to: "/admin/returns", label: "Returns & refunds", roles: ["ADMIN", "ORDER_MANAGER", "CUSTOMER_SUPPORT"] },
  { to: "/admin/payments", label: "Payments", roles: ["ADMIN", "ORDER_MANAGER"] },
  { to: "/admin/notifications", label: "Notifications", roles: ["ADMIN", "CUSTOMER_SUPPORT"] },
  { to: "/admin/staff", label: "Staff & roles", roles: ["ADMIN"] },
  { to: "/admin/audit", label: "Audit log", roles: ["ADMIN"] },
  { to: "/admin/settings", label: "Store settings", roles: ["ADMIN", "MARKETING", "ORDER_MANAGER"] },
  { to: "/admin/integrations", label: "Integrations", roles: ["ADMIN"] },
];

function AdminLayout() {
  const fetchSession = useServerFn(getAdminSession);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-session"],
    queryFn: () => fetchSession({}),
    retry: false,
  });

  const roles = data?.roles ?? [];
  const isSuper = roles.includes("SUPER_ADMIN");
  const can = (needed: string[]) =>
    needed.length === 0 || isSuper || needed.some((r) => roles.includes(r));

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!roles.length) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-xl border bg-card p-8 text-center">
          <h1 className="text-xl font-semibold">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account does not have a staff role on this store. If you believe this is a
            mistake, ask a super admin to grant you access.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild variant="outline">
              <Link to="/admin/login">Staff sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/">Back to store</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-display text-sm tracking-[0.3em]">
              FRAME CART
            </Link>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="hidden sm:inline">{data?.email}</span>
            <span className="hidden rounded bg-muted px-2 py-1 sm:inline">{roles.join(", ")}</span>
            <Button size="sm" variant="outline" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <nav className="hidden w-56 shrink-0 lg:block">
          <ul className="sticky top-20 space-y-1">
            {NAV.filter((item) => can(item.roles)).map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  activeOptions={{ exact: item.to === "/admin" }}
                  activeProps={{ className: "bg-primary text-primary-foreground" }}
                  className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex gap-2 overflow-x-auto lg:hidden">
            {NAV.filter((item) => can(item.roles)).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/admin" }}
                activeProps={{ className: "bg-primary text-primary-foreground" }}
                className="whitespace-nowrap rounded-full border px-3 py-1.5 text-xs"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
