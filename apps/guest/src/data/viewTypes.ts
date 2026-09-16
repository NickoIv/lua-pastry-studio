import type { LocalizedText, Money } from "@lua/types";

/**
 * The shapes Guest's screens actually render — loose enough that both
 * `@lua/domain`'s mock repositories (mock mode) and `@lua/data-server`'s
 * DTOs (server mode) satisfy them structurally, so hooks.ts can return
 * either without a screen needing to know which one is live. See
 * docs/ARCHITECTURE.md "Repository adapters".
 */
export interface GuestCustomer {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
}

export interface GuestLoyaltyAccount {
  pointsBalance: number;
  lifetimePointsEarned: number;
  tier?: string;
}

export interface GuestLoyaltyTransaction {
  id: string;
  type: string;
  points: number;
  reason: string;
  createdAt: string;
}

export interface GuestProduct {
  id: string;
  categoryId: string;
  name: LocalizedText;
  price: Money;
  imageUrl?: string;
  isMustTry: boolean;
  isNew: boolean;
  isSeasonal: boolean;
  /**
   * False when the product is active (still shown) but out of stock at
   * every location right now — rendered as an explicit "Нет в наличии"
   * treatment rather than hiding the product. See
   * docs/ARCHITECTURE.md "Admin catalog CMS".
   */
  inStockAnywhere: boolean;
}

export interface GuestCategory {
  id: string;
  name: LocalizedText;
  sortOrder: number;
}

export interface GuestCollection {
  id: string;
  name: LocalizedText;
  description?: LocalizedText;
  imageUrl?: string;
  featured: boolean;
  productIds: string[];
}

export interface GuestReward {
  id: string;
  title: LocalizedText;
  pointsCost: number;
}

export interface GuestOrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
}

export interface GuestOrder {
  id: string;
  createdAt: string;
  items: GuestOrderItem[];
  total: Money;
  pointsEarned: number;
}
