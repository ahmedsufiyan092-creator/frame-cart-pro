import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { SiteShell } from "@/components/site/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { placeOrder } from "@/lib/checkout.functions";
import { formatINR } from "@/lib/money";
import { getGuestToken, getStoredCoupon, setStoredCoupon } from "@/lib/guest";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Frame Cart" },
      { name: "description", content: "Secure checkout with UPI, cards, net banking and wallets." },
      { property: "og:title", content: "Checkout — Frame Cart" },
      { property: "og:description", content: "Secure Razorpay checkout for your custom frames." },
    ],
  }),
  component: Checkout,
});

declare global {
  interface Window {
    Razorpay?: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function Checkout() {
  const { cart, refetch } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const submit = useServerFn(placeOrder);

  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<"razorpay" | "cod">("razorpay");
  const [form, setForm] = useState({
    fullName: "",
    email: user?.email ?? "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  if (!cart || cart.lines.length === 0) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <h1 className="text-2xl">Your cart is empty</h1>
          <Button asChild className="mt-6">
            <Link to="/shop">Browse frames</Link>
          </Button>
        </div>
      </SiteShell>
    );
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const guestToken = getGuestToken();
      const order = (await submit({
        data: {
          guestToken,
          couponCode: getStoredCoupon(),
          paymentMethod: method,
          contact: { email: form.email, phone: form.phone, fullName: form.fullName },
          shipping: {
            line1: form.line1,
            line2: form.line2,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
            country: "India",
          },
        },
      })) as { orderId: string; orderNumber: string; amount: number };

      if (method === "cod") {
        setStoredCoupon(null);
        await refetch();
        navigate({ to: "/order/$orderId", params: { orderId: order.orderId } });
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionData.session)
        headers["Authorization"] = `Bearer ${sessionData.session.access_token}`;

      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers,
        body: JSON.stringify({ orderId: order.orderId, guestToken }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Could not start the payment.");

      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Could not load the payment window. Check your connection.");

      const rzp = new window.Razorpay({
        key: payload.keyId,
        amount: payload.amount,
        currency: payload.currency,
        name: "Frame Cart",
        description: `Order ${payload.orderNumber}`,
        order_id: payload.razorpayOrderId,
        prefill: { name: form.fullName, email: form.email, contact: form.phone },
        theme: { color: "#1a1a1a" },
        handler: async (response: any) => {
          const verify = await fetch("/api/payments/verify", {
            method: "POST",
            headers,
            body: JSON.stringify({
              orderId: order.orderId,
              guestToken,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verified = await verify.json();
          if (!verify.ok) {
            toast.error(verified.error ?? "Payment could not be verified.");
            navigate({ to: "/order/$orderId", params: { orderId: order.orderId } });
            return;
          }
          setStoredCoupon(null);
          await refetch();
          navigate({ to: "/order/$orderId", params: { orderId: order.orderId } });
        },
        modal: {
          ondismiss: () => {
            toast("Payment cancelled — you can retry from your order page.");
            navigate({ to: "/order/$orderId", params: { orderId: order.orderId } });
          },
        },
      });
      rzp.open();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl">Checkout</h1>

        <form onSubmit={pay} className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
          <div className="space-y-8">
            <section className="space-y-4">
              <p className="eyebrow">Contact</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" required value={form.fullName} onChange={set("fullName")} />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" required value={form.phone} onChange={set("phone")} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={set("email")}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <p className="eyebrow">Delivery address</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="line1">Address</Label>
                  <Input id="line1" required value={form.line1} onChange={set("line1")} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="line2">Apartment, landmark (optional)</Label>
                  <Input id="line2" value={form.line2} onChange={set("line2")} />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" required value={form.city} onChange={set("city")} />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input id="state" required value={form.state} onChange={set("state")} />
                </div>
                <div>
                  <Label htmlFor="pincode">PIN code</Label>
                  <Input
                    id="pincode"
                    required
                    inputMode="numeric"
                    pattern="\d{6}"
                    value={form.pincode}
                    onChange={set("pincode")}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <p className="eyebrow">Payment</p>
              <RadioGroup
                value={method}
                onValueChange={(v) => setMethod(v as "razorpay" | "cod")}
                className="gap-3"
              >
                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-4">
                  <RadioGroupItem value="razorpay" id="razorpay" className="mt-1" />
                  <span>
                    <span className="block font-medium">Pay online</span>
                    <span className="block text-sm text-muted-foreground">
                      UPI, cards, net banking and wallets via Razorpay
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-4">
                  <RadioGroupItem value="cod" id="cod" className="mt-1" />
                  <span>
                    <span className="block font-medium">Cash on delivery</span>
                    <span className="block text-sm text-muted-foreground">
                      A small handling fee applies
                    </span>
                  </span>
                </label>
              </RadioGroup>
            </section>
          </div>

          <aside className="surface-card h-fit p-6">
            <p className="eyebrow">Order summary</p>
            <ul className="mt-4 space-y-3 text-sm">
              {cart.lines.map((l) => (
                <li key={l.cartItemId} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    {l.name} × {l.quantity}
                    <span className="block text-xs">
                      {l.sizeLabel} · {l.frameName}
                    </span>
                  </span>
                  <span>{formatINR(l.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatINR(cart.subtotal)}</dd>
              </div>
              {cart.discount > 0 && (
                <div className="flex justify-between text-success">
                  <dt>Discount</dt>
                  <dd>−{formatINR(cart.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd>{cart.shipping === 0 ? "Free" : formatINR(cart.shipping)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex justify-between border-t border-border pt-4">
              <span>Total</span>
              <span className="font-display text-xl">{formatINR(cart.total)}</span>
            </div>
            <Button type="submit" size="lg" className="mt-6 w-full" disabled={busy}>
              {busy ? "Processing…" : method === "cod" ? "Place order" : "Pay securely"}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              The final amount is recalculated on our server before payment.
            </p>
          </aside>
        </form>
      </div>
    </SiteShell>
  );
}
