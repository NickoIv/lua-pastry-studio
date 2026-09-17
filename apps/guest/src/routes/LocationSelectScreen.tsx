import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader, Badge, Card, ChevronLeftIcon, IconButton, Skeleton } from "@lua/ui";
import { useTranslation } from "@lua/i18n";
import { useCustomerProfile, useLocations, useSetMyLocation } from "../data/hooks";
import "./LocationSelectScreen.css";

/**
 * The missing link the owner found during manual testing: Admin already
 * manages per-location availability, but Guest had no way to say which
 * coffee shop it's for — "Адреса кофеен" in Profile was a dead row.
 * See product brief §19. Selecting a location here is what
 * ProductDetailScreen/ClubScreen read back to decide availability.
 */
export function LocationSelectScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const locations = useLocations();
  const profile = useCustomerProfile();
  const setMyLocation = useSetMyLocation();
  const [busyId, setBusyId] = useState<string | null>(null);

  const selectedId = profile.status === "success" ? profile.data?.homeLocationId : undefined;

  async function handleSelect(locationId: string) {
    setBusyId(locationId);
    try {
      await setMyLocation(locationId);
      profile.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="lua-location-select">
      <AppHeader
        title={t("guest.profile.myLocationTitle")}
        leading={<IconButton icon={<ChevronLeftIcon />} label={t("common.back")} onClick={() => navigate(-1)} />}
      />
      <p className="lua-location-select__hint">{t("guest.profile.myLocationHint")}</p>

      {locations.status === "loading" ? (
        <Skeleton height={160} />
      ) : locations.status === "success" ? (
        <div className="lua-location-select__list">
          {locations.data
            .filter((l) => l.isActive)
            .map((loc) => {
              const selected = loc.id === selectedId;
              return (
                <Card key={loc.id} padding="sm" className="lua-location-select__row">
                  <div>
                    <p className="lua-location-select__name">{loc.shortName}</p>
                    <p className="lua-location-select__address">
                      {loc.address} · {loc.openHours}
                    </p>
                  </div>
                  {selected ? (
                    <Badge tone="success">{t("guest.profile.selected")}</Badge>
                  ) : (
                    <button
                      type="button"
                      className="lua-location-select__button"
                      disabled={busyId === loc.id}
                      onClick={() => void handleSelect(loc.id)}
                    >
                      {t("guest.profile.selectLocation")}
                    </button>
                  )}
                </Card>
              );
            })}
        </div>
      ) : (
        <p>{t("common.error")}</p>
      )}
    </div>
  );
}
