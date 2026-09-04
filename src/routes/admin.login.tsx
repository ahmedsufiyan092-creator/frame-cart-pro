import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAdminSession } from "@/lib/admin.functions";
import { claimAdminBootstrap } from "@/lib/admin-extra.functions";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Staff sign in — Frame Cart" },
      { name: "description", content: "Secure sign in for Frame Cart staff and administrators." },
      { property: "og:title", content: "Staff sign in — Frame Cart" },
      { property: "og:description", content: "Secure sign in for Frame Cart staff." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const session = useServerFn(getAdminSession);
  const claim = useServerFn(claimAdminBootstrap);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setDenied(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    // Role is verified on the server; the browser never decides who is staff.
    let info = await session({});
    if (!info.roles.length) {
      const bootstrap = await claim({});
      if (bootstrap.granted) info = await session({});
    }
    setBusy(false);
    if (!info.roles.length) {
      setDenied(true);
      return;
    }
    toast.success("Signed in");
    navigate({ to: "/admin", replace: true });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setDenied(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-16">
      <div className="w-full max-w-sm">
        <Link to="/" className="block text-center font-display text-xl tracking-[0.3em]">
          FRAME CART
        </Link>
        <p className="mt-1 text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Operations console
        </p>

        {denied ? (
          <div className="mt-8 rounded-xl border bg-card p-6 text-center">
            <h1 className="text-lg font-semibold">Access denied</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This account is signed in, but it has no staff role on this store.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="outline" onClick={signOut}>
                Use another account
              </Button>
              <Button asChild>
                <Link to="/">Back to store</Link>
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-xl border bg-card p-6">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Work email</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Checking access…" : "Sign in"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Staff accounts are ordinary customer accounts with a role assigned by a super admin.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
