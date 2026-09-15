import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, ScanIcon } from "@lua/ui";
import { APP_CONFIG } from "@lua/config";
import { ApiRequestError } from "@lua/data-server";
import { API_ERROR_MESSAGES_RU, asId } from "@lua/types";
import { useResolveQrToken } from "../data/hooks";
import { useBackend } from "../backend/useBackend";
import { QrScanner, type ScannerStatus } from "../components/QrScanner";
import "./ScanScreen.css";

const DEMO_CUSTOMER_ID = asId<"Customer">("cust_nikolay");
const DEMO_REWARD_ID = asId<"Reward">("rwd_cappuccino");
const isServerMode = APP_CONFIG.dataMode === "server";

export function ScanScreen() {
  const resolveToken = useResolveQrToken();
  const backend = useBackend();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [scannerActive, setScannerActive] = useState(true);
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>("requesting");
  const [manualToken, setManualToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleDecoded(token: string) {
    if (busy) return;
    setScannerActive(false);
    setBusy(true);
    setError(null);
    try {
      const summary = await resolveToken(token);
      navigate("/transaction", { state: { summary } });
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? API_ERROR_MESSAGES_RU[err.code]
          : "QR-код не распознан",
      );
      setScannerActive(true);
    } finally {
      setBusy(false);
    }
  }

  async function simulateIdentityScan() {
    setBusy(true);
    setError(null);
    try {
      const token = await backend.qr.issueIdentityToken(DEMO_CUSTOMER_ID, 90);
      const summary = await resolveToken(token.encoded);
      navigate("/transaction", { state: { summary } });
    } finally {
      setBusy(false);
    }
  }

  async function simulateRewardScan() {
    setBusy(true);
    setError(null);
    try {
      const reward = await backend.rewards.getReward(DEMO_REWARD_ID);
      if (!reward) throw new Error("Demo reward missing");
      const redemption = await backend.redemptionService.requestRedemption(
        DEMO_CUSTOMER_ID,
        reward,
      );
      const token = await backend.qr.issueRewardRedemptionToken(
        DEMO_CUSTOMER_ID,
        redemption.id,
        90,
      );
      const summary = await resolveToken(token.encoded);
      navigate("/transaction", { state: { summary } });
    } finally {
      setBusy(false);
    }
  }

  if (!isServerMode) {
    return (
      <div className="lua-scan">
        <div className="lua-scan__viewfinder">
          <ScanIcon />
          <p>Наведите камеру на QR-код гостя</p>
        </div>

        <Card padding="md" className="lua-scan__dev">
          <p className="lua-scan__dev-label">Симуляция сканирования (mock-режим)</p>
          <div className="lua-scan__dev-buttons">
            <Button
              variant="secondary"
              fullWidth
              disabled={busy}
              onClick={() => void simulateIdentityScan()}
            >
              {busy ? "Сканирование…" : "QR гостя — покупка"}
            </Button>
            <Button
              variant="secondary"
              fullWidth
              disabled={busy}
              onClick={() => void simulateRewardScan()}
            >
              {busy ? "Сканирование…" : "QR награды — выдача"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="lua-scan">
      <QrScanner
        active={scannerActive}
        onDecode={(text) => void handleDecoded(text)}
        onStatusChange={setScannerStatus}
      />

      {error ? <p className="lua-scan__error">{error}</p> : null}

      {import.meta.env.DEV ? (
        <Card padding="md" className="lua-scan__dev">
          <p className="lua-scan__dev-label">
            Ввести код вручную (только для разработки)
          </p>
          <div className="lua-scan__manual">
            <input
              className="lua-scan__manual-input"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="Вставьте токен из Lua Guest"
            />
            <Button
              disabled={busy || !manualToken}
              onClick={() => void handleDecoded(manualToken)}
            >
              Проверить
            </Button>
          </div>
        </Card>
      ) : null}

      {scannerStatus === "stopped" && !busy ? (
        <Button variant="secondary" fullWidth onClick={() => setScannerActive(true)}>
          Сканировать снова
        </Button>
      ) : null}
    </div>
  );
}
