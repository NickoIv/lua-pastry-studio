import { Badge, Card, Skeleton } from "@lua/ui";
import { APP_CONFIG } from "@lua/config";
import { useLocations, useLoyaltyProgram } from "../data/hooks";
import { PageHeader } from "../components/PageHeader";
import "./SettingsScreen.css";

export function SettingsScreen() {
  const locations = useLocations();
  const program = useLoyaltyProgram();

  const qrTtl =
    program.status === "success" && "qrTokenTtlSeconds" in program.data
      ? (program.data as { qrTokenTtlSeconds: number }).qrTokenTtlSeconds
      : APP_CONFIG.qrTokenTtlSeconds;

  return (
    <div>
      <PageHeader title="Настройки" />

      <div className="lua-settings__grid">
        <Card>
          <p className="lua-settings__card-title">Точки продаж</p>
          {locations.status === "loading" ? (
            <Skeleton height={120} />
          ) : (
            <div className="lua-settings__locations">
              {locations.status === "success"
                ? locations.data.map((loc) => (
                    <div key={loc.id} className="lua-settings__location-row">
                      <div>
                        <p className="lua-settings__location-name">{loc.name}</p>
                        <p className="lua-settings__location-address">
                          {loc.address}, {loc.city}
                        </p>
                      </div>
                      <Badge tone={loc.isActive ? "success" : "neutral"}>
                        {loc.isActive ? "Активна" : "Выключена"}
                      </Badge>
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
    </div>
  );
}
