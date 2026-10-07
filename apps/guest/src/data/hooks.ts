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
  GuestLocation,
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

/** Tier thresholds for the Club screen's progress ring — kept server-driven rather than hardcoded, since an ADMIN can retune `loyalty_programs.tiers`. */
export function useLoyaltyProgram() {
  const backend = useBackend();
  const { session } = useSession();
  return useAsync(async () => {
    if (isServerMode) return session ? apiClient.getLoyaltyProgram() : null;
    return backend.store.loyaltyProgram;
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
      return {
        categories,
        products: products.map((p) => ({
          ...p,
          description: p.description,
          allergens: p.allergens,
          inStockAnywhere: p.inStockAnywhere ?? true,
          availableLocationIds: p.availableLocationIds ?? [],
        })),
        collections,
      };
    }
    const [categories, products, collections] = await Promise.all([
      backend.menu.listCategories(),
      backend.menu.listProducts(),
      backend.menu.listCollections(),
    ]);
    return {
      categories,
      products: products.map((p) => ({
        ...p,
        description: p.description,
        allergens: p.allergens,
        inStockAnywhere: p.availability.length === 0 || p.availability.some((a) => a.inStock),
        availableLocationIds: p.availability.filter((a) => a.inStock).map((a) => a.locationId),
      })),
      collections,
    };
  }, [backend, session]);
}

export function useProduct(productId: string | undefined) {
  const menu = useMenu();
  return {
    status: menu.status,
    data: menu.status === "success" ? (menu.data.products.find((p) => p.id === productId) ?? null) : null,
  } as const;
}

export function useLocations() {
  const backend = useBackend();
  const { session } = useSession();
  return useAsync<GuestLocation[]>(async () => {
    if (isServerMode) return session ? apiClient.listLocations() : [];
    return backend.store.locations.map((l) => ({
      id: l.id,
      shortName: l.shortName,
      address: l.address,
      openHours: l.openHours,
      isActive: l.isActive,
    }));
  }, [backend, session]);
}

/** Persists the guest's selected "current coffee shop" — see docs/ARCHITECTURE.md "Guest location selection". */
export function useSetMyLocation() {
  const backend = useBackend();
  return useCallback(
    async (locationId: string) => {
      if (isServerMode) {
        await apiClient.updateMyProfile({ homeLocationId: locationId });
        return;
      }
      await backend.customers.update(CURRENT_CUSTOMER_ID, { homeLocationId: asId(locationId) });
    },
    [backend],
  );
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

// ---- Push notifications (server mode only — no mock-mode backend for this) ----

export function usePushPublicKey() {
  return useAsync<string | null>(async () => {
    if (!isServerMode) return null;
    const { publicKey } = await apiClient.getPushPublicKey();
    return publicKey;
  }, []);
}

export function useNotificationPreferences() {
  const { session } = useSession();
  return useAsync(async () => {
    if (!isServerMode || !session) return { loyalty: true, rewards: true, promotions: false };
    return apiClient.getNotificationPreferences();
  }, [session]);
}

export function useUpdateNotificationPreferences() {
  return useCallback((patch: Partial<{ loyalty: boolean; rewards: boolean; promotions: boolean }>) => {
    return apiClient.updateNotificationPreferences(patch);
  }, []);
}

export function useSubscribePush() {
  return useCallback((subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) => {
    return apiClient.subscribePush(subscription);
  }, []);
}

export function useUnsubscribePush() {
  return useCallback((endpoint: string) => {
    return apiClient.unsubscribePush(endpoint);
  }, []);
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
