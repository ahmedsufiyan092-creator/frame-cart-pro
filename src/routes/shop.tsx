import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getStorefront } from "@/lib/catalog.functions";
import { SiteShell } from "@/components/site/site-shell";
import { ProductCard } from "@/components/site/product-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop custom photo frames — Frame Cart" },
      {
        name: "description",
        content:
          "Browse the full Frame Cart collection: black wood, champagne gold, natural oak and classic white frames in four sizes.",
      },
      { property: "og:title", content: "Shop custom photo frames — Frame Cart" },
      {
        property: "og:description",
        content: "Browse the full Frame Cart collection of handmade custom frames.",
      },
    ],
  }),
  component: Shop,
});

function Shop() {
  const fetchStorefront = useServerFn(getStorefront);
  const { data, isLoading } = useQuery({
    queryKey: ["storefront"],
    queryFn: () => fetchStorefront(),
  });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("featured");

  const products = useMemo(() => {
    let list = data?.products ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || (p.tagline ?? "").toLowerCase().includes(q),
      );
    }
    if (category !== "all") {
      list = list.filter((p) => p.categories.some((c) => c.slug === category));
    }
    const sorted = [...list];
    if (sort === "price-asc") sorted.sort((a, b) => a.basePrice - b.basePrice);
    if (sort === "price-desc") sorted.sort((a, b) => b.basePrice - a.basePrice);
    if (sort === "rating") sorted.sort((a, b) => b.rating - a.rating);
    return sorted;
  }, [data, search, category, sort]);

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="eyebrow">The collection</p>
        <h1 className="mt-2 text-4xl">All frames</h1>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search frames"
            aria-label="Search frames"
            className="sm:max-w-xs"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="sm:w-52" aria-label="Filter by category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(data?.categories ?? []).map((c: any) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="sm:w-48" aria-label="Sort products">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="price-asc">Price: low to high</SelectItem>
              <SelectItem value="price-desc">Price: high to low</SelectItem>
              <SelectItem value="rating">Top rated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[4/5] w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))
            : products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>

        {!isLoading && products.length === 0 && (
          <div className="py-24 text-center">
            <h2 className="text-xl">Nothing matches that yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a different search or clear your filters.
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => {
                setSearch("");
                setCategory("all");
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </SiteShell>
  );
}
