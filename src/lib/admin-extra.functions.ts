import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Additional operations-console server functions. Every handler re-checks the
 * caller's role on the server — the UI is never trusted.
 */

const STAFF_ROLES = [
  "ADMIN",
  "ORDER_MANAGER",
  "PRODUCT_MANAGER",
  "INVENTORY_MANAGER",
  "CUSTOMER_SUPPORT",
  "MARKETING",
] as const;

/**
 * One-time bootstrap: the signed-in user whose email matches the
 * ADMIN_BOOTSTRAP_EMAIL secret is granted SUPER_ADMIN. No password lives in
 * source; the account itself is a normal Supabase Auth user.
 */
export const claimAdminBootstrap = createServerFn({ method: "POST" }).handler(async () => {
  const { db, requireUser } = await import("./auth.server");
  const user = await requireUser();
  const allowed = (process.env["ADMIN_BOOTSTRAP_EMAIL"] ?? "").trim().toLowerCase();
  if (!allowed) return { granted: false, reason: "ADMIN_BOOTSTRAP_EMAIL is not configured." };
  if ((user.email ?? "").toLowerCase() !== allowed)
    return { granted: false, reason: "This account is not the configured bootstrap admin." };

  const { data: existing } = await db
    .from("user_roles")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", "SUPER_ADMIN")
    .maybeSingle();
  if (existing) return { granted: true, reason: "Already a super admin." };

  const { error } = await db.from("user_roles").insert({ user_id: user.id, role: "SUPER_ADMIN" });
  if (error) return { granted: false, reason: error.message };
  await db.from("audit_logs").insert({
    actor_id: user.id,
    actor_email: user.email,
    action: "admin.bootstrap.claimed",
    entity_type: "user",
    entity_id: user.id,
  });
  return { granted: true, reason: "Super admin access granted." };
});

export const listCustomers = createServerFn({ method: "POST" }).handler(async () => {
  const { db, requireRole } = await import("./auth.server");
  await requireRole(["ADMIN", "CUSTOMER_SUPPORT", "ORDER_MANAGER", "MARKETING"]);
  const { data: profiles } = await db
    .from("profiles")
    .select("id, full_name, email, phone, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  const { data: orders } = await db.from("orders").select("user_id, grand_total, payment_status");
  const totals = new Map<string, { orders: number; spend: number }>();
  for (const o of (orders ?? []) as any[]) {
    if (!o.user_id) continue;
    const cur = totals.get(o.user_id) ?? { orders: 0, spend: 0 };
    cur.orders += 1;
    if (o.payment_status === "captured") cur.spend += Number(o.grand_total);
    totals.set(o.user_id, cur);
  }
  return ((profiles ?? []) as any[]).map((p) => ({
    ...p,
    orderCount: totals.get(p.id)?.orders ?? 0,
    lifetimeSpend: totals.get(p.id)?.spend ?? 0,
  }));
});

export const listReturns = createServerFn({ method: "POST" }).handler(async () => {
  const { db, requireRole } = await import("./auth.server");
  await requireRole(["ADMIN", "ORDER_MANAGER", "CUSTOMER_SUPPORT"]);
  const { data } = await db
    .from("return_requests")
    .select("*, orders(order_number, grand_total, contact_email)")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []) as any[];
});

export const decideReturn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        returnId: z.string().uuid(),
        status: z.enum(["approved", "rejected", "completed"]),
        adminNote: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { db, requireRole } = await import("./auth.server");
    const { setOrderStatus, logAudit } = await import("./store.server");
    const { user } = await requireRole(["ADMIN", "ORDER_MANAGER"]);

    const { data: req } = await db
      .from("return_requests")
      .select("id, order_id, status")
      .eq("id", data.returnId)
      .maybeSingle();
    if (!req) throw new Error("Return request not found.");

    await db
      .from("return_requests")
      .update({ status: data.status, admin_note: data.adminNote ?? null })
      .eq("id", data.returnId);

    if (data.status === "completed") {
      await setOrderStatus(db, (req as any).order_id, "returned", "Return completed", user.id);
    }
    await logAudit(db, {
      actorId: user.id,
      action: `return.${data.status}`,
      entityType: "return_request",
      entityId: data.returnId,
    });
    return { ok: true };
  });

export const listRefunds = createServerFn({ method: "POST" }).handler(async () => {
  const { db, requireRole } = await import("./auth.server");
  await requireRole(["ADMIN", "ORDER_MANAGER"]);
  const { data } = await db
    .from("refunds")
    .select("*, orders(order_number, contact_email)")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []) as any[];
});

export const listPayments = createServerFn({ method: "POST" }).handler(async () => {
  const { db, requireRole } = await import("./auth.server");
  await requireRole(["ADMIN", "ORDER_MANAGER"]);
  const { data } = await db
    .from("payments")
    .select("*, orders(order_number)")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []) as any[];
});

export const listNotifications = createServerFn({ method: "POST" }).handler(async () => {
  const { db, requireRole } = await import("./auth.server");
  await requireRole(["ADMIN", "CUSTOMER_SUPPORT"]);
  const { data } = await db
    .from("notifications")
    .select("id, channel, template, recipient, status, error, created_at, sent_at")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []) as any[];
});

