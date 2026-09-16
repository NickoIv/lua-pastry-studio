import { useState } from "react";
import { Button, Skeleton } from "@lua/ui";
import type { ServerLocation } from "@lua/data-server";
import { Modal } from "./Modal";
import { useProductAvailability, useSetProductAvailability } from "../data/hooks";

export interface AvailabilityModalProps {
  open: boolean;
  onClose: () => void;
  productId: string | null;
  productName: string;
  locations: ServerLocation[];
}

/**
 * Per-location "Нет в наличии" management. Toggling a location off keeps
 * the product active (still editable, still in Admin) but hides it from
 * that location's Guest menu with an explicit unavailable treatment — see
 * docs/ARCHITECTURE.md "Availability vs active" for why these are two
 * separate flags rather than one.
 */
export function AvailabilityModal({ open, onClose, productId, productName, locations }: AvailabilityModalProps) {
  const availability = useProductAvailability(productId);
  const setAvailability = useSetProductAvailability();
  const [busyLocationId, setBusyLocationId] = useState<string | null>(null);
  const [reasonDraft, setReasonDraft] = useState<Record<string, string>>({});

  if (!open || !productId) return null;

  const rowsByLocation = new Map(
    availability.status === "success" ? availability.data.map((r) => [r.locationId, r]) : [],
  );

  async function toggle(locationId: string, inStock: boolean) {
    if (!productId) return;
    setBusyLocationId(locationId);
    try {
      await setAvailability(productId, {
        locationId,
        inStock,
        unavailableReason: inStock ? null : reasonDraft[locationId] || null,
      });
      availability.refresh();
    } finally {
      setBusyLocationId(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Наличие: ${productName}`}>
      {availability.status === "loading" ? (
        <Skeleton height={120} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {locations.map((loc) => {
            const row = rowsByLocation.get(loc.id);
            const inStock = row?.inStock ?? true;
            return (
              <div key={loc.id} style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 10, borderBottom: "1px solid var(--lua-color-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600 }}>{loc.name}</span>
                  <Button
                    variant={inStock ? "secondary" : "destructive"}
                    disabled={busyLocationId === loc.id}
                    onClick={() => void toggle(loc.id, !inStock)}
                  >
                    {inStock ? "В наличии" : "Нет в наличии"}
                  </Button>
                </div>
                {!inStock ? (
                  <input
                    type="text"
                    placeholder="Причина (необязательно)"
                    defaultValue={row?.unavailableReason ?? ""}
                    onChange={(e) => setReasonDraft((d) => ({ ...d, [loc.id]: e.target.value }))}
                    onBlur={() => void toggle(loc.id, false)}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
