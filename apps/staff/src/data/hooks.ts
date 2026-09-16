import { useCallback } from "react";
import { asId } from "@lua/types";
import { APP_CONFIG } from "@lua/config";
import type { ServerOrder, ServerScanSummary } from "@lua/data-server";
import { useBackend } from "../backend/useBackend";
import { useRequiredStaff } from "../session/useSession";
import { useAsync } from "./useAsync";
import { apiClient } from "./apiClient";

const isServerMode = APP_CONFIG.dataMode === "server";

export function useLocations() {
  const backend = useBackend();
  return useAsync(async () => {
    if (isServerMode) return apiClient.listLocations();
    return backend.store.locations;
  }, [backend]);
}

export interface OpenOrderView {
  id: string;
  externalOrderCode?: string;
  items: Array<{ productName: string; quantity: number }>;
  total: { currency: string; minorUnits: number };
}

/** Orders a Staff device can attach after resolving an identity QR (Scenario A). */
export function useOpenOrders() {
  const backend = useBackend();
  return useAsync<OpenOrderView[]>(async () => {
    if (isServerMode) {
      const orders: ServerOrder[] = await apiClient.listOpenOrders();
      return orders.map((o) => ({
        id: o.id,
        externalOrderCode: o.externalOrderCode,
        items: o.items.map((i) => ({ productName: i.productName, quantity: i.quantity })),
        total: o.total,
      }));
    }
    return backend.store.orders
      .filter((o) => o.status === "OPEN" || (!o.customerId && o.status !== "COMPLETED"))
      .map((o) => ({
        id: o.id,
        items: o.items.map((i) => ({ productName: i.productName, quantity: i.quantity })),
        total: o.total,
      }));
  }, [backend]);
}

export function useShiftLog() {
  const backend = useBackend();
  const staff = useRequiredStaff();
  return useAsync<
    Array<{ id: string; reason: string; points: number; createdAt: string }>
  >(async () => {
    if (isServerMode) return apiClient.getShiftLog();
    return backend.store.loyaltyTransactions
      .filter((tx) => tx.performedByStaffId === staff.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20)
      .map((tx) => ({
        id: tx.id,
        reason: tx.reason,
        points: tx.points,
        createdAt: tx.createdAt,
      }));
  }, [backend, staff.id]);
}

/** Resolves a scanned/pasted raw QR token into the minimal staff-facing summary. */
export function useResolveQrToken() {
  const backend = useBackend();
  return useCallback(
    async (token: string): Promise<ServerScanSummary> => {
      if (isServerMode) return apiClient.resolveQr(token);
      const verification = await backend.qr.verify(token);
      if (!verification.ok) {
        throw new Error(verification.reason);
      }
      const customer = await backend.customers.getStaffFacingView(
        verification.token.customerId,
      );
      const account = await backend.loyalty.getAccount(verification.token.customerId);
      if (!customer) throw new Error("QR_INVALID");
      if (verification.token.purpose === "IDENTITY") {
        return {
          purpose: "IDENTITY",
          customer: {
            id: customer.id,
            displayName: customer.displayName,
            maskedPhone: customer.maskedPhone,
            balance: account.pointsBalance,
          },
        };
      }
      const redemption = verification.token.rewardRedemptionId
        ? await backend.rewards.getRedemption(verification.token.rewardRedemptionId)
        : null;
      const reward = redemption
        ? await backend.rewards.getReward(redemption.rewardId)
        : null;
      return {
        purpose: "REWARD_REDEMPTION",
        customer: {
          id: customer.id,
          displayName: customer.displayName,
          maskedPhone: customer.maskedPhone,
          balance: account.pointsBalance,
        },
        redemption:
          redemption && reward
            ? {
                id: redemption.id,
                pointsCost: redemption.pointsCost,
                rewardTitle: reward.title,
                expiresAt: redemption.expiresAt,
              }
            : undefined,
      };
    },
    [backend],
  );
}

export function useConfirmOrderEarn() {
  const backend = useBackend();
  const staff = useRequiredStaff();
  return useCallback(
    async (orderId: string, customerId: string) => {
      if (isServerMode) return apiClient.confirmOrderEarn(orderId, customerId);
      const completed = await backend.orders.assignToCustomer(
        asId(orderId),
        asId<"Customer">(customerId),
      );
      const tx = await backend.earnService.earnForCompletedOrder(
        completed,
        asId(staff.id),
      );
      return {
        order: {
          id: completed.id,
          status: "COMPLETED",
          pointsEarned: tx?.points ?? 0,
          completedAt: new Date().toISOString(),
        },
      };
    },
    [backend, staff.id],
  );
}

export function useConfirmRedemption() {
  const backend = useBackend();
  const staff = useRequiredStaff();
  return useCallback(
    async (redemptionId: string) => {
      if (isServerMode) return apiClient.confirmRedemption(redemptionId);
      const { redemption, transaction } =
        await backend.redemptionService.fulfillRedemption(redemptionId, asId(staff.id));
      const account = await backend.loyalty.getAccount(redemption.customerId);
      return {
        redemption: {
          id: redemption.id,
          status: redemption.status,
          fulfilledAt: redemption.fulfilledAt ?? "",
        },
        transaction: { id: transaction.id, points: transaction.points },
        newBalance: account.pointsBalance,
      };
    },
    [backend, staff.id],
  );
}
