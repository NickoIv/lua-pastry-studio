import { ApiClient, type ApiClientOptions } from "./ApiClient";
import type {
  AdjustPointsResult,
  AdminDashboard,
  AuditLogEntry,
  CustomerDetail,
  CustomerListItem,
  MediaAsset,
  NotificationPreferences,
  Paginated,
  ProductAvailabilityRow,
  ServerCategory,
  ServerCollection,
  ServerCustomer,
  ServerLocation,
  ServerLoyaltyAccount,
  ServerLoyaltyProgram,
  ServerLoyaltyTransaction,
  ServerOrder,
  ServerProduct,
  ServerQrToken,
  ServerRedemption,
  ServerReward,
  ServerScanSummary,
  ServerStaff,
} from "./types";
import type { LocalizedText } from "@lua/types";

export interface CategoryInput {
  name: LocalizedText;
  slug?: string;
  sortOrder?: number;
  active?: boolean;
}

export interface ProductInput {
  categoryId: string;
  name: LocalizedText;
  description?: LocalizedText;
  /** Whole KZT (major units) — the server converts to minor units. */
  price: number;
  allergens?: string[];
  isSeasonal?: boolean;
  isNew?: boolean;
  isMustTry?: boolean;
  active?: boolean;
  imageUrl?: string | null;
  sortOrder?: number;
}

export interface CollectionInput {
  name: LocalizedText;
  subtitle?: LocalizedText;
  description?: LocalizedText;
  active?: boolean;
  featured?: boolean;
  sortOrder?: number;
  productIds?: string[];
  startsAt?: string | null;
  endsAt?: string | null;
  imageUrl?: string | null;
}

export interface RewardInput {
  title: LocalizedText;
  description?: LocalizedText;
  linkedProductId?: string | null;
  pointsCost: number;
  active?: boolean;
  perCustomerLimit?: number | null;
  perCustomerLimitWindowDays?: number | null;
  stock?: number | null;
}

export interface StaffCreateInput {
  displayName: string;
  role: string;
  locationIds: string[];
  primaryLocationId: string;
  staffCode: string;
  /** At least one login method required — PIN (preferred) or email+password. */
  pin?: string;
  email?: string;
  password?: string;
}

export interface StaffUpdateInput {
  displayName?: string;
  role?: string;
  active?: boolean;
  locationId?: string;
}

export interface StaffLocationsInput {
  locationIds: string[];
  primaryLocationId: string;
}

export interface LocationInput {
  name: string;
  shortName: string;
  address: string;
  city: string;
  phone?: string;
  openHours: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CustomerUpdateInput {
  firstName?: string;
  lastName?: string | null;
  birthDate?: string | null;
  homeLocationId?: string | null;
}

export interface AdjustPointsInput {
  points: number;
  reason: string;
  idempotencyKey?: string;
}

export interface AuditLogQuery {
  action?: string;
  actorStaffId?: string;
  targetType?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface CustomerSession {
  token: string;
  customer: { id: string; firstName: string; lastName?: string; phone: string };
}

export interface StaffSession {
  token: string;
  staff: { id: string; displayName: string; role: string; locationId: string };
}

/**
 * The one object every app's "server mode" backend context wraps.
 * Mirrors packages/server's REST surface 1:1 — see docs/ARCHITECTURE.md
 * "Repository adapters" for how this coexists with @lua/domain's mock
 * repositories in mock mode.
 */
export class LuaApiClient {
  readonly http: ApiClient;

  constructor(options: ApiClientOptions) {
    this.http = new ApiClient(options);
  }

  setToken(token: string | null) {
    this.http.setToken(token);
  }

  // ---- Auth --------------------------------------------------------------
  loginCustomer(email: string, password: string) {
    return this.http.post<CustomerSession>("/auth/customer/login", { email, password });
  }
  loginStaff(email: string, password: string) {
    return this.http.post<StaffSession>("/auth/staff/login", { email, password });
  }
  loginStaffByCode(staffCode: string, pin: string) {
    return this.http.post<StaffSession>("/auth/staff/login-pin", { staffCode, pin });
  }

  // ---- Menu ----------------------------------------------------------------
  listCategories() {
    return this.http.get<ServerCategory[]>("/menu/categories");
  }
  listProducts() {
    return this.http.get<ServerProduct[]>("/menu/products");
  }
  listCollections() {
    return this.http.get<ServerCollection[]>("/menu/collections");
  }
  listLocations() {
    return this.http.get<ServerLocation[]>("/locations");
  }

