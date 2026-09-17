import { useState } from "react";
import { Badge, Button, Card, PlusIcon, Skeleton } from "@lua/ui";
import { APP_CONFIG } from "@lua/config";
import { isServerMode, useCreateLocation, useLocations, useLoyaltyProgram, useUpdateLocation } from "../data/hooks";
import { PageHeader } from "../components/PageHeader";
import { LocationFormModal, type LocationFormValue } from "../components/LocationFormModal";
import "./SettingsScreen.css";

export function SettingsScreen() {
  const locations = useLocations();
  const program = useLoyaltyProgram();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const [modal, setModal] = useState<{ open: boolean; value: LocationFormValue | null }>({
    open: false,
    value: null,
  });

  const qrTtl =
    program.status === "success" && "qrTokenTtlSeconds" in program.data
      ? (program.data as { qrTokenTtlSeconds: number }).qrTokenTtlSeconds
      : APP_CONFIG.qrTokenTtlSeconds;

  return (
    <div>
      <PageHeader title="Настройки" />

      <div className="lua-settings__grid">
        <Card>
          <div className="lua-settings__card-header">
            <p className="lua-settings__card-title">Точки продаж</p>
            {isServerMode ? (
              <Button
                variant="ghost"
                leadingIcon={<PlusIcon />}
                onClick={() =>
                  setModal({
                    open: true,
                    value: null,
                  })
                }
              >
                Добавить
              </Button>
            ) : null}
          </div>
          {locations.status === "loading" ? (
            <Skeleton height={120} />
          ) : (
            <div className="lua-settings__locations">
              {locations.status === "success"
                ? locations.data.map((loc) => (
                    <div key={loc.id} className="lua-settings__location-row">
                      <div>
                        <p className="lua-settings__location-name">{loc.shortName}</p>
                        <p className="lua-settings__location-address">
                          {loc.address}, {loc.city} · {loc.openHours}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Badge tone={loc.isActive ? "success" : "neutral"}>
                          {loc.isActive ? "Активна" : "Выключена"}
                        </Badge>
                        {isServerMode ? (
                          <Button
                            variant="ghost"
                            onClick={() =>
                              setModal({
                                open: true,
                                value: {
                                  id: loc.id,
                                  name: loc.name,
                                  shortName: loc.shortName,
                                  address: loc.address,
                                  city: loc.city,
                                  phone: loc.phone ?? "",
                                  openHours: loc.openHours,
                                  sortOrder: loc.sortOrder,
                                  isActive: loc.isActive,
                                },
                              })
                            }
                          >
                            Изменить
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))
                : null}
            </div>
          )}
        </Card>

        <Card>
          <p className="lua-settings__card-title">Платформа</p>
          <div className="lua-settings__kv">
            <span>Источник данных</span>
            <Badge tone="neutral">
              {APP_CONFIG.dataMode === "mock"
                ? "Mock (в памяти)"
                : "Локальный backend (Postgres)"}
            </Badge>
          </div>
          <div className="lua-settings__kv">
            <span>TTL QR-кода</span>
            <span>{qrTtl} сек</span>
          </div>
          <div className="lua-settings__kv">
            <span>API URL</span>
            <span>{APP_CONFIG.dataMode === "server" ? APP_CONFIG.apiBaseUrl : "—"}</span>
          </div>
        </Card>
      </div>

      <LocationFormModal
        open={modal.open}
        onClose={() => setModal({ open: false, value: null })}
        initial={modal.value}
        onCreate={async (input) => {
          await createLocation(input);
          locations.refresh();
        }}
        onUpdate={async (id, patch) => {
          await updateLocation(id, patch);
          locations.refresh();
        }}
      />
    </div>
  );
}
