import type { CustomerId, Order, OrderId } from "@lua/types";

export interface OrdersRepository {
  listByCustomer(customerId: CustomerId): Promise<Order[]>;
  getById(id: OrderId): Promise<Order | null>;
}
