import type { Id } from "./common";
import type { LocationId } from "./staff";

export interface Location {
  id: LocationId;
  /** Full display name (e.g. "Lua Pastry Studio — Достык") — detail views only. */
  name: string;
  /** Short display name (e.g. "Достык") — tables, badges, compact UI everywhere else. */
  shortName: string;
  address: string;
  city: string;
  lat?: number;
  lng?: number;
  phone?: string;
  openHours: string;
  sortOrder: number;
  isActive: boolean;
}

export type CollectionId = Id<"Collection">;
