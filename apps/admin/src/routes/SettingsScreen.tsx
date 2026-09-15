import { Badge, Card } from "@lua/ui";
import { APP_CONFIG } from "@lua/config";
import { useBackend } from "../backend/useBackend";
import { PageHeader } from "../components/PageHeader";
import "./SettingsScreen.css";

export function SettingsScreen() {
  const backend = useBackend();

  return (
    <div>
      <PageHeader title="Настройки" />

      <div className="lua-settings__grid">
        <Card>
          <p className="lua-settings__card-title">Точки продаж</p>
          <div className="lua-settings__locations">
            {backend.store.locations.map((loc) => (
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
            ))}
          </div>
        </Card>

        <Card>
          <p className="lua-settings__card-title">Платформа</p>
          <div className="lua-settings__kv">
            <span>Источник данных</span>
            <Badge tone="neutral">
              {APP_CONFIG.dataMode === "mock" ? "Mock (разработка)" : "HTTP backend"}
            </Badge>
          </div>
          <div className="lua-settings__kv">
            <span>TTL QR-кода гостя</span>
            <span>{APP_CONFIG.qrTokenTtlSeconds} сек</span>
          </div>
          <div className="lua-settings__kv">
            <span>TTL QR-кода награды</span>
            <span>{APP_CONFIG.rewardRedemptionTtlSeconds} сек</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
