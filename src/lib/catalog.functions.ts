import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  rating: number;
  reviewCount: number;
  stockQuantity: number;
  badge: string | null;
  images: string[];
  categories: { slug: string; name: string }[];
}

export const getStorefront = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await import("./auth.server");

  const [{ data: products }, { data: categories }, { data: sizes }, { data: frames }] =
    await Promise.all([
      db
        .from("products")
        .select(
          "id, slug, name, tagline, description, base_price, compare_at_price, rating, review_count, stock_quantity, badge, created_at, product_images(url, sort_order), product_categories(categories(slug, name))",
        )
        .eq("status", "active")
        .order("created_at", { ascending: true }),
      db.from("categories").select("id, slug, name, description, image_url").order("sort_order"),
      db.from("size_options").select("*").order("sort_order"),
      db.from("frame_options").select("*").order("sort_order"),
    ]);

  const mapped: CatalogProduct[] = ((products ?? []) as any[]).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    basePrice: Number(p.base_price),
    compareAtPrice: p.compare_at_price != null ? Number(p.compare_at_price) : null,
    rating: Number(p.rating ?? 0),
    reviewCount: p.review_count ?? 0,
    stockQuantity: p.stock_quantity ?? 0,
    badge: p.badge,
    images: (p.product_images ?? [])
      .slice()
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((i: any) => i.url),
    categories: (p.product_categories ?? [])
      .map((pc: any) => pc.categories)
      .filter(Boolean)
      .map((c: any) => ({ slug: c.slug, name: c.name })),
  }));

  return {
    products: mapped,
    categories: (categories ?? []) as any[],
    sizes: ((sizes ?? []) as any[]).map((s) => ({
      id: s.id,
      label: s.label,
      dimensions: s.dimensions,
      priceModifier: Number(s.price_modifier),
    })),
    frames: ((frames ?? []) as any[]).map((f) => ({
      id: f.id,
      name: f.name,
      swatch: f.swatch,
      priceModifier: Number(f.price_modifier),
    })),
  };
});

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const { db } = await import("./auth.server");

    const { data: product } = await db
      .from("products")
      .select(
        "id, slug, name, tagline, description, base_price, compare_at_price, rating, review_count, stock_quantity, badge, status, product_images(url, sort_order, kind), product_categories(categories(slug, name))",
      )
      .eq("slug", data.slug)
      .eq("status", "active")
      .maybeSingle();

    if (!product) return null;

    const [{ data: variants }, { data: reviews }, { data: sizes }, { data: frames }] =
      await Promise.all([
        db
          .from("product_variants")
          .select("size_id, frame_id, stock_quantity, price_override")
          .eq("product_id", (product as any).id),
        db
          .from("reviews")
          .select("id, rating, title, body, created_at, author_name")
          .eq("product_id", (product as any).id)
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(20),
        db.from("size_options").select("*").order("sort_order"),
        db.from("frame_options").select("*").order("sort_order"),
      ]);

    const p = product as any;
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      basePrice: Number(p.base_price),
      compareAtPrice: p.compare_at_price != null ? Number(p.compare_at_price) : null,
      rating: Number(p.rating ?? 0),
      reviewCount: p.review_count ?? 0,
      stockQuantity: p.stock_quantity ?? 0,
      badge: p.badge,
      images: (p.product_images ?? [])
        .slice()
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((i: any) => i.url),
      categories: (p.product_categories ?? [])
        .map((pc: any) => pc.categories)
        .filter(Boolean)
        .map((c: any) => ({ slug: c.slug, name: c.name })),
      variants: ((variants ?? []) as any[]).map((v) => ({
        sizeId: v.size_id,
        frameId: v.frame_id,
        stockQuantity: v.stock_quantity,
        priceOverride: v.price_override != null ? Number(v.price_override) : null,
      })),
      reviews: ((reviews ?? []) as any[]).map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        authorName: r.author_name ?? "Verified buyer",
        createdAt: r.created_at,
      })),
      sizes: ((sizes ?? []) as any[]).map((s) => ({
        id: s.id,
        label: s.label,
        dimensions: s.dimensions,
        priceModifier: Number(s.price_modifier),
      })),
      frames: ((frames ?? []) as any[]).map((f) => ({
        id: f.id,
        name: f.name,
        swatch: f.swatch,
        priceModifier: Number(f.price_modifier),
      })),
    };
  });
