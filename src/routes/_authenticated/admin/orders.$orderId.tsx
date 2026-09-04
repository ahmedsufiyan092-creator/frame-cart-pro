import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getAdminOrder,
  updateOrderStatus,
  saveShipment,
  refundOrder,
} from "@/lib/admin.functions";
import { formatINR, ORDER_STATUS_LABELS } from "@/lib/money";
import { AdminPage, Panel, Loading, ErrorNote, StatusPill } from "@/components/admin/panel";

export const Route = createFileRoute("/_authenticated/admin/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Order detail — Frame Cart admin" },
      { name: "description", content: "Order detail and fulfilment actions." },
      { property: "og:title", content: "Order detail — Frame Cart admin" },
      { property: "og:description", content: "Order detail and fulfilment actions." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminOrderDetail,
});

const NEXT_STATUSES = [
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
] as const;

function AdminOrderDetail() {
  const { orderId } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchOrder = useServerFn(getAdminOrder);
  const setStatus = useServerFn(updateOrderStatus);
  const ship = useServerFn(saveShipment);
  const refund = useServerFn(refundOrder);

  const [note, setNote] = useState("");
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [refundAmount, setRefundAmount] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-order", orderId],
    queryFn: () => fetchOrder({ data: { orderId } }),
    retry: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });

  const statusMutation = useMutation({
    mutationFn: (status: (typeof NEXT_STATUSES)[number]) =>
      setStatus({ data: { orderId, status, note: note || undefined } }),
    onSuccess: () => {
      toast.success("Order updated");
      setNote("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shipMutation = useMutation({
    mutationFn: () =>
      ship({ data: { orderId, carrier, trackingNumber: tracking } }),
    onSuccess: () => {
      toast.success("Shipment saved");
      setCarrier("");
      setTracking("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refundMutation = useMutation({
    mutationFn: () =>
      refund({
        data: {
          orderId,
          ...(refundAmount ? { amount: Number(refundAmount) } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Refund submitted to the payment gateway");
      setRefundAmount("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorNote error={error} />;
  if (!data) return <ErrorNote error={new Error("Order not found.")} />;

  const order = data as any;

  return (
    <AdminPage
      title={order.order_number}
      description={`Placed ${new Date(order.created_at).toLocaleString("en-IN")}`}
      actions={<StatusPill status={order.status} />}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Items">
          <ul className="divide-y text-sm">
            {(order.order_items ?? []).map((i: any) => (
              <li key={i.id} className="flex justify-between gap-3 py-2">
                <span>
                  {i.product_name ?? "Item"}
                  <span className="block text-xs text-muted-foreground">
                    {i.size_label} · {i.frame_name} · ×{i.quantity}
                  </span>
                </span>
                <span className="tabular-nums">{formatINR(Number(i.line_total))}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1 border-t pt-3 text-sm">
            <Row label="Subtotal" value={formatINR(Number(order.subtotal))} />
            <Row label="Discount" value={`− ${formatINR(Number(order.discount_total))}`} />
            <Row label="Shipping" value={formatINR(Number(order.shipping_total))} />
            <Row label="Tax" value={formatINR(Number(order.tax_total))} />
            <Row label="Total" value={formatINR(Number(order.grand_total))} strong />
          </dl>
        </Panel>

        <Panel title="Customer">
          <div className="space-y-1 text-sm">
            <p>{order.contact_name ?? "—"}</p>
            <p className="text-muted-foreground">{order.contact_email}</p>
            <p className="text-muted-foreground">{order.contact_phone}</p>
            <div className="mt-3 rounded-md bg-muted p-3 text-xs">
              {formatAddress(order.shipping_address)}
            </div>
            <p className="pt-3 text-xs text-muted-foreground">
              Payment: {order.payment_method?.toUpperCase()} · {order.payment_status}
            </p>
          </div>
        </Panel>

        <Panel title="Timeline">
          <ol className="space-y-2 text-xs">
            {(order.order_status_history ?? []).map((h: any, idx: number) => (
              <li key={idx}>
                <span className="font-medium">
                  {ORDER_STATUS_LABELS[h.status] ?? h.status}
                </span>
                <span className="block text-muted-foreground">
                  {new Date(h.created_at).toLocaleString("en-IN")} {h.note ? `· ${h.note}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Change status">
          <Textarea
            placeholder="Internal note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mb-3"
          />
          <div className="flex flex-wrap gap-2">
            {NEXT_STATUSES.map((s) => (
              <Button
                key={s}
                size="sm"
                variant="outline"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate(s)}
              >
                {ORDER_STATUS_LABELS[s]}
              </Button>
            ))}
          </div>
        </Panel>

        <Panel title="Shipment">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="carrier">Carrier</Label>
              <Input id="carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tracking">Tracking number</Label>
              <Input id="tracking" value={tracking} onChange={(e) => setTracking(e.target.value)} />
            </div>
            <Button
              size="sm"
              disabled={shipMutation.isPending || carrier.length < 2 || tracking.length < 3}
              onClick={() => shipMutation.mutate()}
            >
              Mark shipped
            </Button>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {(order.shipments ?? []).map((s: any) => (
                <li key={s.id}>
                  {s.carrier} · {s.tracking_number} · {s.status}
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel title="Refund">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="refund">Amount (blank = full refund)</Label>
              <Input
                id="refund"
                inputMode="decimal"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              variant="destructive"
              disabled={refundMutation.isPending}
              onClick={() => refundMutation.mutate()}
            >
              Issue refund
            </Button>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {(order.refunds ?? []).map((r: any) => (
                <li key={r.id}>
                  {formatINR(Number(r.amount))} · {r.status}
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>
    </AdminPage>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-semibold" : ""}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function formatAddress(address: any) {
  if (!address) return "No shipping address on file.";
  return [address.line1, address.line2, address.city, address.state, address.pincode, address.country]
    .filter(Boolean)
    .join(", ");
}
