import type { Money } from "@lua/types";

export function toMoney(minorUnits: number, currency = "KZT"): Money {
  return { currency: currency as Money["currency"], minorUnits };
}

export interface ProductRow {
  id: string;
  category_id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  price_minor_units: number;
  currency: string;
  image_url: string | null;
  allergens: string[];
  is_seasonal: boolean;
  is_new: boolean;
  is_must_try: boolean;
}

export function mapProduct(row: ProductRow) {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description,
    price: toMoney(row.price_minor_units, row.currency),
    imageUrl: row.image_url ?? undefined,
    allergens: row.allergens,
    isSeasonal: row.is_seasonal,
    isNew: row.is_new,
    isMustTry: row.is_must_try,
    availability: [],
  };
}

export interface CategoryRow {
  id: string;
  name: Record<string, string>;
  sort_order: number;
  image_url: string | null;
}

export function mapCategory(row: CategoryRow) {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    imageUrl: row.image_url ?? undefined,
  };
}

export interface CollectionRow {
  id: string;
  name: Record<string, string>;
  description: Record<string, string> | null;
  image_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  featured: boolean;
  product_ids: string[];
}

export function mapCollection(row: CollectionRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    imageUrl: row.image_url ?? undefined,
    startsAt: row.starts_at ?? undefined,
    endsAt: row.ends_at ?? undefined,
    featured: row.featured,
    productIds: row.product_ids,
  };
}

export interface OrderRow {
  id: string;
  external_order_code: string | null;
  customer_id: string | null;
  location_id: string;
  staff_user_id: string | null;
  subtotal_minor_units: number;
  discount_minor_units: number;
  total_minor_units: number;
  currency: string;
  status: string;
  points_earned: number;
  created_at: string;
  completed_at: string | null;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price_minor_units: number;
  line_total_minor_units: number;
}

export function mapOrder(row: OrderRow, items: OrderItemRow[]) {
  return {
    id: row.id,
    externalOrderCode: row.external_order_code ?? undefined,
    customerId: row.customer_id ?? undefined,
    locationId: row.location_id,
    staffUserId: row.staff_user_id ?? undefined,
    items: items.map((item) => ({
      id: item.id,
      productId: item.product_id ?? undefined,
      productName: item.product_name,
      quantity: item.quantity,
      unitPrice: toMoney(item.unit_price_minor_units),
      lineTotal: toMoney(item.line_total_minor_units),
    })),
    subtotal: toMoney(row.subtotal_minor_units, row.currency),
    discount: toMoney(row.discount_minor_units, row.currency),
    total: toMoney(row.total_minor_units, row.currency),
    status: row.status,
    pointsEarned: row.points_earned,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
  };
}

export interface LoyaltyTransactionRow {
  id: string;
  customer_id: string;
  type: string;
  points: number;
  order_id: string | null;
  reward_redemption_id: string | null;
  performed_by_staff_id: string | null;
  reason: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function mapLoyaltyTransaction(row: LoyaltyTransactionRow) {
  return {
    id: row.id,
    accountId: row.customer_id,
    customerId: row.customer_id,
    type: row.type,
    points: row.points,
    orderId: row.order_id ?? undefined,
    rewardRedemptionId: row.reward_redemption_id ?? undefined,
    performedByStaffId: row.performed_by_staff_id ?? undefined,
    reason: row.reason,
    metadata: row.metadata ?? undefined,
    createdAt: row.created_at,
  };
}

export interface RewardRow {
  id: string;
  title: Record<string, string>;
  description: Record<string, string> | null;
  image_url: string | null;
  linked_product_id: string | null;
  points_cost: number;
  is_active: boolean;
  per_customer_limit: number | null;
  per_customer_limit_window_days: number | null;
  stock: number | null;
}

export function mapReward(row: RewardRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    imageUrl: row.image_url ?? undefined,
    linkedProductId: row.linked_product_id ?? undefined,
    pointsCost: row.points_cost,
    isActive: row.is_active,
    perCustomerLimit: row.per_customer_limit,
    perCustomerLimitWindowDays: row.per_customer_limit_window_days,
    stock: row.stock,
  };
}

export interface RedemptionRow {
  id: string;
  reward_id: string;
  customer_id: string;
  points_cost: number;
  status: string;
  fulfilled_by_staff_id: string | null;
  fulfilled_at: string | null;
  loyalty_transaction_id: string | null;
  created_at: string;
  expires_at: string;
}

export function mapRedemption(row: RedemptionRow) {
  return {
    id: row.id,
    rewardId: row.reward_id,
    customerId: row.customer_id,
    pointsCost: row.points_cost,
    status: row.status,
    fulfilledByStaffId: row.fulfilled_by_staff_id ?? undefined,
    fulfilledAt: row.fulfilled_at ?? undefined,
    loyaltyTransactionId: row.loyalty_transaction_id ?? undefined,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export interface LocationRow {
  id: string;
  name: string;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  open_hours: string;
  is_active: boolean;
}

export function mapLocation(row: LocationRow) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    phone: row.phone ?? undefined,
    openHours: row.open_hours,
    isActive: row.is_active,
  };
}

export interface CustomerRow {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  birth_date: string | null;
  preferred_locale: string;
  home_location_id: string | null;
  favorite_product_ids: string[];
  marketing_opt_in: boolean;
  created_at: string;
  email: string;
}

export function mapCustomer(row: CustomerRow) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name ?? undefined,
    phone: row.phone,
    email: row.email,
    birthDate: row.birth_date ?? undefined,
    preferredLocale: row.preferred_locale,
    homeLocationId: row.home_location_id ?? undefined,
    favoriteProductIds: row.favorite_product_ids,
    marketingOptIn: row.marketing_opt_in,
    createdAt: row.created_at,
  };
}

export interface StaffRow {
  id: string;
  email: string;
  display_name: string;
  role: string;
  location_id: string;
  active: boolean;
  created_at: string;
}

export function mapStaff(row: StaffRow) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    locationId: row.location_id,
    active: row.active,
    createdAt: row.created_at,
  };
}

export interface LoyaltyProgramRow {
  id: string;
  is_active: boolean;
  earn_rate_per_currency_unit: string;
  points_rounding_strategy: string;
  min_order_amount_minor_units: number;
  birthday_bonus_points: number;
  points_expire_after_days: number | null;
  tiers: Array<{ name: string; minLifetimePoints: number; earnRateMultiplier: number }>;
  qr_token_ttl_seconds: number;
}

export function mapLoyaltyProgram(row: LoyaltyProgramRow) {
  return {
    id: row.id,
    isActive: row.is_active,
    earnRatePerCurrencyUnit: Number(row.earn_rate_per_currency_unit),
    pointsRoundingStrategy: row.points_rounding_strategy,
    minOrderAmountForEarnMinorUnits: row.min_order_amount_minor_units,
    birthdayBonusPoints: row.birthday_bonus_points,
    pointsExpireAfterDays: row.points_expire_after_days,
    tiers: row.tiers,
    qrTokenTtlSeconds: row.qr_token_ttl_seconds,
  };
}
