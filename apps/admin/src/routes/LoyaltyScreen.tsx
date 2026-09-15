import { useState } from "react";
import { Button, Card } from "@lua/ui";
import { useBackend } from "../backend/useBackend";
import { PageHeader } from "../components/PageHeader";
import "./LoyaltyScreen.css";

export function LoyaltyScreen() {
  const backend = useBackend();
  const [earnRatePercent, setEarnRatePercent] = useState(
    backend.store.loyaltyProgram.earnRatePerCurrencyUnit * 100,
  );
  const [birthdayBonus, setBirthdayBonus] = useState(
    backend.store.loyaltyProgram.birthdayBonusPoints,
  );
  const [expireDays, setExpireDays] = useState(
    backend.store.loyaltyProgram.pointsExpireAfterDays ?? 0,
  );
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function handleSave() {
    await backend.loyalty.updateProgram({
      earnRatePerCurrencyUnit: earnRatePercent / 100,
      birthdayBonusPoints: birthdayBonus,
      pointsExpireAfterDays: expireDays || null,
    });
    setSavedAt(new Date().toLocaleTimeString("ru-RU"));
  }

  return (
    <div>
      <PageHeader title="Программа лояльности" />

      <Card className="lua-loyalty-settings">
        <label className="lua-loyalty-settings__field">
          <span>Ставка начисления (% от суммы покупки)</span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={earnRatePercent}
            onChange={(e) => setEarnRatePercent(Number(e.target.value))}
          />
        </label>

        <label className="lua-loyalty-settings__field">
          <span>Бонус в день рождения (баллы)</span>
          <input
            type="number"
            min={0}
            value={birthdayBonus}
            onChange={(e) => setBirthdayBonus(Number(e.target.value))}
          />
        </label>

        <label className="lua-loyalty-settings__field">
          <span>Срок действия баллов (дней, 0 — бессрочно)</span>
          <input
            type="number"
            min={0}
            value={expireDays}
            onChange={(e) => setExpireDays(Number(e.target.value))}
          />
        </label>

        <div className="lua-loyalty-settings__tiers">
          <p className="lua-loyalty-settings__tiers-title">Уровни</p>
          {(backend.store.loyaltyProgram.tiers ?? []).map((tier) => (
            <div key={tier.name} className="lua-loyalty-settings__tier-row">
              <span>{tier.name}</span>
              <span>от {tier.minLifetimePoints.toLocaleString("ru-RU")} баллов</span>
              <span>× {tier.earnRateMultiplier}</span>
            </div>
          ))}
        </div>

        <div className="lua-loyalty-settings__actions">
          <Button onClick={() => void handleSave()}>Сохранить</Button>
          {savedAt ? (
            <span className="lua-loyalty-settings__saved">
              Сохранено в {savedAt} (только в этой сессии)
            </span>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
