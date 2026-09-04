import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { formatINR } from "@/lib/money";

export interface ProductCardProduct {
  slug: string;
  name: string;
  tagline?: string | null;
  basePrice: number;
  compareAtPrice?: number | null;
  rating?: number;
  reviewCount?: number;
  badge?: string | null;
  images: string[];
  stockQuantity?: number;
}

export function ProductCard({ product }: { product: ProductCardProduct }) {
  const soldOut = (product.stockQuantity ?? 1) <= 0;
  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="group block focus-visible:focus-ring"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
            Image coming soon
          </div>
        )}
        {product.badge && !soldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em]">
            {product.badge}
          </span>
        )}
        {soldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-foreground px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-background">
            Sold out
          </span>
        )}
      </div>
      <div className="mt-4 space-y-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base leading-snug">{product.name}</h3>
          {product.rating ? (
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <Star className="size-3 fill-accent text-accent" />
              {product.rating.toFixed(1)}
            </span>
          ) : null}
        </div>
        {product.tagline && (
          <p className="line-clamp-1 text-sm text-muted-foreground">{product.tagline}</p>
        )}
        <p className="pt-1 text-sm">
          <span className="font-medium">{formatINR(product.basePrice)}</span>
          {product.compareAtPrice ? (
            <span className="ml-2 text-muted-foreground line-through">
              {formatINR(product.compareAtPrice)}
            </span>
          ) : null}
        </p>
      </div>
    </Link>
  );
}
