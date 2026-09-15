import { useEffect, useState } from "react";
import { Button, Card, Skeleton } from "@lua/ui";
import { APP_CONFIG } from "@lua/config";
import { useLoyaltyProgram, useUpdateLoyaltyProgram } from "../data/hooks";
import { PageHeader } from "../components/PageHeader";
import "./LoyaltyScreen.css";

export function LoyaltyScreen() {
  const program = useLoyaltyProgram();
  const updateProgram = useUpdateLoyaltyProgram();

  const [earnRatePercent, setEarnRatePercent] = useState<number | null>(null);
  const [birthdayBonus, setBirthdayBonus] = useState(0);
  const [expireDays, setExpireDays] = useState(0);
  const [qrTtlSeconds, setQrTtlSeconds] = useState(APP_CONFIG.qrTokenTtlSeconds);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (program.status !== "success") return;
    // Seeds the editable form fields once from the loaded program — a
    // one-time "sync local edit state from async data" effect, not a
    // render-phase update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEarnRatePercent(program.data.earnRatePerCurrencyUnit * 100);
    setBirthdayBonus(program.data.birthdayBonusPoints);
    setExpireDays(program.data.pointsExpireAfterDays ?? 0);
    if (APP_CONFIG.dataMode === "server" && "qrTokenTtlSeconds" in program.data) {
      setQrTtlSeconds((program.data as { qrTokenTtlSeconds: number }).qrTokenTtlSeconds);
    }
  }, [program]);

  async function handleSave() {
    if (earnRatePercent === null) return;
    await updateProgram({
      earnRatePerCurrencyUnit: earnRatePercent / 100,
      birthdayBonusPoints: birthdayBonus,
      pointsExpireAfterDays: expireDays || null,
      ...(APP_CONFIG.dataMode === "server" ? { qrTokenTtlSeconds: qrTtlSeconds } : {}),
    });
    setSavedAt(new Date().toLocaleTimeString("ru-RU"));
  }

  if (program.status === "loading" || earnRatePercent === null) {
    return (
      <div>
        <PageHeader title="Программа лояльности" />
        <Skeleton height={360} />
      </div>
    );
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

        {APP_CONFIG.dataMode === "server" ? (
          <label className="lua-loyalty-settings__field">
            <span>TTL QR-кода (сек., 30–300)</span>
            <input
              type="number"
              min={30}
              max={300}
              value={qrTtlSeconds}
              onChange={(e) => setQrTtlSeconds(Number(e.target.value))}
            />
          </label>
        ) : null}

        {program.status === "success" && (program.data.tiers ?? []).length > 0 ? (
          <div className="lua-loyalty-settings__tiers">
            <p className="lua-loyalty-settings__tiers-title">Уровни</p>
            {(program.data.tiers ?? []).map((tier) => (
              <div key={tier.name} className="lua-loyalty-settings__tier-row">
                <span>{tier.name}</span>
                <span>от {tier.minLifetimePoints.toLocaleString("ru-RU")} баллов</span>
                <span>× {tier.earnRateMultiplier}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="lua-loyalty-settings__actions">
          <Button onClick={() => void handleSave()}>Сохранить</Button>
          {savedAt ? (
            <span className="lua-loyalty-settings__saved">
              {APP_CONFIG.dataMode === "server"
                ? `Сохранено в ${savedAt}`
                : `Сохранено в ${savedAt} (только в этой сессии)`}
            </span>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
