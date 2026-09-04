import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getStorefront } from "@/lib/catalog.functions";
import { SiteShell } from "@/components/site/site-shell";
import { ProductCard } from "@/components/site/product-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import hero from "@/assets/hero-gallery-wall.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Frame Cart — Custom photo frames, handmade in India" },
      {
        name: "description",
        content:
          "Turn your photographs into gallery-grade framed art. Archival prints, museum matting and real wood frames, delivered across India.",
      },
      { property: "og:title", content: "Frame Cart — Custom photo frames, handmade in India" },
      {
        property: "og:description",
        content: "Archival prints, museum matting and real wood frames, delivered across India.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const fetchStorefront = useServerFn(getStorefront);
  const { data, isLoading } = useQuery({
    queryKey: ["storefront"],
    queryFn: () => fetchStorefront(),
  });

  return (
    <SiteShell>
      <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-10 sm:px-6 md:grid-cols-2 md:items-center md:gap-14 md:pt-16">
        <div>
          <p className="eyebrow">Custom framing · Made in India</p>
          <h1 className="mt-5 text-4xl leading-[1.05] sm:text-5xl md:text-6xl">
            Your photographs,
            <br />
            framed like art.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            Archival giclée printing, acid-free museum matting and solid wood mouldings —
            hand-assembled and shipped ready to hang.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/shop">Start framing</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/about">See the craft</Link>
            </Button>
          </div>
          <div className="mt-10 flex gap-8 text-sm text-muted-foreground">
            <div>
              <p className="font-display text-2xl text-foreground">4.8/5</p>
              <p>Customer rating</p>
            </div>
            <div>
              <p className="font-display text-2xl text-foreground">₹1,499+</p>
              <p>Free shipping</p>
            </div>
            <div>
              <p className="font-display text-2xl text-foreground">7 days</p>
              <p>Easy returns</p>
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl shadow-frame">
          <img
            src={hero}
            alt="Three custom photo frames on an ivory wall in an Indian living room"
            width={1600}
            height={1200}
            className="size-full object-cover"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">The collection</p>
            <h2 className="mt-2 text-3xl">Bestselling frames</h2>
          </div>
          <Link to="/shop" className="text-sm underline underline-offset-4">
            View all
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[4/5] w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))
            : (data?.products ?? [])
                .slice(0, 8)
                .map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </SiteShell>
  );
}
