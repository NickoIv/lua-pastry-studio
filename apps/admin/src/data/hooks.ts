import { useCallback } from "react";
import { sumMoney, type Money } from "@lua/types";
import { APP_CONFIG } from "@lua/config";
import { balanceFromLedger } from "@lua/domain";
import type { CategoryInput, CollectionInput, ProductInput, RewardInput } from "@lua/data-server";
import { useBackend } from "../backend/useBackend";
import { apiClient } from "./apiClient";
import { useAsync } from "./useAsync";

export const isServerMode = APP_CONFIG.dataMode === "server";

/**
 * Catalog CMS writes (create/update/archive/delete) only exist in
 * server mode — mock mode has no backend to persist them to, and
 * keeps working exactly as before (read-only demo data). Screens gate
 * their create/edit affordances on `isServerMode` directly rather than
 * this file quietly no-op'ing a write, so the UI is honest about it.
 */
function requireServerMode(): void {
  if (!isServerMode) {
    throw new Error("Catalog editing requires server mode (VITE_LUA_DATA_MODE=server) — see docs/LOCAL-BACKEND.md");
  }
}

export interface DashboardView {
  revenue: Money;
  ordersCompleted: number;
  activeMembers: number;
  pointsIssued30d: number;
  pointsRedeemed30d: number;
}

export function useDashboard() {
  const backend = useBackend();
  return useAsync<DashboardView>(async () => {
    if (isServerMode) return apiClient.getAdminDashboard();
    const orders = backend.store.orders.filter((o) => o.status === "COMPLETED");
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentTx = backend.store.loyaltyTransactions.filter(
      (t) => new Date(t.createdAt).getTime() > cutoff,
    );
    return {
      revenue: sumMoney(orders.map((o) => o.total)),
      ordersCompleted: orders.length,
      activeMembers: backend.store.customers.length,
      pointsIssued30d: recentTx
        .filter((t) => t.points > 0)
        .reduce((s, t) => s + t.points, 0),
      pointsRedeemed30d: recentTx
        .filter((t) => t.points < 0)
        .reduce((s, t) => s - t.points, 0),
    };
  }, [backend]);
}

export function useAdminOrders() {
  const backend = useBackend();
  return useAsync(async () => {
    if (isServerMode) return apiClient.listAdminOrders();
    return [...backend.store.orders].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }, [backend]);
}

export function useAdminMenu() {
  const backend = useBackend();
  return useAsync(async () => {
    if (isServerMode) {
      // The admin-only endpoints (unlike /menu/*) include inactive/archived
      // rows too, since the whole point of this screen is managing them.
      const [products, categories] = await Promise.all([
        apiClient.listAdminProducts(),
        apiClient.listAdminCategories(),
      ]);
      return { products, categories };
    }
    return { products: backend.store.products, categories: backend.store.categories };
  }, [backend]);
}

export function useAdminRewards() {
  const backend = useBackend();
  return useAsync(async () => {
    if (isServerMode) return apiClient.listAdminRewards();
    return backend.store.rewards;
  }, [backend]);
}

export function useAdminCollections() {
  const backend = useBackend();
  return useAsync(async () => {
    if (isServerMode) return apiClient.listAdminCollections();
    return backend.store.collections;
  }, [backend]);
}

// ---- Catalog CMS mutations (server mode only — see requireServerMode) ----

export function useCreateCategory() {
  return useCallback((input: CategoryInput) => {
    requireServerMode();
    return apiClient.createCategory(input);
  }, []);
}
export function useUpdateCategory() {
  return useCallback((id: string, patch: Partial<CategoryInput>) => {
    requireServerMode();
    return apiClient.updateCategory(id, patch);
  }, []);
}
export function useDeleteCategory() {
  return useCallback((id: string) => {
    requireServerMode();
    return apiClient.deleteCategory(id);
  }, []);
}

export function useCreateProduct() {
  return useCallback((input: ProductInput) => {
    requireServerMode();
    return apiClient.createProduct(input);
  }, []);
}
export function useUpdateProduct() {
  return useCallback((id: string, patch: Partial<ProductInput>) => {
    requireServerMode();
    return apiClient.updateProduct(id, patch);
  }, []);
}
export function useSetProductAvailability() {
  return useCallback(
    (
      productId: string,
      input: { locationId: string; inStock: boolean; dailyLimit?: number | null; unavailableReason?: string | null },
    ) => {
      requireServerMode();
      return apiClient.setProductAvailability(productId, input);
    },
    [],
  );
}
export function useProductAvailability(productId: string | null) {
  return useAsync(async () => {
    if (!productId || !isServerMode) return [];
    return apiClient.getProductAvailability(productId);
  }, [productId]);
}

export function useCreateReward() {
  return useCallback((input: RewardInput) => {
    requireServerMode();
    return apiClient.createReward(input);
  }, []);
}
export function useUpdateReward() {
  return useCallback((id: string, patch: Partial<RewardInput>) => {
    requireServerMode();
    return apiClient.updateReward(id, patch);
  }, []);
}

export function useCreateCollection() {
  return useCallback((input: CollectionInput) => {
    requireServerMode();
    return apiClient.createCollection(input);
  }, []);
}
export function useUpdateCollection() {
  return useCallback((id: string, patch: Partial<CollectionInput>) => {
    requireServerMode();
    return apiClient.updateCollection(id, patch);
  }, []);
}
export function useDeleteCollection() {
  return useCallback((id: string) => {
    requireServerMode();
    return apiClient.deleteCollection(id);
  }, []);
}

export function useAdminCustomers() {
  const backend = useBackend();
  return useAsync(async () => {
    if (isServerMode) return apiClient.listAdminCustomers();
    return backend.store.customers.map((c) => ({
      ...c,
      pointsBalance: balanceFromLedger(
        backend.store.loyaltyTransactions.filter((t) => t.customerId === c.id),
      ),
    }));
  }, [backend]);
}

export function useAdminStaff() {
  const backend = useBackend();
  return useAsync(async () => {
    if (isServerMode) return apiClient.listAdminStaff();
    return backend.store.staffUsers;
  }, [backend]);
}

export function useLocations() {
  const backend = useBackend();
  return useAsync(async () => {
    if (isServerMode) return apiClient.listLocations();
    return backend.store.locations;
  }, [backend]);
}

export function useLoyaltyProgram() {
  const backend = useBackend();
  return useAsync(async () => {
    if (isServerMode) return apiClient.getLoyaltyProgram();
    return backend.store.loyaltyProgram;
  }, [backend]);
}

export function useUpdateLoyaltyProgram() {
  const backend = useBackend();
  return useCallback(
    async (
      patch: Partial<{
        earnRatePerCurrencyUnit: number;
        birthdayBonusPoints: number;
        pointsExpireAfterDays: number | null;
        qrTokenTtlSeconds: number;
      }>,
    ) => {
      if (isServerMode) return apiClient.updateLoyaltyProgram(patch);
      return backend.loyalty.updateProgram(patch);
    },
    [backend],
  );
}
