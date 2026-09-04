import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const guestSchema = z.object({
  guestToken: z.string().uuid().nullable().optional(),
  couponCode: z.string().max(40).nullable().optional(),
});

async function resolveCart(guestToken: string | null | undefined) {
  const { db, optionalUser } = await import("./auth.server");
  const user = await optionalUser();

  if (user) {
    const { data: existing } = await db
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) return { db, user, cartId: (existing as any).id as string };
    const { data: created } = await db
      .from("carts")
      .insert({ user_id: user.id })
      .select("id")
      .maybeSingle();
    return { db, user, cartId: (created as any).id as string };
  }

  if (!guestToken) return { db, user: null, cartId: null };
  const { data: existing } = await db
    .from("carts")
    .select("id")
    .eq("guest_token", guestToken)
    .maybeSingle();
  if (existing) return { db, user: null, cartId: (existing as any).id as string };
  const { data: created } = await db
    .from("carts")
    .insert({ guest_token: guestToken })
    .select("id")
    .maybeSingle();
  return { db, user: null, cartId: (created as any).id as string };
}

export const getCart = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => guestSchema.parse(input ?? {}))
  .handler(async ({ data }) => {
    const { priceCart, emptyCart } = await import("./store.server");
    const { db, user, cartId } = await resolveCart(data.guestToken ?? null);
    if (!cartId) return emptyCart();
    return priceCart(db, cartId, {
      couponCode: data.couponCode ?? null,
      userId: user?.id ?? null,
    });
  });

export const addToCart = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    guestSchema
      .extend({
        productId: z.string().uuid(),
        sizeId: z.string().min(1).max(40),
        frameId: z.string().min(1).max(40),
        quantity: z.number().int().min(1).max(20),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { priceCart } = await import("./store.server");
    const { db, user, cartId } = await resolveCart(data.guestToken ?? null);
    if (!cartId) throw new Error("Could not open a cart. Please refresh and try again.");

    const { data: product } = await db
      .from("products")
      .select("id, status")
      .eq("id", data.productId)
      .maybeSingle();
    if (!product || (product as any).status !== "active")
      throw new Error("This piece is no longer available.");

    const { data: existing } = await db
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cartId)
      .eq("product_id", data.productId)
      .eq("size_id", data.sizeId)
      .eq("frame_id", data.frameId)
      .maybeSingle();

    if (existing) {
      await db
        .from("cart_items")
        .update({ quantity: Math.min((existing as any).quantity + data.quantity, 20) })
        .eq("id", (existing as any).id);
    } else {
      await db.from("cart_items").insert({
        cart_id: cartId,
        product_id: data.productId,
        size_id: data.sizeId,
        frame_id: data.frameId,
        quantity: data.quantity,
      });
    }

    return priceCart(db, cartId, {
      couponCode: data.couponCode ?? null,
      userId: user?.id ?? null,
    });
  });

export const updateCartItem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    guestSchema
      .extend({ cartItemId: z.string().uuid(), quantity: z.number().int().min(0).max(20) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { priceCart, emptyCart } = await import("./store.server");
    const { db, user, cartId } = await resolveCart(data.guestToken ?? null);
    if (!cartId) return emptyCart();

    // Ownership check — prevents editing someone else's cart line (IDOR).
    const { data: item } = await db
      .from("cart_items")
      .select("id, cart_id")
      .eq("id", data.cartItemId)
      .maybeSingle();
    if (!item || (item as any).cart_id !== cartId) throw new Error("Item not found in your cart.");

    if (data.quantity === 0) {
      await db.from("cart_items").delete().eq("id", data.cartItemId);
    } else {
      await db.from("cart_items").update({ quantity: data.quantity }).eq("id", data.cartItemId);
    }

    return priceCart(db, cartId, {
      couponCode: data.couponCode ?? null,
      userId: user?.id ?? null,
    });
  });

export const removeCartItem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    guestSchema.extend({ cartItemId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { priceCart, emptyCart } = await import("./store.server");
    const { db, user, cartId } = await resolveCart(data.guestToken ?? null);
    if (!cartId) return emptyCart();

    const { data: item } = await db
      .from("cart_items")
      .select("id, cart_id")
      .eq("id", data.cartItemId)
      .maybeSingle();
    if (!item || (item as any).cart_id !== cartId) throw new Error("Item not found in your cart.");

    await db.from("cart_items").delete().eq("id", data.cartItemId);
    return priceCart(db, cartId, {
      couponCode: data.couponCode ?? null,
      userId: user?.id ?? null,
    });
  });

export const clearCart = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => guestSchema.parse(input ?? {}))
  .handler(async ({ data }) => {
    const { priceCart, emptyCart } = await import("./store.server");
    const { db, user, cartId } = await resolveCart(data.guestToken ?? null);
    if (!cartId) return emptyCart();
    await db.from("cart_items").delete().eq("cart_id", cartId);
    return priceCart(db, cartId, { userId: user?.id ?? null });
  });

/** Called right after sign-in: folds the guest cart into the customer cart. */
export const mergeGuestCart = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ guestToken: z.string().uuid().nullable() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { db, requireUser } = await import("./auth.server");
    const { priceCart } = await import("./store.server");
    const user = await requireUser();

    const { cartId } = await resolveCart(null);
    if (!cartId) throw new Error("Cart unavailable.");

    if (data.guestToken) {
      const { data: guestCart } = await db
        .from("carts")
        .select("id")
        .eq("guest_token", data.guestToken)
        .maybeSingle();
      if (guestCart && (guestCart as any).id !== cartId) {
        const { data: guestItems } = await db
          .from("cart_items")
          .select("product_id, size_id, frame_id, quantity")
          .eq("cart_id", (guestCart as any).id);
        for (const gi of (guestItems ?? []) as any[]) {
          const { data: existing } = await db
            .from("cart_items")
            .select("id, quantity")
            .eq("cart_id", cartId)
            .eq("product_id", gi.product_id)
            .eq("size_id", gi.size_id)
            .eq("frame_id", gi.frame_id)
            .maybeSingle();
          if (existing) {
            await db
              .from("cart_items")
              .update({ quantity: Math.min((existing as any).quantity + gi.quantity, 20) })
              .eq("id", (existing as any).id);
          } else {
            await db.from("cart_items").insert({ ...gi, cart_id: cartId });
          }
        }
        await db.from("carts").delete().eq("id", (guestCart as any).id);
      }
    }

    return priceCart(db, cartId, { userId: user.id });
  });
