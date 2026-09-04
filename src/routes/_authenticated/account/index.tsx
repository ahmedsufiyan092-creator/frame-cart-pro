import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteShell } from "@/components/site/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProfile, updateProfile } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/account/")({
  head: () => ({
    meta: [
      { title: "Your profile — Frame Cart" },
      { name: "description", content: "Manage your Frame Cart profile details." },
      { property: "og:title", content: "Your profile — Frame Cart" },
      { property: "og:description", content: "Manage your Frame Cart profile details." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const fetchProfile = useServerFn(getProfile);
  const save = useServerFn(updateProfile);
  const { data } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile({}) });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (data) {
      setFullName(data.fullName ?? "");
      setPhone(data.phone ?? "");
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => save({ data: { fullName, phone } }),
    onSuccess: () => toast.success("Profile updated"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <p className="eyebrow">Account</p>
        <h1 className="mt-2 text-3xl">Your profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">{data?.email}</p>

        <div className="mt-8 space-y-4">
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/account/orders">My orders</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/account/addresses">Addresses</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/account/wishlist">Wishlist</Link>
          </Button>
          {data?.isStaff && (
            <Button asChild variant="outline">
              <Link to="/admin">Admin console</Link>
            </Button>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
