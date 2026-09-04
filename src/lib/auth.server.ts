import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Db } from "./store.server";

export const db = supabaseAdmin as unknown as Db;

export interface SessionUser {
  id: string;
  email: string | null;
  phone: string | null;
}

/** Resolves the caller from the bearer token. Returns null for guests. */
export async function optionalUser(): Promise<SessionUser | null> {
  const request = getRequest();
  const header = request?.headers?.get("authorization");
  if (!header) return null;
  const token = header.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    phone: (data.user.user_metadata as any)?.phone ?? data.user.phone ?? null,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await optionalUser();
  if (!user) throw new Error("Please sign in to continue.");
  return user;
}

export type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "ORDER_MANAGER"
  | "PRODUCT_MANAGER"
  | "INVENTORY_MANAGER"
  | "CUSTOMER_SUPPORT"
  | "MARKETING";

export async function getRoles(userId: string): Promise<Role[]> {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  return ((data ?? []) as any[]).map((r) => r.role as Role);
}

/** Server-side RBAC gate. Throws unless the caller holds one of `allowed`. */
export async function requireRole(allowed: Role[]): Promise<{ user: SessionUser; roles: Role[] }> {
  const user = await requireUser();
  const roles = await getRoles(user.id);
  const ok = roles.includes("SUPER_ADMIN") || roles.some((r) => allowed.includes(r));
  if (!ok) throw new Error("You do not have permission to perform this action.");
  return { user, roles };
}
