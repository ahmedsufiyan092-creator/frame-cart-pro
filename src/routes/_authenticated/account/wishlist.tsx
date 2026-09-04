import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteShell } from "@/components/site/site-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listWishlist } from "@/lib/account.functions";
import { formatINR } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/account/wishlist")({
  head: () => ({
    meta: [
      { title: "Your wishlist — Frame Cart" },
      { name: "description", content: "Frames you saved for later." },
      { property: "og:title", content: "Your wishlist — Frame Cart" },
      { property: "og:description", content: "Frames you saved for later." },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const fetchWishlist = useServerFn(listWishlist);
  const { data, isLoading } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => fetchWishlist({}),
  });

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="eyebrow">Account</p>
        <h1 className="mt-2 text-3xl">Wishlist</h1>

        {isLoading ? (
          <Skeleton className="mt-8 h-28 w-full" />
        ) : (data ?? []).length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-muted-foreground">Nothing saved yet.</p>
            <Button asChild className="mt-6">
              <Link to="/shop">Browse frames</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {(data ?? []).map((item) =>
              item.product ? (
                <li key={item.id} className="surface-card flex items-center gap-4 p-4">
                  <div className="size-16 overflow-hidden rounded-md bg-muted">
                    {item.product.image && (
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatINR(item.product.basePrice)}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/product/$slug" params={{ slug: item.product.slug }}>
                      View
                    </Link>
                  </Button>
                </li>
              ) : null,
            )}
          </ul>
        )}
      </div>
    </SiteShell>
  );
}
