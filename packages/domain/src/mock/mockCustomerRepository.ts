import type {
  Customer,
  CustomerId,
  CustomerProfile,
  StaffFacingCustomer,
} from "@lua/types";
import type { CustomerRepository } from "../repositories/customerRepository";
import type { MockStore } from "./store";
import { balanceFromLedger } from "../loyalty/ledger";

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `+${digits.slice(0, 3)} •• •• ${digits.slice(-2)}`;
}

export class MockCustomerRepository implements CustomerRepository {
  constructor(private readonly store: MockStore) {}

  async getById(id: CustomerId): Promise<CustomerProfile | null> {
    return this.store.customers.find((c) => c.id === id) ?? null;
  }

  async getByPhone(phone: string): Promise<CustomerProfile | null> {
    return this.store.customers.find((c) => c.phone === phone) ?? null;
  }

  async getStaffFacingView(id: CustomerId): Promise<StaffFacingCustomer | null> {
    const customer = this.store.customers.find((c) => c.id === id);
    if (!customer) return null;
    const txs = this.store.loyaltyTransactions.filter((t) => t.customerId === id);
    const balance = balanceFromLedger(txs);
    return {
      id: customer.id,
      displayName: customer.lastName
        ? `${customer.firstName} ${customer.lastName}`
        : customer.firstName,
      loyaltyTier: balance >= 20000 ? "Lua Gold" : "Lua",
      maskedPhone: maskPhone(customer.phone),
    };
  }

  async update(id: CustomerId, patch: Partial<Customer>): Promise<CustomerProfile> {
    const index = this.store.customers.findIndex((c) => c.id === id);
    if (index === -1) throw new Error(`Customer ${id} not found`);
    const current = this.store.customers[index]!;
    const updated: CustomerProfile = { ...current, ...patch };
    this.store.customers[index] = updated;
    return updated;
  }
}
