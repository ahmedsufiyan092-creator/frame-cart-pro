import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listNotifications } from "@/lib/admin-extra.functions";
import { AdminPage, Panel, Loading, ErrorNote, Empty, StatusPill } from "@/components/admin/panel";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Frame Cart admin" },
      { name: "description", content: "Delivery log for customer messages." },
      { property: "og:title", content: "Notifications — Frame Cart admin" },
      { property: "og:description", content: "Delivery log for customer messages." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminNotifications,
});

function AdminNotifications() {
  const fetchNotifications = useServerFn(listNotifications);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => fetchNotifications({}),
    retry: false,
  });

  return (
    <AdminPage
      title="Notifications"
      description="Messages are only marked sent when a provider actually accepted them."
    >
      {error ? <ErrorNote error={error} /> : null}
      {isLoading ? (
        <Loading />
      ) : (
        <Panel>
          {(data ?? []).length === 0 ? (
            <Empty>No messages queued yet.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2">Channel</th>
                    <th>Template</th>
                    <th>Recipient</th>
                    <th>Status</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data ?? []).map((n: any) => (
                    <tr key={n.id}>
                      <td className="py-2 capitalize">{n.channel}</td>
                      <td className="text-xs">{n.template}</td>
                      <td className="text-xs">{n.recipient ?? "—"}</td>
                      <td>
                        <StatusPill status={n.status} />
                        {n.error ? (
                          <span className="block text-xs text-destructive">{n.error}</span>
                        ) : null}
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </AdminPage>
  );
}
