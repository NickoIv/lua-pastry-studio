import type { LocalizedText, Money } from "@lua/types";

export interface ServerCustomer {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email: string;
  birthDate?: string;
  preferredLocale: string;
  homeLocationId?: string;
  favoriteProductIds: string[];
  marketingOptIn: boolean;
  createdAt: string;
  pointsBalance?: number;
}

export interface ServerStaff {
  id: string;
  displayName: string;
  role: string;
  locationId: string;
  active: boolean;
  createdAt?: string;
}

export interface ServerLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  openHours: string;
  isActive: boolean;
}

export interface ServerCategory {
  id: string;
  name: LocalizedText;
  sortOrder: number;
  imageUrl?: string;
  slug?: string;
  active?: boolean;
}

export interface ServerProduct {
  id: string;
  categoryId: string;
  name: LocalizedText;
  description: LocalizedText;
  price: Money;
  imageUrl?: string;
  allergens: string[];
  isSeasonal: boolean;
  isNew: boolean;
  isMustTry: boolean;
  active?: boolean;
  inStockAnywhere?: boolean;
}

export interface ServerCollection {
  id: string;
  name: LocalizedText;
  subtitle?: LocalizedText;
  description?: LocalizedText;
  imageUrl?: string;
  startsAt?: string;
  endsAt?: string;
  featured: boolean;
  productIds: string[];
  active?: boolean;
  sortOrder?: number;
}

export interface ProductAvailabilityRow {
  productId: string;
  locationId: string;
  inStock: boolean;
  dailyLimit: number | null;
  unavailableReason: string | null;
}

export interface ServerOrderItem {
  id: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
}

export interface ServerOrder {
  id: string;
  externalOrderCode?: string;
  customerId?: string;
  locationId: string;
  staffUserId?: string;
  items: ServerOrderItem[];
  subtotal: Money;
  discount: Money;
  total: Money;
  status: string;
  pointsEarned: number;
  createdAt: string;
  completedAt?: string;
}

export interface ServerLoyaltyAccount {
  customerId: string;
  pointsBalance: number;
  lifetimePointsEarned: number;
  tier: string;
  updatedAt: string;
}

export interface ServerLoyaltyTransaction {
  id: string;
  customerId: string;
  type: string;
  points: number;
  orderId?: string;
  rewardRedemptionId?: string;
  performedByStaffId?: string;
  reason: string;
  createdAt: string;
}

export interface ServerLoyaltyProgram {
  id: string;
  isActive: boolean;
  earnRatePerCurrencyUnit: number;
  pointsRoundingStrategy: string;
  minOrderAmountForEarnMinorUnits: number;
  birthdayBonusPoints: number;
  pointsExpireAfterDays: number | null;
  tiers: Array<{ name: string; minLifetimePoints: number; earnRateMultiplier: number }>;
  qrTokenTtlSeconds: number;
}

export interface ServerReward {
  id: string;
  title: LocalizedText;
  description?: LocalizedText;
  imageUrl?: string;
  linkedProductId?: string;
  pointsCost: number;
  isActive: boolean;
  perCustomerLimit: number | null;
  perCustomerLimitWindowDays: number | null;
  stock: number | null;
}

export interface ServerRedemption {
  id: string;
  rewardId: string;
  customerId: string;
  pointsCost: number;
  status: string;
  fulfilledByStaffId?: string;
  fulfilledAt?: string;
  createdAt: string;
  expiresAt: string;
}

export interface ServerQrToken {
  token: string;
  purpose: "IDENTITY" | "REWARD_REDEMPTION";
  expiresAt: string;
}

export interface ServerScanSummary {
  purpose: "IDENTITY" | "REWARD_REDEMPTION";
  customer: { id: string; displayName: string; maskedPhone: string; balance: number };
  redemption?: {
    id: string;
    pointsCost: number;
    rewardTitle: LocalizedText;
    expiresAt: string;
  };
}

export interface AdminDashboard {
  revenue: Money;
  ordersCompleted: number;
  activeMembers: number;
  pointsIssued30d: number;
  pointsRedeemed30d: number;
}
