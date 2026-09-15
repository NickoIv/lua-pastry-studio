import { useCallback } from "react";
import { asId } from "@lua/types";
import { APP_CONFIG } from "@lua/config";
import { useBackend, CURRENT_CUSTOMER_ID } from "../backend/useBackend";
import { useAsync } from "../backend/useAsync";
import { useSession } from "../session/useSession";
import { apiClient } from "./apiClient";
import type {
  GuestCategory,
  GuestCollection,
  GuestCustomer,
  GuestLoyaltyAccount,
  GuestLoyaltyTransaction,
  GuestOrder,
  GuestProduct,
  GuestReward,
} from "./viewTypes";

const isServerMode = APP_CONFIG.dataMode === "server";

export function useCustomerProfile() {
  const backend = useBackend();
  const { session } = useSession();
  return useAsync<GuestCustomer | null>(async () => {
    if (isServerMode) return session ? apiClient.getMyProfile() : null;
    return backend.customers.getById(CURRENT_CUSTOMER_ID);
  }, [backend, session]);
}

export function useLoyaltyAccount() {
  const backend = useBackend();
  const { session } = useSession();
  return useAsync<GuestLoyaltyAccount | null>(async () => {
    if (isServerMode) return session ? apiClient.getMyLoyaltyAccount() : null;
    return backend.loyalty.getAccount(CURRENT_CUSTOMER_ID);
  }, [backend, session]);
}

export function useLoyaltyTransactions() {
  const backend = useBackend();
  const { session } = useSession();
  return useAsync<GuestLoyaltyTransaction[]>(async () => {
    if (isServerMode) return session ? apiClient.getMyLoyaltyTransactions() : [];
    return backend.loyalty.listTransactions(CURRENT_CUSTOMER_ID);
  }, [backend, session]);
}

export function useMenu() {
  const backend = useBackend();
  const { session } = useSession();
  return useAsync<{
    categories: GuestCategory[];
    products: GuestProduct[];
    collections: GuestCollection[];
  }>(async () => {
    if (isServerMode) {
      if (!session) return { categories: [], products: [], collections: [] };
      const [categories, products, collections] = await Promise.all([
        apiClient.listCategories(),
        apiClient.listProducts(),
        apiClient.listCollections(),
      ]);
      return { categories, products, collections };
    }
    const [categories, products, collections] = await Promise.all([
      backend.menu.listCategories(),
      backend.menu.listProducts(),
      backend.menu.listCollections(),
    ]);
    return { categories, products, collections };
  }, [backend, session]);
}

export function useRewards() {
  const backend = useBackend();
  const { session } = useSession();
  return useAsync<GuestReward[]>(async () => {
    if (isServerMode) return session ? apiClient.listRewards() : [];
    return backend.rewards.listRewards();
  }, [backend, session]);
}

export function useOrders() {
  const backend = useBackend();
  const { session } = useSession();
  return useAsync<GuestOrder[]>(async () => {
    if (isServerMode) return session ? apiClient.getMyOrders() : [];
    return backend.orders.listByCustomer(CURRENT_CUSTOMER_ID);
  }, [backend, session]);
}

export function useOrder(orderId: string | undefined) {
  const backend = useBackend();
  const { session } = useSession();
  return useAsync<GuestOrder | null>(async () => {
    if (!orderId) return null;
    if (isServerMode) return session ? apiClient.getMyOrder(orderId) : null;
    return backend.orders.getById(asId(orderId));
  }, [backend, session, orderId]);
}

/** Kicks off the "buy with points" flow (scenario B): request only, never touches the ledger. */
export function useRequestRedemption() {
  const backend = useBackend();
  return useCallback(
    async (rewardId: string) => {
      if (isServerMode) {
        const { redemption, qr } = await apiClient.requestRedemption(rewardId);
        return { redemption, token: qr.token, expiresAt: qr.expiresAt };
      }
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
      return { redemption, token: token.encoded, expiresAt: token.expiresAt };
    },
    [backend],
  );
}

/** Scenario A: the guest's own rotating identity QR. */
export function useIssueIdentityToken() {
  const backend = useBackend();
  return useCallback(async () => {
    if (isServerMode) {
      const issued = await apiClient.issueIdentityQr();
      return { token: issued.token, expiresAt: issued.expiresAt };
    }
    const issued = await backend.qr.issueIdentityToken(
      CURRENT_CUSTOMER_ID,
      APP_CONFIG.qrTokenTtlSeconds,
    );
    return { token: issued.encoded, expiresAt: issued.expiresAt };
  }, [backend]);
}