  // ---- Guest: profile / loyalty / orders / rewards / QR ----------------
  getMyProfile() {
    return this.http.get<ServerCustomer>("/me/profile");
  }
  updateMyProfile(patch: CustomerUpdateInput) {
    return this.http.patch<ServerCustomer>("/me/profile", patch);
  }
  getMyLoyaltyAccount() {
    return this.http.get<ServerLoyaltyAccount>("/me/loyalty/account");
  }
  getMyLoyaltyTransactions() {
    return this.http.get<ServerLoyaltyTransaction[]>("/me/loyalty/transactions");
  }
  getLoyaltyProgram() {
    return this.http.get<ServerLoyaltyProgram>("/loyalty/program");
  }
  getMyOrders() {
    return this.http.get<ServerOrder[]>("/me/orders");
  }
  getMyOrder(orderId: string) {
    return this.http.get<ServerOrder>(`/me/orders/${orderId}`);
  }
  listRewards() {
    return this.http.get<ServerReward[]>("/rewards");
  }
  getMyRedemptions() {
    return this.http.get<ServerRedemption[]>("/me/redemptions");
  }
  requestRedemption(rewardId: string) {
    return this.http.post<{ redemption: ServerRedemption; qr: ServerQrToken }>(
      `/me/rewards/${rewardId}/redeem`,
    );
  }
  issueIdentityQr() {
    return this.http.post<ServerQrToken>("/me/qr/identity");
  }

  // ---- Staff ---------------------------------------------------------------
  getMyStaffProfile() {
    return this.http.get<ServerStaff>("/staff/me");
  }
  resolveQr(token: string) {
    return this.http.post<ServerScanSummary>("/staff/qr/resolve", { token });
  }
  listOpenOrders() {
    return this.http.get<ServerOrder[]>("/staff/orders/open");
  }
  confirmOrderEarn(orderId: string, customerId: string) {
    return this.http.post<{
      order: { id: string; status: string; pointsEarned: number; completedAt: string };
    }>(`/staff/orders/${orderId}/confirm-earn`, { customerId });
  }
  confirmRedemption(redemptionId: string) {
    return this.http.post<{
      redemption: { id: string; status: string; fulfilledAt: string };
      transaction: { id: string; points: number };
      newBalance: number;
    }>(`/staff/redemptions/${redemptionId}/confirm`);
  }
  getShiftLog() {
    return this.http.get<
      Array<{
        id: string;
        reason: string;
        points: number;
        type: string;
        createdAt: string;
      }>
    >("/staff/shift-log");
  }

  // ---- Admin -------------------------------------------------------------
  getAdminDashboard() {
    return this.http.get<AdminDashboard>("/admin/dashboard");
  }
  listAdminOrders() {
    return this.http.get<ServerOrder[]>("/admin/orders");
  }
  listAdminStaff() {
    return this.http.get<ServerStaff[]>("/admin/staff");
  }
  updateLoyaltyProgram(
    patch: Partial<{
      earnRatePerCurrencyUnit: number;
      birthdayBonusPoints: number;
      pointsExpireAfterDays: number | null;
      isActive: boolean;
      pointsRoundingStrategy: string;
      qrTokenTtlSeconds: number;
    }>,
  ) {
    return this.http.patch<ServerLoyaltyProgram>("/admin/loyalty/program", patch);
  }

  // ---- Admin: catalog CMS (categories/products/availability/collections/rewards) ----
  listAdminCategories() {
    return this.http.get<ServerCategory[]>("/admin/categories");
  }
  createCategory(input: CategoryInput) {
    return this.http.post<ServerCategory>("/admin/categories", input);
  }
  updateCategory(id: string, patch: Partial<CategoryInput>) {
    return this.http.patch<ServerCategory>(`/admin/categories/${id}`, patch);
  }
  deleteCategory(id: string) {
    return this.http.delete(`/admin/categories/${id}`);
  }

  listAdminProducts() {
    return this.http.get<ServerProduct[]>("/admin/products");
  }
  createProduct(input: ProductInput) {
    return this.http.post<ServerProduct>("/admin/products", input);
  }
  updateProduct(id: string, patch: Partial<ProductInput>) {
    return this.http.patch<ServerProduct>(`/admin/products/${id}`, patch);
  }
  moveProduct(id: string, direction: "up" | "down") {
    return this.http.post(`/admin/products/${id}/move`, { direction });
  }

  getProductAvailability(productId: string) {
    return this.http.get<ProductAvailabilityRow[]>(`/admin/products/${productId}/availability`);
  }
  setProductAvailability(
    productId: string,
    input: { locationId: string; inStock: boolean; dailyLimit?: number | null; unavailableReason?: string | null },
  ) {
    return this.http.put(`/admin/products/${productId}/availability`, input);
  }

