import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { SiteShell } from "@/components/site/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteAddress, listAddresses, saveAddress } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/account/addresses")({
  head: () => ({
    meta: [
      { title: "Your addresses — Frame Cart" },
      { name: "description", content: "Manage saved delivery addresses." },
      { property: "og:title", content: "Your addresses — Frame Cart" },
      { property: "og:description", content: "Manage saved delivery addresses." },
    ],
  }),
  component: AddressesPage,
});

const EMPTY = {
  full_name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  is_default: false,
};

function AddressesPage() {
  const fetchAddresses = useServerFn(listAddresses);
  const save = useServerFn(saveAddress);
  const remove = useServerFn(deleteAddress);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => fetchAddresses({}),
  });

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const create = useMutation({
    mutationFn: () => save({ data: form }),
    onSuccess: () => {
      setForm(EMPTY);
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      toast.success("Address saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
  });

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <p className="eyebrow">Account</p>
        <h1 className="mt-2 text-3xl">Addresses</h1>

        {isLoading ? (
          <Skeleton className="mt-8 h-24 w-full" />
        ) : (
          <ul className="mt-8 space-y-3">
            {(data ?? []).map((a: any) => (
              <li key={a.id} className="surface-card flex justify-between gap-4 p-4 text-sm">
                <div>
                  <p className="font-medium">{a.full_name}</p>
                  <p className="text-muted-foreground">
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}
                  </p>
                  <p className="text-xs text-muted-foreground">{a.phone}</p>
                </div>
                <button
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => del.mutate(a.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="surface-card mt-8 space-y-4 p-6">
          <p className="eyebrow">Add an address</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="a-name">Full name</Label>
              <Input id="a-name" value={form.full_name} onChange={set("full_name")} />
            </div>
            <div>
              <Label htmlFor="a-phone">Phone</Label>
              <Input id="a-phone" value={form.phone} onChange={set("phone")} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="a-line1">Address</Label>
              <Input id="a-line1" value={form.line1} onChange={set("line1")} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="a-line2">Apartment, landmark</Label>
              <Input id="a-line2" value={form.line2} onChange={set("line2")} />
            </div>
            <div>
              <Label htmlFor="a-city">City</Label>
              <Input id="a-city" value={form.city} onChange={set("city")} />
            </div>
            <div>
              <Label htmlFor="a-state">State</Label>
              <Input id="a-state" value={form.state} onChange={set("state")} />
            </div>
            <div>
              <Label htmlFor="a-pin">PIN code</Label>
              <Input id="a-pin" value={form.pincode} onChange={set("pincode")} />
            </div>
          </div>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Save address"}
          </Button>
        </div>
      </div>
    </SiteShell>
  );
}
