import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Star, Truck, ShieldCheck, RotateCcw } from "lucide-react";
import { getProductBySlug } from "@/lib/catalog.functions";
import { SiteShell } from "@/components/site/site-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/lib/money";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/product/$slug")({
  head: ({ params }) => {
    const title = `${params.slug.replace(/-/g, " ")} — Frame Cart`;
    return {
      meta: [
        { title },
        {
          name: "description",
          content:
            "Choose your size and frame finish, and we print, mat and assemble it by hand before shipping it ready to hang.",
        },
        { property: "og:title", content: title },
        {
          property: "og:description",
          content: "Custom framed art, printed and assembled by hand in India.",
        },
      ],
    };
  },
  component: ProductPage,
  notFoundComponent: () => (
    <SiteShell>
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl">We couldn't find that frame</h1>
        <Button asChild className="mt-6">
          <Link to="/shop">Back to the collection</Link>
        </Button>
      </div>
    </SiteShell>
  ),
});

function ProductPage() {
  const { slug } = Route.useParams();
  const fetchProduct = useServerFn(getProductBySlug);
  const { addItem } = useCart();

  const { data, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const product = await fetchProduct({ data: { slug } });
      if (!product) throw notFound();
      return product;
    },
  });

  const [sizeId, setSizeId] = useState<string | null>(null);
  const [frameId, setFrameId] = useState<string | null>(null);
  const [image, setImage] = useState(0);

  if (isLoading || !data) {
    return (
      <SiteShell>
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </SiteShell>
    );
  }

  const size = data.sizes.find((s) => s.id === (sizeId ?? data.sizes[0]?.id));
  const frame = data.frames.find((f) => f.id === (frameId ?? data.frames[0]?.id));
  const variant = data.variants.find(
    (v) => v.sizeId === size?.id && v.frameId === frame?.id,
  );
  const price =
    variant?.priceOverride ??
    data.basePrice + (size?.priceModifier ?? 0) + (frame?.priceModifier ?? 0);
  const stock = variant?.stockQuantity ?? data.stockQuantity;

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <nav className="text-xs text-muted-foreground">
          <Link to="/shop" className="hover:text-foreground">
            Collection
          </Link>
          <span className="mx-2">/</span>
          <span>{data.name}</span>
        </nav>

        <div className="mt-6 grid gap-10 md:grid-cols-2">
          <div>
            <div className="aspect-square overflow-hidden rounded-xl bg-muted">
              {data.images[image] && (
                <img
                  src={data.images[image]}
                  alt={data.name}
                  className="size-full object-cover"
                  width={1200}
                  height={1200}
                />
              )}
            </div>
            {data.images.length > 1 && (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                {data.images.map((src: string, i: number) => (
                  <button
                    key={src}
                    onClick={() => setImage(i)}
                    aria-label={`View image ${i + 1}`}
                    className={cn(
                      "size-16 shrink-0 overflow-hidden rounded-md border",
                      i === image ? "border-accent" : "border-border",
                    )}
                  >
                    <img src={src} alt="" loading="lazy" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h1 className="text-3xl sm:text-4xl">{data.name}</h1>
            {data.tagline && <p className="mt-2 text-muted-foreground">{data.tagline}</p>}
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="size-4 fill-accent text-accent" />
              {data.rating.toFixed(1)} · {data.reviewCount} reviews
            </div>

            <p className="mt-6 font-display text-3xl">{formatINR(price)}</p>
            <p className="text-xs text-muted-foreground">Inclusive of printing, matting and frame</p>

            <div className="mt-8">
              <p className="eyebrow">Size</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {data.sizes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSizeId(s.id)}
                    className={cn(
                      "rounded-md border px-3 py-3 text-left text-sm transition-colors",
                      s.id === size?.id
                        ? "border-foreground bg-secondary"
                        : "border-border hover:border-foreground/40",
                    )}
                  >
                    <span className="block font-medium">{s.label}</span>
                    <span className="block text-xs text-muted-foreground">{s.dimensions}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="eyebrow">Frame finish</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {data.frames.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFrameId(f.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-3 text-left text-sm transition-colors",
                      f.id === frame?.id
                        ? "border-foreground bg-secondary"
                        : "border-border hover:border-foreground/40",
                    )}
                  >
                    <span
                      className="size-4 rounded-full border border-border"
                      style={{ background: f.swatch ?? "transparent" }}
                    />
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            <Button
              size="lg"
              className="mt-8 w-full"
              disabled={stock <= 0 || addItem.isPending || !size || !frame}
              onClick={() =>
                size &&
                frame &&
                addItem.mutate({
                  productId: data.id,
                  sizeId: size.id,
                  frameId: frame.id,
                  quantity: 1,
                })
              }
            >
              {stock <= 0 ? "Sold out" : addItem.isPending ? "Adding…" : "Add to cart"}
            </Button>
            {stock > 0 && stock <= 5 && (
              <p className="mt-2 text-center text-xs text-warning-foreground">
                Only {stock} left in this combination
              </p>
            )}

            <div className="mt-8 grid gap-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Truck className="size-4" /> Free shipping over ₹1,499
              </p>
              <p className="flex items-center gap-2">
                <RotateCcw className="size-4" /> 7-day easy returns
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheck className="size-4" /> Secure payments via Razorpay
              </p>
            </div>

            {data.description && (
              <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
                {data.description}
              </p>
            )}
          </div>
        </div>

        <section className="mt-20">
          <h2 className="text-2xl">Reviews</h2>
          {data.reviews.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No reviews yet for this piece.
            </p>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {data.reviews.map((r) => (
                <div key={r.id} className="surface-card p-5">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "size-3.5",
                          i < r.rating ? "fill-accent text-accent" : "text-muted-foreground",
                        )}
                      />
                    ))}
                  </div>
                  {r.title && <p className="mt-2 font-medium">{r.title}</p>}
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
                  <p className="mt-3 text-xs text-muted-foreground">{r.authorName}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </SiteShell>
  );
}
