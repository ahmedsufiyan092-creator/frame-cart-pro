import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { SiteShell } from "@/components/site/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/use-cart";
import { formatINR } from "@/lib/money";
import { getStoredCoupon } from "@/lib/guest";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — Frame Cart" },
      { name: "description", content: "Review your custom frames before checkout." },
      { property: "og:title", content: "Your cart — Frame Cart" },
      { property: "og:description", content: "Review your custom frames before checkout." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { cart, isLoading, setQuantity, removeItem, applyCoupon } = useCart();
  const [code, setCode] = useState(getStoredCoupon() ?? "");

  if (isLoading) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-4xl space-y-4 px-4 py-12 sm:px-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </SiteShell>
    );
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
          <p className="eyebrow">Your cart</p>
          <h1 className="mt-3 text-3xl">Nothing framed yet</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Pick a piece, choose your size and finish, and it will show up here.
          </p>
          <Button asChild className="mt-8">
            <Link to="/shop">Browse the collection</Link>
          </Button>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl">Your cart</h1>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
          <ul className="space-y-5">
            {cart.lines.map((line) => (
              <li key={line.cartItemId} className="flex gap-4 border-b border-border pb-5">
                <div className="size-24 shrink-0 overflow-hidden rounded-md bg-muted">
                  {line.image && (
                    <img
                      src={line.image}
                      alt={line.name}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-medium">{line.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {line.sizeLabel} · {line.frameName}
                      </p>
                    </div>
                    <p className="text-sm font-medium">{formatINR(line.lineTotal)}</p>
                  </div>

                  {!line.inStock && (
                    <p className="mt-1 text-xs text-destructive">
                      Only {line.stockQuantity} left — reduce the quantity to continue.
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex items-center rounded-md border border-border">
                      <button
                        aria-label="Decrease quantity"
                        className="px-2 py-1.5"
                        onClick={() =>
                          setQuantity.mutate({
                            cartItemId: line.cartItemId,
                            quantity: line.quantity - 1,
                          })
                        }
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm">{line.quantity}</span>
                      <button
                        aria-label="Increase quantity"
                        className="px-2 py-1.5"
                        onClick={() =>
                          setQuantity.mutate({
                            cartItemId: line.cartItemId,
                            quantity: line.quantity + 1,
                          })
                        }
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <button
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem.mutate(line.cartItemId)}
                    >
                      <Trash2 className="size-3.5" /> Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="surface-card h-fit p-6">
            <p className="eyebrow">Summary</p>
            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatINR(cart.subtotal)}</dd>
              </div>
              {cart.discount > 0 && (
                <div className="flex justify-between text-success">
                  <dt>Discount {cart.couponCode ? `(${cart.couponCode})` : ""}</dt>
                  <dd>−{formatINR(cart.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd>{cart.shipping === 0 ? "Free" : formatINR(cart.shipping)}</dd>
              </div>
              {cart.tax > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tax</dt>
                  <dd>{formatINR(cart.tax)}</dd>
                </div>
              )}
            </dl>

            {cart.amountToFreeShipping > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Add {formatINR(cart.amountToFreeShipping)} more for free shipping.
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Coupon code"
                aria-label="Coupon code"
              />
              <Button
                variant="outline"
                onClick={() => applyCoupon.mutate(code || null)}
                disabled={applyCoupon.isPending}
              >
                Apply
              </Button>
            </div>
            {cart.couponMessage && (
              <p className="mt-2 text-xs text-muted-foreground">{cart.couponMessage}</p>
            )}

            <div className="mt-6 flex justify-between border-t border-border pt-4 text-base">
              <span>Total</span>
              <span className="font-display text-xl">{formatINR(cart.total)}</span>
            </div>

            <Button
              asChild
              size="lg"
              className="mt-5 w-full"
              disabled={cart.lines.some((l) => !l.inStock)}
            >
              <Link to="/checkout">Checkout</Link>
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Prices are confirmed on the server at checkout.
            </p>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}
