import { useCallback } from "react";
import { asId } from "@lua/types";
import { useBackend, CURRENT_CUSTOMER_ID } from "./useBackend";
import { useAsync } from "./useAsync";

export function useCustomerProfile() {
  const backend = useBackend();
  return useAsync(() => backend.customers.getById(CURRENT_CUSTOMER_ID), [backend]);
}

export function useLoyaltyAccount() {
  const backend = useBackend();
  return useAsync(() => backend.loyalty.getAccount(CURRENT_CUSTOMER_ID), [backend]);
}

export function useLoyaltyTransactions() {
  const backend = useBackend();
  return useAsync(() => backend.loyalty.listTransactions(CURRENT_CUSTOMER_ID), [backend]);
}

export function useMenu() {
  const backend = useBackend();
  return useAsync(async () => {
    const [categories, products, collections] = await Promise.all([
      backend.menu.listCategories(),
      backend.menu.listProducts(),
      backend.menu.listCollections(),
    ]);
    return { categories, products, collections };
  }, [backend]);
}

export function useRewards() {
  const backend = useBackend();
  return useAsync(() => backend.rewards.listRewards(), [backend]);
}

export function useOrders() {
  const backend = useBackend();
  return useAsync(() => backend.orders.listByCustomer(CURRENT_CUSTOMER_ID), [backend]);
}

export function useOrder(orderId: string | undefined) {
  const backend = useBackend();
  return useAsync(
    () => (orderId ? backend.orders.getById(asId(orderId)) : Promise.resolve(null)),
    [backend, orderId],
  );
}

/** Kicks off the "buy with points" flow (scenario B) and returns the pending redemption + a fresh reward QR token. */
export function useRequestRedemption() {
  const backend = useBackend();
  return useCallback(
    async (rewardId: string) => {
      const reward = await backend.rewards.getReward(asId(rewardId));
      if (!reward) throw new Error(`Unknown reward: ${rewardId}`);
      const redemption = await backend.redemptionService.requestRedemption(
        CURRENT_CUSTOMER_ID,
        reward,
      );
      const token = await backend.qr.issueRewardRedemptionToken(
        CURRENT_CUSTOMER_ID,
        redemption.id,
        90,
      );
      return { redemption, token };
    },
    [backend],
  );
}
