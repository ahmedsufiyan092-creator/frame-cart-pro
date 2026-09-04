import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const addressSchema = z.object({
  label: z.string().max(40).optional(),
  full_name: z.string().min(2).max(80),
  phone: z.string().min(8).max(20),
  line1: z.string().min(3).max(160),
  line2: z.string().max(160).optional(),
  city: z.string().min(2).max(80),
  state: z.string().min(2).max(80),
  pincode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit PIN code"),
  country: z.string().max(60).default("India"),
  is_default: z.boolean().default(false),
});

export const getProfile = createServerFn({ method: "POST" }).handler(async () => {
  const { db, requireUser, getRoles } = await import("./auth.server");
  const user = await requireUser();
  const { data: profile } = await db.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const roles = await getRoles(user.id);
  return {
    id: user.id,
    email: user.email,
    fullName: (profile as any)?.full_name ?? null,
    phone: (profile as any)?.phone ?? null,
    roles,
    isStaff: roles.length > 0,
  };
});

export const updateProfile = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        fullName: z.string().min(2).max(80),
        phone: z.string().max(20).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { db, requireUser } = await import("./auth.server");
    const user = await requireUser();
    await db
      .from("profiles")
      .upsert({ id: user.id, full_name: data.fullName, phone: data.phone ?? null });
    return { ok: true };
  });

export const listAddresses = createServerFn({ method: "POST" }).handler(async () => {
  const { db, requireUser } = await import("./auth.server");
  const user = await requireUser();
  const { data } = await db
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as any[];
});

export const saveAddress = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    addressSchema.extend({ id: z.string().uuid().optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { db, requireUser } = await import("./auth.server");
    const user = await requireUser();
    const { id, ...fields } = data;

    if (fields.is_default) {
      await db.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    }

    if (id) {
      // Ownership check prevents editing another customer's address.
      const { data: existing } = await db
        .from("addresses")
        .select("id, user_id")
        .eq("id", id)
        .maybeSingle();
      if (!existing || (existing as any).user_id !== user.id)
        throw new Error("Address not found.");
      await db.from("addresses").update(fields).eq("id", id);
      return { id };
    }

    const { data: created } = await db
      .from("addresses")
      .insert({ ...fields, user_id: user.id })
      .select("id")
      .maybeSingle();
    return { id: (created as any)?.id as string };
  });

export const deleteAddress = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { db, requireUser } = await import("./auth.server");
    const user = await requireUser();
    await db.from("addresses").delete().eq("id", data.id).eq("user_id", user.id);
    return { ok: true };
  });

export const listWishlist = createServerFn({ method: "POST" }).handler(async () => {
  const { db, requireUser } = await import("./auth.server");
  const user = await requireUser();
  const { data } = await db
    .from("wishlist_items")
    .select("id, created_at, products(id, slug, name, base_price, product_images(url, sort_order))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return ((data ?? []) as any[]).map((w) => ({
    id: w.id,
    product: w.products
      ? {
          id: w.products.id,
          slug: w.products.slug,
          name: w.products.name,
          basePrice: Number(w.products.base_price),
          image:
            (w.products.product_images ?? [])
              .slice()
              .sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.url ?? null,
        }
      : null,
  }));
});

export const toggleWishlist = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ productId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { db, requireUser } = await import("./auth.server");
    const user = await requireUser();
    const { data: existing } = await db
      .from("wishlist_items")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", data.productId)
      .maybeSingle();
    if (existing) {
      await db.from("wishlist_items").delete().eq("id", (existing as any).id);
      return { saved: false };
    }
    await db.from("wishlist_items").insert({ user_id: user.id, product_id: data.productId });
    return { saved: true };
  });

export const submitReview = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        productId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        title: z.string().max(120).optional(),
        body: z.string().min(5).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { db, requireUser } = await import("./auth.server");
    const user = await requireUser();

    const { data: profile } = await db
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    // Verified-buyer flag is derived server-side from delivered orders.
    const { data: purchased } = await db
      .from("order_items")
      .select("id, orders!inner(user_id, status)")
      .eq("product_id", data.productId)
      .eq("orders.user_id", user.id)
      .limit(1);

    await db.from("reviews").upsert(
      {
        product_id: data.productId,
        user_id: user.id,
        rating: data.rating,
        title: data.title ?? null,
        body: data.body,
        author_name: (profile as any)?.full_name ?? "Verified buyer",
        is_verified_purchase: (purchased ?? []).length > 0,
        status: "pending",
      },
      { onConflict: "product_id,user_id" },
    );

    return { ok: true, message: "Thanks! Your review is awaiting moderation." };
  });
