import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-display text-2xl">FRAME CART</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Gallery-grade custom photo frames, hand-finished in India and delivered to your wall.
            Museum matting, archival print, real wood.
          </p>
        </div>
        <div>
          <p className="eyebrow">Shop</p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/shop" className="hover:text-foreground">
                All frames
              </Link>
            </li>
            <li>
              <Link to="/cart" className="hover:text-foreground">
                Cart
              </Link>
            </li>
            <li>
              <Link to="/account/orders" className="hover:text-foreground">
                Track an order
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">Company</p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/about" className="hover:text-foreground">
                Our craft
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-foreground">
                Contact
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Frame Cart. All rights reserved.</p>
          <p>Payments secured by Razorpay · UPI · Cards · Net banking · Wallets</p>
        </div>
      </div>
    </footer>
  );
}
