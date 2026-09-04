import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listPendingReviews, moderateReview } from "@/lib/admin.functions";
import { AdminPage, Panel, Loading, ErrorNote, Empty, StatusPill } from "@/components/admin/panel";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  head: () => ({
    meta: [
      { title: "Reviews — Frame Cart admin" },
      { name: "description", content: "Moderate customer reviews." },
      { property: "og:title", content: "Reviews — Frame Cart admin" },
      { property: "og:description", content: "Moderate customer reviews." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminReviews,
});

function AdminReviews() {
  const fetchReviews = useServerFn(listPendingReviews);
  const moderate = useServerFn(moderateReview);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: () => fetchReviews({}),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: ({ reviewId, status }: { reviewId: string; status: "approved" | "rejected" }) =>
      moderate({ data: { reviewId, status } }),
    onSuccess: () => {
      toast.success("Review updated");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminPage title="Reviews" description="Nothing appears on the storefront until approved.">
      {error ? <ErrorNote error={error} /> : null}
      {isLoading ? (
        <Loading />
      ) : (
        <Panel>
          {(data ?? []).length === 0 ? (
            <Empty>No reviews yet.</Empty>
          ) : (
            <ul className="divide-y">
              {(data ?? []).map((r: any) => (
                <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {"★".repeat(r.rating)} {r.title ?? ""}
                    </p>
                    <p className="text-sm text-muted-foreground">{r.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.author_name} · {r.products?.name ?? "Product"} ·{" "}
                      {new Date(r.created_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={r.status} />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ reviewId: r.id, status: "approved" })}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ reviewId: r.id, status: "rejected" })}
                    >
                      Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </AdminPage>
  );
}
