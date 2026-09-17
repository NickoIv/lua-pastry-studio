import type { Id, LocalizedText } from "./common";
import type { Money } from "./money";
import type { LocationId } from "./staff";
import type { CollectionId } from "./location";

export type ProductId = Id<"Product">;
export type ProductCategoryId = Id<"ProductCategory">;

export interface ProductCategory {
  id: ProductCategoryId;
  name: LocalizedText;
  sortOrder: number;
  imageUrl?: string;
}

export interface ProductAvailability {
  locationId: LocationId;
  inStock: boolean;
  /** Null means "no explicit limit tracked" — distinct from 0 (sold out). */
  dailyLimit: number | null;
}

export interface Product {
  id: ProductId;
  categoryId: ProductCategoryId;
  name: LocalizedText;
  description: LocalizedText;
  price: Money;
  imageUrl?: string;
  allergens: string[];
  isSeasonal: boolean;
  isNew: boolean;
  isMustTry: boolean;
  pointsEarnRateOverride?: number;
  sortOrder: number;
  availability: ProductAvailability[];
}

export interface Collection {
  id: CollectionId;
  name: LocalizedText;
  description?: LocalizedText;
  productIds: ProductId[];
  imageUrl?: string;
  startsAt?: string;
  endsAt?: string;
  featured: boolean;
}