  listAdminCollections() {
    return this.http.get<ServerCollection[]>("/admin/collections");
  }
  createCollection(input: CollectionInput) {
    return this.http.post<ServerCollection>("/admin/collections", input);
  }
  updateCollection(id: string, patch: Partial<CollectionInput>) {
    return this.http.patch<ServerCollection>(`/admin/collections/${id}`, patch);
  }
  deleteCollection(id: string) {
    return this.http.delete(`/admin/collections/${id}`);
  }

  listAdminRewards() {
    return this.http.get<ServerReward[]>("/admin/rewards");
  }
  createReward(input: RewardInput) {
    return this.http.post<ServerReward>("/admin/rewards", input);
  }
  updateReward(id: string, patch: Partial<RewardInput>) {
    return this.http.patch<ServerReward>(`/admin/rewards/${id}`, patch);
  }

  // ---- Admin: staff management --------------------------------------
  createStaff(input: StaffCreateInput) {
    return this.http.post<ServerStaff>("/admin/staff", input);
  }
  updateStaff(id: string, patch: StaffUpdateInput) {
    return this.http.patch<ServerStaff>(`/admin/staff/${id}`, patch);
  }
  setStaffLocations(id: string, input: StaffLocationsInput) {
    return this.http.put<ServerStaff>(`/admin/staff/${id}/locations`, input);
  }
  resetStaffPin(id: string, pin: string) {
    return this.http.post<{ ok: true }>(`/admin/staff/${id}/reset-pin`, { pin });
  }

  // ---- Admin: locations --------------------------------------------------
  createLocation(input: LocationInput) {
    return this.http.post<ServerLocation>("/admin/locations", input);
  }
  updateLocation(id: string, patch: Partial<LocationInput>) {
    return this.http.patch<ServerLocation>(`/admin/locations/${id}`, patch);
  }

  // ---- Admin: customer management -------------------------------------
  listAdminCustomers(params?: { q?: string; page?: number; pageSize?: number }) {
    const query = new URLSearchParams();
    if (params?.q) query.set("q", params.q);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("pageSize", String(params.pageSize));
    const qs = query.toString();
    return this.http.get<Paginated<CustomerListItem>>(`/admin/customers${qs ? `?${qs}` : ""}`);
  }
  getCustomerDetail(id: string) {
    return this.http.get<CustomerDetail>(`/admin/customers/${id}`);
  }
  updateCustomer(id: string, patch: CustomerUpdateInput) {
    return this.http.patch<ServerCustomer>(`/admin/customers/${id}`, patch);
  }
  adjustCustomerPoints(id: string, input: AdjustPointsInput) {
    return this.http.post<AdjustPointsResult>(`/admin/customers/${id}/adjust-points`, input);
  }

  // ---- Admin: audit log -------------------------------------------------
  listAuditLog(query?: AuditLogQuery) {
    const params = new URLSearchParams();
    if (query?.action) params.set("action", query.action);
    if (query?.actorStaffId) params.set("actorStaffId", query.actorStaffId);
    if (query?.targetType) params.set("targetType", query.targetType);
    if (query?.from) params.set("from", query.from);
    if (query?.to) params.set("to", query.to);
    if (query?.page) params.set("page", String(query.page));
    if (query?.pageSize) params.set("pageSize", String(query.pageSize));
    const qs = params.toString();
    return this.http.get<Paginated<AuditLogEntry>>(`/admin/audit-log${qs ? `?${qs}` : ""}`);
  }

  // ---- Guest: push notifications ------------------------------------------
  getPushPublicKey() {
    return this.http.get<{ publicKey: string | null }>("/push/public-key");
  }
  subscribePush(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    return this.http.post<{ ok: true }>("/me/push-subscriptions", subscription);
  }
  unsubscribePush(endpoint: string) {
    return this.http.delete<{ ok: true }>(`/me/push-subscriptions?endpoint=${encodeURIComponent(endpoint)}`);
  }
  getNotificationPreferences() {
    return this.http.get<NotificationPreferences>("/me/notification-preferences");
  }
  updateNotificationPreferences(patch: Partial<NotificationPreferences>) {
    return this.http.patch<NotificationPreferences>("/me/notification-preferences", patch);
  }

  // ---- Admin: media upload -----------------------------------------------
  uploadMedia(file: File, kind: "product" | "collection", altText?: string) {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    if (altText) form.append("altText", altText);
    return this.http.postForm<MediaAsset>("/admin/media", form);
  }
  deleteMedia(id: string) {
    return this.http.delete(`/admin/media/${id}`);
  }
}