export const listInventory = createServerFn({ method: "POST" }).handler(async () => {
  const { db, requireRole } = await import("./auth.server");
  await requireRole(["ADMIN", "INVENTORY_MANAGER", "PRODUCT_MANAGER"]);
  const [{ data: products }, { data: movements }] = await Promise.all([
    db
      .from("products")
      .select("id, name, slug, stock_quantity, low_stock_threshold, status")
      .order("stock_quantity", { ascending: true }),
    db
      .from("inventory_movements")
      .select("id, product_id, change, type, reason, created_at, products(name)")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  return { products: (products ?? []) as any[], movements: (movements ?? []) as any[] };
});

export const listCategories = createServerFn({ method: "POST" }).handler(async () => {
  const { db, requireRole } = await import("./auth.server");
  await requireRole(["ADMIN", "PRODUCT_MANAGER", "MARKETING"]);
  const [{ data: categories }, { data: sizes }, { data: frames }] = await Promise.all([
    db.from("categories").select("*").order("sort_order"),
    db.from("size_options").select("*").order("sort_order"),
    db.from("frame_options").select("*").order("sort_order"),
  ]);
  return {
    categories: (categories ?? []) as any[],
    sizes: (sizes ?? []) as any[],
    frames: (frames ?? []) as any[],
  };
});

export const upsertCategory = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(2).max(80),
        slug: z
          .string()
          .min(2)
          .max(80)
          .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes"),
        description: z.string().max(500).optional(),
        sortOrder: z.number().int().min(0).default(0),
        isActive: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { db, requireRole } = await import("./auth.server");
    const { logAudit } = await import("./store.server");
    const { user } = await requireRole(["ADMIN", "PRODUCT_MANAGER"]);
    const row = {
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      sort_order: data.sortOrder,
      is_active: data.isActive,
    };
    if (data.id) await db.from("categories").update(row).eq("id", data.id);
    else await db.from("categories").insert(row);
    await logAudit(db, {
      actorId: user.id,
      action: data.id ? "category.updated" : "category.created",
      entityType: "category",
      entityId: data.id,
    });
    return { ok: true };
  });

export const listStaff = createServerFn({ method: "POST" }).handler(async () => {
  const { db, requireRole } = await import("./auth.server");
  await requireRole(["ADMIN"]);
  const { data: roles } = await db
    .from("user_roles")
    .select("id, user_id, role, created_at")
    .order("created_at", { ascending: false });
  const ids = [...new Set(((roles ?? []) as any[]).map((r) => r.user_id))];
  const { data: profiles } = ids.length
    ? await db.from("profiles").select("id, full_name, email").in("id", ids)
    : { data: [] as any[] };
  const map = new Map(((profiles ?? []) as any[]).map((p) => [p.id, p]));
  return ((roles ?? []) as any[]).map((r) => ({
    ...r,
    email: map.get(r.user_id)?.email ?? null,
    fullName: map.get(r.user_id)?.full_name ?? null,
  }));
});

export const grantStaffRole = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z.string().email(),
        role: z.enum(["SUPER_ADMIN", ...STAFF_ROLES]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { db, requireRole } = await import("./auth.server");
    const { logAudit } = await import("./store.server");
    // Only a SUPER_ADMIN may hand out roles.
    const { user, roles } = await requireRole(["SUPER_ADMIN"]);
    if (!roles.includes("SUPER_ADMIN")) throw new Error("Only a super admin can assign roles.");

    const { data: profile } = await db
      .from("profiles")
      .select("id")
      .ilike("email", data.email)
      .maybeSingle();
    if (!profile) throw new Error("No customer account exists with that email yet.");

    const { error } = await db
      .from("user_roles")
      .upsert({ user_id: (profile as any).id, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    await logAudit(db, {
      actorId: user.id,
      action: "staff.role.granted",
      entityType: "user",
      entityId: (profile as any).id,
      meta: { role: data.role, email: data.email },
    });
    return { ok: true };
  });

export const revokeStaffRole = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ roleId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { db, requireRole } = await import("./auth.server");
    const { logAudit } = await import("./store.server");
    const { user } = await requireRole(["SUPER_ADMIN"]);

    const { data: row } = await db
      .from("user_roles")
      .select("id, user_id, role")
      .eq("id", data.roleId)
      .maybeSingle();
    if (!row) throw new Error("Role assignment not found.");
    if ((row as any).user_id === user.id && (row as any).role === "SUPER_ADMIN")
      throw new Error("You cannot remove your own super admin role.");

    await db.from("user_roles").delete().eq("id", data.roleId);
    await logAudit(db, {
      actorId: user.id,
      action: "staff.role.revoked",
      entityType: "user",
      entityId: (row as any).user_id,
      meta: { role: (row as any).role },
    });
    return { ok: true };
  });

export const getStoreSettings = createServerFn({ method: "POST" }).handler(async () => {
  const { db, requireRole } = await import("./auth.server");
  await requireRole(["ADMIN", "MARKETING", "ORDER_MANAGER"]);
  const { data } = await db.from("store_settings").select("key, value");
  const out: Record<string, any> = {};
  for (const row of (data ?? []) as any[]) out[row.key] = row.value;
  return out;
});

export const saveStoreSetting = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ key: z.string().min(2).max(60), value: z.record(z.string(), z.any()) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { db, requireRole } = await import("./auth.server");
    const { logAudit } = await import("./store.server");
    const { user } = await requireRole(["ADMIN"]);
    await db
      .from("store_settings")
      .upsert({ key: data.key, value: data.value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    await logAudit(db, {
      actorId: user.id,
      action: "settings.updated",
      entityType: "store_settings",
      entityId: data.key,
    });
    return { ok: true };
  });
