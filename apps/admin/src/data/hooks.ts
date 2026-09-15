import { useCallback } from "react";
import { sumMoney, type Money } from "@lua/types";
import { APP_CONFIG } from "@lua/config";
import { balanceFromLedger } from "@lua/domain";
import { useBackend } from "../backend/useBackend";
import { apiClient } from "./apiClient";
import { useAsync } from "./useAsync";

const isServerMode = APP_CONFIG.dataMode === "server";

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
      const [products, categories] = await Promise.all([
        apiClient.listProducts(),
        apiClient.listCategories(),
      ]);
      return { products, categories };
    }
    return { products: backend.store.products, categories: backend.store.categories };
  }, [backend]);
}

export function useAdminRewards() {
  const backend = useBackend();
  return useAsync(async () => {
    if (isServerMode) return apiClient.listRewards();
    return backend.store.rewards;
  }, [backend]);
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
