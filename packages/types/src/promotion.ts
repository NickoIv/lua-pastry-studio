import type { Id, ISODateTimeString, LocalizedText } from "./common";
import type { ProductId } from "./product";

export type PromotionId = Id<"Promotion">;

export type PromotionDiscountKind =
  "percent_off" | "fixed_amount_off" | "bonus_points_multiplier";

export interface Promotion {
  id: PromotionId;
  title: LocalizedText;
  description: LocalizedText;
  imageUrl?: string;
  discountKind: PromotionDiscountKind;
  discountValue: number;
  applicableProductIds?: ProductId[];
  startsAt: ISODateTimeString;
  endsAt: ISODateTimeString;
  isActive: boolean;
}
