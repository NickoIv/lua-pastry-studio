import type {
  Collection,
  CustomerProfile,
  Location,
  LoyaltyProgram,
  LoyaltyTransaction,
  Order,
  Product,
  ProductCategory,
  Reward,
  RewardRedemption,
  StaffUser,
} from "@lua/types";
import * as fixtures from "./fixtures";

/**
 * In-memory, per-instance copy of the fixtures. Each `createMockStore()`
 * call gets its own deep-ish clone so multiple app instances (e.g. Guest
 * and Staff running side by side in dev) never share mutable state
 * through module-level singletons.
 */
export interface MockStore {
  locations: Location[];
  categories: ProductCategory[];
  products: Product[];
  collections: Collection[];
  rewards: Reward[];
  staffUsers: StaffUser[];
  customers: CustomerProfile[];
  orders: Order[];
  rewardRedemptions: RewardRedemption[];
  loyaltyTransactions: LoyaltyTransaction[];
  loyaltyProgram: LoyaltyProgram;
}

export function createMockStore(): MockStore {
  return structuredClone({
    locations: fixtures.locations,
    categories: fixtures.categories,
    products: fixtures.products,
    collections: fixtures.collections,
    rewards: fixtures.rewards,
    staffUsers: fixtures.staffUsers,
    customers: fixtures.customers,
    orders: fixtures.orders,
    rewardRedemptions: fixtures.rewardRedemptions,
    loyaltyTransactions: fixtures.loyaltyTransactions,
    loyaltyProgram: fixtures.loyaltyProgram,
  });
}
