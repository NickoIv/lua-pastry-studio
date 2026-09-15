import type { Id, ISODateTimeString, LocaleCode } from "./common";

export type CustomerId = Id<"Customer">;

export interface Customer {
  id: CustomerId;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  birthDate?: string;
  preferredLocale: LocaleCode;
  homeLocationId?: string;
  createdAt: ISODateTimeString;
}

export interface CustomerProfile extends Customer {
  favoriteProductIds: string[];
  marketingOptIn: boolean;
  notes?: string;
}

/**
 * The reduced view of a customer that a staff device is allowed to see
 * after a QR scan. Deliberately excludes birthDate, full phone, email,
 * order history and admin-only fields — see docs/ARCHITECTURE.md RBAC.
 */
export interface StaffFacingCustomer {
  id: CustomerId;
  displayName: string;
  loyaltyTier?: string;
  maskedPhone: string;
}
