import type { CustomerId, Order, OrderId } from "@lua/types";
import type { OrdersRepository } from "../repositories/ordersRepository";
import type { MockStore } from "./store";

export class MockOrdersRepository implements OrdersRepository {
  constructor(private readonly store: MockStore) {}

  async listByCustomer(customerId: CustomerId): Promise<Order[]> {
    return this.store.orders
      .filter((o) => o.customerId === customerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getById(id: OrderId): Promise<Order | null> {
    return this.store.orders.find((o) => o.id === id) ?? null;
  }

  async assignToCustomer(orderId: OrderId, customerId: CustomerId): Promise<Order> {
    const index = this.store.orders.findIndex((o) => o.id === orderId);
    if (index === -1) throw new Error(`Order ${orderId} not found`);
    const updated: Order = {
      ...this.store.orders[index]!,
      customerId,
      status: "COMPLETED",
    };
    this.store.orders[index] = updated;
    return updated;
  }
}
