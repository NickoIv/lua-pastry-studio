import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, ScanIcon } from "@lua/ui";
import { asId } from "@lua/types";
import { useBackend } from "../backend/useBackend";
import "./ScanScreen.css";

const DEMO_CUSTOMER_ID = asId<"Customer">("cust_nikolay");
const DEMO_REWARD_ID = asId<"Reward">("rwd_cappuccino");

/**
 * No real camera integration yet (see product spec §16 — deliberately
 * deferred). These two buttons stand in for "a QR was scanned" so the
 * rest of the confirm/earn/redeem pipeline can be built and tested now;
 * swapping in a real scanner later only changes how `encoded` is
 * obtained, not anything downstream.
 */
export function ScanScreen() {
  const backend = useBackend();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<"identity" | "reward" | null>(null);

  async function simulateIdentityScan() {
    setBusy("identity");
    try {
      const token = await backend.qr.issueIdentityToken(DEMO_CUSTOMER_ID, 90);
      const verification = await backend.qr.verify(token.encoded);
      if (!verification.ok) throw new Error(verification.reason);
      navigate("/transaction", {
        state: {
          kind: "identity",
          customerId: verification.token.customerId,
          tokenId: verification.token.id,
        },
      });
    } finally {
      setBusy(null);
    }
  }

  async function simulateRewardScan() {
    setBusy("reward");
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
      const verification = await backend.qr.verify(token.encoded);
      if (!verification.ok) throw new Error(verification.reason);
      navigate("/transaction", {
        state: {
          kind: "reward",
          redemptionId: redemption.id,
          tokenId: verification.token.id,
        },
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="lua-scan">
      <div className="lua-scan__viewfinder">
        <ScanIcon />
        <p>Наведите камеру на QR-код гостя</p>
      </div>

      <Card padding="md" className="lua-scan__dev">
        <p className="lua-scan__dev-label">Симуляция сканирования (dev)</p>
        <div className="lua-scan__dev-buttons">
          <Button
            variant="secondary"
            fullWidth
            disabled={busy !== null}
            onClick={() => void simulateIdentityScan()}
          >
            {busy === "identity" ? "Сканирование…" : "QR гостя — покупка"}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            disabled={busy !== null}
            onClick={() => void simulateRewardScan()}
          >
            {busy === "reward" ? "Сканирование…" : "QR награды — выдача"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
