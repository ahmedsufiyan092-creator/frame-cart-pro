import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAuditLogs } from "@/lib/admin.functions";
import { AdminPage, Panel, Loading, ErrorNote, Empty } from "@/components/admin/panel";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({
    meta: [
      { title: "Activity log — Frame Cart admin" },
      { name: "description", content: "Recent staff actions on the store." },
      { property: "og:title", content: "Activity log — Frame Cart admin" },
      { property: "og:description", content: "Recent staff actions on the store." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminAudit,
});

function AdminAudit() {
  const fetchLogs = useServerFn(listAuditLogs);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-audit"],
    queryFn: () => fetchLogs({}),
    retry: false,
  });

  return (
    <AdminPage title="Activity log" description="The last 100 recorded staff actions.">
      {error ? <ErrorNote error={error} /> : null}
      {isLoading ? (
        <Loading />
      ) : (
        <Panel>
          {(data ?? []).length === 0 ? (
            <Empty>Nothing recorded yet.</Empty>
          ) : (
            <ul className="divide-y text-sm">
              {(data ?? []).map((l: any) => (
                <li key={l.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>
                    {l.action}
                    <span className="block text-xs text-muted-foreground">
                      {l.entity_type ?? "—"} {l.entity_id ?? ""}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(l.created_at).toLocaleString("en-IN")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </AdminPage>
  );
}
