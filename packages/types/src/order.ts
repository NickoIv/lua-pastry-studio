import type { Id, ISODateTimeString } from "./common";
import type { Money } from "./money";
import type { CustomerId } from "./customer";
import type { ProductId } from "./product";
import type { LocationId, StaffUserId } from "./staff";

export type OrderId = Id<"Order">;
export type OrderItemId = Id<"OrderItem">;

export const ORDER_STATUSES = ["OPEN", "COMPLETED", "CANCELLED", "REFUNDED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItem {
  id: OrderItemId;
  productId: ProductId;
  productName: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
}

export interface Order {
  id: OrderId;
  customerId?: CustomerId;
  locationId: LocationId;
  staffUserId?: StaffUserId;
  items: OrderItem[];
  subtotal: Money;
  discount: Money;
  total: Money;
  status: OrderStatus;
  pointsEarned: number;
  createdAt: ISODateTimeString;
  completedAt?: ISODateTimeString;
}
