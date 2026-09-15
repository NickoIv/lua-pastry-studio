import { createMockStore, type MockStore } from "./store";
import { MockCustomerRepository } from "./mockCustomerRepository";
import { MockMenuRepository } from "./mockMenuRepository";
import { MockOrdersRepository } from "./mockOrdersRepository";
import { MockLoyaltyRepository } from "./mockLoyaltyRepository";
import { MockRewardsRepository } from "./mockRewardsRepository";
import { MockQRTokenService } from "../qr/mockTokenService";
import { EarnService } from "../loyalty/earnService";
import { RedemptionService } from "../loyalty/redemption";
import type { Location, StaffUser } from "@lua/types";

/**
 * Everything an app needs to run against development data: one shared
 * in-memory store, a repository per aggregate, and the domain services
 * built on top of them. Swapping to a real backend later means writing
 * an equivalent `createHttpBackend()` with the same shape — app code
 * that only depends on the repository/service interfaces does not
 * change. See docs/ARCHITECTURE.md.
 */
export interface MockBackend {
  store: MockStore;
  customers: MockCustomerRepository;
  menu: MockMenuRepository;
  orders: MockOrdersRepository;
  loyalty: MockLoyaltyRepository;
  rewards: MockRewardsRepository;
  qr: MockQRTokenService;
  earnService: EarnService;
  redemptionService: RedemptionService;
  locations: Location[];
  staffUsers: StaffUser[];
}

export function createMockBackend(): MockBackend {
  const store = createMockStore();

  const customers = new MockCustomerRepository(store);
  const menu = new MockMenuRepository(store);
  const orders = new MockOrdersRepository(store);
  const loyalty = new MockLoyaltyRepository(store);
  const rewards = new MockRewardsRepository(store);
  const qr = new MockQRTokenService();

  const earnService = new EarnService({ loyalty });
  const redemptionService = new RedemptionService({ loyalty, rewards });

  return {
    store,
    customers,
    menu,
    orders,
    loyalty,
    rewards,
    qr,
    earnService,
    redemptionService,
    locations: store.locations,
    staffUsers: store.staffUsers,
  };
}
