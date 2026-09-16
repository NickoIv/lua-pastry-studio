import { ApiClient, type ApiClientOptions } from "./ApiClient";
import type {
  AdminDashboard,
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
  listAdminCustomers() {
    return this.http.get<ServerCustomer[]>("/admin/customers");
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
}
