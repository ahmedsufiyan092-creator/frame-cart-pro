import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getIntegrationStatus } from "@/lib/admin.functions";
import { AdminPage, Panel, Loading, ErrorNote } from "@/components/admin/panel";

export const Route = createFileRoute("/_authenticated/admin/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — Frame Cart admin" },
      { name: "description", content: "Payment and messaging provider status." },
      { property: "og:title", content: "Integrations — Frame Cart admin" },
      { property: "og:description", content: "Payment and messaging provider status." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminIntegrations,
});

function Row({ label, ok, note }: { label: string; ok: boolean; note?: string }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2 text-sm">
      <span>
        {label}
        {note ? <span className="block text-xs text-muted-foreground">{note}</span> : null}
      </span>
      <span
        className={
          ok
            ? "rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
            : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
        }
      >
        {ok ? "Connected" : "Not configured"}
      </span>
    </li>
  );
}

function AdminIntegrations() {
  const fetchStatus = useServerFn(getIntegrationStatus);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-integrations"],
    queryFn: () => fetchStatus({}),
    retry: false,
  });

  return (
    <AdminPage
      title="Integrations"
      description="Live status read from server credentials — nothing is faked."
    >
      {error ? <ErrorNote error={error} /> : null}
      {isLoading ? (
        <Loading />
      ) : (
        <>
          <Panel title="Payments">
            <ul className="divide-y">
              <Row
                label="Razorpay API keys"
                ok={Boolean(data?.razorpay.keysConfigured)}
                note="Required to accept online payments."
              />
              <Row
                label="Razorpay webhook secret"
                ok={Boolean(data?.razorpay.webhookConfigured)}
                note="Required to confirm payments reliably."
              />
            </ul>
          </Panel>
          <Panel title="Customer messaging">
            <ul className="divide-y">
              {Object.entries(data?.notifications ?? {}).map(([key, value]: [string, any]) => (
                <Row
                  key={key}
                  label={key}
                  ok={Boolean(value?.configured ?? value)}
                  note={value?.note}
                />
              ))}
            </ul>
          </Panel>
        </>
      )}
    </AdminPage>
  );
}
