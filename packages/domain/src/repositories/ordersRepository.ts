import type { CustomerId, Order, OrderId } from "@lua/types";

export interface OrdersRepository {
  listByCustomer(customerId: CustomerId): Promise<Order[]>;
  getById(id: OrderId): Promise<Order | null>;
  /** Scenario A, staff side: links a still-unassigned demo order to the scanned guest. The real backend does this atomically in confirm_order_earn(); see docs/ARCHITECTURE.md. */
  assignToCustomer(orderId: OrderId, customerId: CustomerId): Promise<Order>;
}
