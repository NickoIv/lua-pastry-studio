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
}
