import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, ShoppingBag, User2, Heart, LogOut } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/shop", label: "Shop" },
  { to: "/shop", label: "Frames", search: { frame: "black_wood" } },
  { to: "/about", label: "Our craft" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const { user } = useAuth();
  const { cart } = useCart();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const count = cart?.itemCount ?? 0;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-6">
            <SheetTitle className="eyebrow mb-6">Frame Cart</SheetTitle>
            <nav className="flex flex-col gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-3 text-lg transition-colors hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/account/orders"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-3 text-lg transition-colors hover:bg-muted"
              >
                My orders
              </Link>
            </nav>
          </SheetContent>
        </Sheet>

        <Link to="/" className="mr-auto flex items-baseline gap-2">
          <span className="font-display text-xl tracking-tight">FRAME CART</span>
          <span className="hidden text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground sm:inline">
            India
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-sm text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-2 flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild aria-label="Wishlist">
            <Link to="/account/wishlist">
              <Heart className="size-5" />
            </Link>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account">
                  <User2 className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/account">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account/orders">My orders</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account/addresses">Addresses</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="icon" asChild aria-label="Sign in">
              <Link to="/auth">
                <User2 className="size-5" />
              </Link>
            </Button>
          )}

          <Button variant="ghost" size="icon" asChild aria-label={`Cart, ${count} items`}>
            <Link to="/cart" className="relative">
              <ShoppingBag className="size-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-accent text-[0.6rem] font-semibold text-accent-foreground">
                  {count}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
