/**
 * Razorpay REST client + signature verification.
 * Uses fetch + Web Crypto so it runs on the edge runtime.
 * Secrets are read inside functions only — never at module scope.
 */

const API = "https://api.razorpay.com/v1";

export function razorpayKeys() {
  const keyId = process.env["RAZORPAY_KEY_ID"] ?? "";
  const keySecret = process.env["RAZORPAY_KEY_SECRET"] ?? "";
  return { keyId, keySecret, configured: Boolean(keyId && keySecret) };
}

export function webhookSecret() {
  return process.env["RAZORPAY_WEBHOOK_SECRET"] ?? "";
}

function authHeader(keyId: string, keySecret: string) {
  return `Basic ${btoa(`${keyId}:${keySecret}`)}`;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPaymentSignature(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): Promise<boolean> {
  const { keySecret, configured } = razorpayKeys();
  if (!configured) return false;
  const expected = await hmacSha256Hex(
    keySecret,
    `${input.razorpayOrderId}|${input.razorpayPaymentId}`,
  );
  return timingSafeEqual(expected, input.signature);
}

export async function verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
  const secret = webhookSecret();
  if (!secret || !signature) return false;
  const expected = await hmacSha256Hex(secret, rawBody);
  return timingSafeEqual(expected, signature);
}

async function rzpFetch(path: string, init: RequestInit = {}) {
  const { keyId, keySecret, configured } = razorpayKeys();
  if (!configured) {
    throw new Error("RAZORPAY_NOT_CONFIGURED");
  }
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(keyId, keySecret),
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as any)?.error?.description ?? `Razorpay error ${res.status}`;
    throw new Error(message);
  }
  return body as any;
}

export function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}) {
  return rzpFetch("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt,
      payment_capture: 1,
      notes: input.notes ?? {},
    }),
  });
}

export function fetchRazorpayPayment(paymentId: string) {
  return rzpFetch(`/payments/${paymentId}`);
}

export function createRazorpayRefund(input: {
  paymentId: string;
  amountPaise: number;
  notes?: Record<string, string>;
  idempotencyKey: string;
}) {
  return rzpFetch(`/payments/${input.paymentId}/refund`, {
    method: "POST",
    headers: { "X-Razorpay-Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify({ amount: input.amountPaise, notes: input.notes ?? {} }),
  });
}
