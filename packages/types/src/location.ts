import type { Id } from "./common";
import type { LocationId } from "./staff";

export interface Location {
  id: LocationId;
  name: string;
  address: string;
  city: string;
  lat?: number;
  lng?: number;
  phone?: string;
  openHours: string;
  isActive: boolean;
}

export type CollectionId = Id<"Collection">;
