// WhatsApp order events and the template wording to submit to Meta for approval.
// {{1}} = order number; for shipped, {{2}} = courier and {{3}} = tracking number.

export const NOTIFICATION_EVENTS = ["order_placed", "order_confirmed", "order_processing", "order_shipped", "order_delivered", "order_cancelled"] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export const notificationEvents: Record<NotificationEvent, { label: string; trigger: string; body: string }> = {
  order_placed: {
    label: "New order placed",
    trigger: "When a customer places an order",
    body: "Thank you for shopping with us! Your order {{1}} has been received successfully. Our team will confirm your order shortly.",
  },
  order_confirmed: {
    label: "Order confirmed",
    trigger: "When you set the status to Confirmed",
    body: "Great news! Your order {{1}} has been confirmed. We are getting everything ready for you.",
  },
  order_processing: {
    label: "Being prepared",
    trigger: "When you set the status to Being prepared",
    body: "Your order {{1}} is now being prepared. We will notify you when it is shipped.",
  },
  order_shipped: {
    label: "Order shipped",
    trigger: "When you set the status to Shipped",
    body: "Your order {{1}} has been shipped! Your parcel is on its way. Courier: {{2}}. Tracking Number: {{3}}.",
  },
  order_delivered: {
    label: "Order delivered",
    trigger: "When you set the status to Delivered",
    body: "Your order {{1}} has been delivered successfully. Thank you for shopping with us!",
  },
  order_cancelled: {
    label: "Order cancelled",
    trigger: "When you set the status to Cancelled",
    body: "Your order {{1}} has been cancelled. Please contact our customer support if you need assistance.",
  },
};
