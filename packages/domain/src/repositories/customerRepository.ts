import type {
  Customer,
  CustomerId,
  CustomerProfile,
  StaffFacingCustomer,
} from "@lua/types";

export interface CustomerRepository {
  getById(id: CustomerId): Promise<CustomerProfile | null>;
  getByPhone(phone: string): Promise<CustomerProfile | null>;
  /** The reduced view Lua Staff is allowed to render after a scan. */
  getStaffFacingView(id: CustomerId): Promise<StaffFacingCustomer | null>;
  update(id: CustomerId, patch: Partial<Customer>): Promise<CustomerProfile>;
}
