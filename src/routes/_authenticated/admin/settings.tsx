import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStoreSettings, saveStoreSetting } from "@/lib/admin-extra.functions";
import { AdminPage, Panel, Loading, ErrorNote } from "@/components/admin/panel";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({
    meta: [
      { title: "Store settings — Frame Cart admin" },
      { name: "description", content: "Shipping, contact and policy settings." },
      { property: "og:title", content: "Store settings — Frame Cart admin" },
      { property: "og:description", content: "Shipping, contact and policy settings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSettings,
});

function AdminSettings() {
  const fetchSettings = useServerFn(getStoreSettings);
  const save = useServerFn(saveStoreSetting);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => fetchSettings({}),
    retry: false,
  });

  const [shipping, setShipping] = useState({ flatRate: "", freeAbove: "" });
  const [contact, setContact] = useState({ email: "", phone: "" });

  useEffect(() => {
    if (!data) return;
    setShipping({
      flatRate: String(data['shipping']?.flatRate ?? ""),
      freeAbove: String(data['shipping']?.freeAbove ?? ""),
    });
    setContact({
      email: String(data['contact']?.email ?? ""),
      phone: String(data['contact']?.phone ?? ""),
    });
  }, [data]);

  const mutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: Record<string, unknown> }) =>
      save({ data: { key, value } }),
    onSuccess: () => {
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminPage title="Store settings" description="Values used by checkout and customer messages.">
      {error ? <ErrorNote error={error} /> : null}
      {isLoading ? (
        <Loading />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Shipping">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate({
                  key: "shipping",
                  value: {
                    flatRate: Number(shipping.flatRate) || 0,
                    freeAbove: Number(shipping.freeAbove) || 0,
                  },
                });
              }}
            >
              <div className="space-y-1">
                <Label>Flat delivery charge (₹)</Label>
                <Input
                  value={shipping.flatRate}
                  onChange={(e) => setShipping({ ...shipping, flatRate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Free delivery above (₹)</Label>
                <Input
                  value={shipping.freeAbove}
                  onChange={(e) => setShipping({ ...shipping, freeAbove: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={mutation.isPending}>
                Save shipping
              </Button>
            </form>
          </Panel>

          <Panel title="Contact details">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate({ key: "contact", value: { ...contact } });
              }}
            >
              <div className="space-y-1">
                <Label>Support email</Label>
                <Input
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Support phone</Label>
                <Input
                  value={contact.phone}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={mutation.isPending}>
                Save contact
              </Button>
            </form>
          </Panel>
        </div>
      )}
    </AdminPage>
  );
}
