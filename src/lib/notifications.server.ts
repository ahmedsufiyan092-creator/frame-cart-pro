/**
 * Notification dispatch. Every message is persisted first, then handed to a
 * provider. When a provider is not configured the row stays `pending_provider`
 * — nothing is ever reported as delivered when it was not.
 */
import type { Db } from "./store.server";

export interface ProviderStatus {
  channel: "email" | "whatsapp" | "sms";
  provider: string;
  configured: boolean;
  missing: string[];
}

export function providerStatuses(): ProviderStatus[] {
  const env = (k: string) => Boolean(process.env[k]);
  const missing = (keys: string[]) => keys.filter((k) => !env(k));
  return [
    {
      channel: "email",
      provider: "Resend",
      configured: env("RESEND_API_KEY") && env("NOTIFICATION_FROM_EMAIL"),
      missing: missing(["RESEND_API_KEY", "NOTIFICATION_FROM_EMAIL"]),
    },
    {
      channel: "whatsapp",
      provider: "Meta WhatsApp Business Cloud API",
      configured: env("WHATSAPP_PHONE_NUMBER_ID") && env("WHATSAPP_ACCESS_TOKEN"),
      missing: missing(["WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_ACCESS_TOKEN"]),
    },
    // SMS (Twilio) intentionally disabled for now — not shown as a channel.

  ];
}

function renderTemplate(template: string, data: Record<string, any>) {
  const orderNumber = data["orderNumber"] ?? "";
  switch (template) {
    case "order_confirmed":
      return {
        subject: `Your FRAME CART order ${orderNumber} is confirmed`,
        body: `Thank you for your order ${orderNumber}. Total paid: ₹${data["total"] ?? ""}. We will notify you when it ships.`,
      };
    case "payment_failed":
      return {
        subject: `Payment could not be completed for ${orderNumber}`,
        body: `We could not confirm payment for order ${orderNumber}. You can retry the payment from your account.`,
      };
    case "order_shipped":
      return {
        subject: `Order ${orderNumber} has shipped`,
        body: `Your order ${orderNumber} is on its way. Tracking: ${data["trackingNumber"] ?? "will be updated shortly"}.`,
      };
    case "order_delivered":
      return {
        subject: `Order ${orderNumber} delivered`,
        body: `Your order ${orderNumber} has been delivered. We would love your review.`,
      };
    case "refund_processed":
      return {
        subject: `Refund initiated for ${orderNumber}`,
        body: `A refund of ₹${data["amount"] ?? ""} has been initiated for order ${orderNumber}.`,
      };
    default:
      return { subject: `FRAME CART update`, body: `Update for order ${orderNumber}.` };
  }
}

type SendResult = { ok: boolean; id?: string | undefined; error?: string | undefined };

async function sendEmail(to: string, subject: string, body: string): Promise<SendResult> {
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["NOTIFICATION_FROM_EMAIL"];
  if (!apiKey || !from) return { ok: false, error: "EMAIL_PROVIDER_NOT_CONFIGURED" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text: body }),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json?.message ?? `Email failed (${res.status})` };
  return { ok: true, id: json?.id as string | undefined };
}

async function sendWhatsApp(to: string, body: string): Promise<SendResult> {
  const phoneId = process.env["WHATSAPP_PHONE_NUMBER_ID"];
  const token = process.env["WHATSAPP_ACCESS_TOKEN"];
  if (!phoneId || !token) return { ok: false, error: "WHATSAPP_PROVIDER_NOT_CONFIGURED" };
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json?.error?.message ?? `WhatsApp failed (${res.status})` };
  return { ok: true, id: json?.messages?.[0]?.id as string | undefined };
}

async function sendSms(to: string, body: string): Promise<SendResult> {
  const sid = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  const from = process.env["TWILIO_FROM_NUMBER"];
  if (!sid || !token || !from) return { ok: false, error: "SMS_PROVIDER_NOT_CONFIGURED" };
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json?.message ?? `SMS failed (${res.status})` };
  return { ok: true, id: json?.sid as string | undefined };
}

export async function dispatchNotification(
  db: Db,
  input: {
    userId?: string | null;
    orderId?: string | null;
    channel: "email" | "whatsapp" | "sms";
    template: string;
    recipient?: string | null;
    data?: Record<string, any>;
  },
) {
  const { subject, body } = renderTemplate(input.template, input.data ?? {});
  const { data: row } = await db
    .from("notifications")
    .insert({
      user_id: input.userId ?? null,
      order_id: input.orderId ?? null,
      channel: input.channel,
      template: input.template,
      recipient: input.recipient ?? null,
      payload: { subject, body, ...(input.data ?? {}) },
      status: "queued",
    })
    .select("id")
    .maybeSingle();

  if (!row) return;
  if (!input.recipient) {
    await db
      .from("notifications")
      .update({ status: "failed", error: "NO_RECIPIENT" })
      .eq("id", row.id);
    return;
  }

  let result: SendResult;
  if (input.channel === "email") result = await sendEmail(input.recipient, subject, body);
  else if (input.channel === "whatsapp") result = await sendWhatsApp(input.recipient, body);
  else result = await sendSms(input.recipient, body);

  await db
    .from("notifications")
    .update({
      status: result.ok ? "sent" : result.error?.endsWith("NOT_CONFIGURED") ? "pending_provider" : "failed",
      provider_message_id: result.id ?? null,
      error: result.ok ? null : (result.error ?? null),
      sent_at: result.ok ? new Date().toISOString() : null,
    })
    .eq("id", row.id);
}
