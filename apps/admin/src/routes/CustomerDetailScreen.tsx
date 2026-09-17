import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Button, Card, Money, Points, SectionHeader, Skeleton } from "@lua/ui";
import { formatDateOnly, formatOrderDateTime } from "@lua/utils";
import { ApiRequestError } from "@lua/data-server";
import { API_ERROR_MESSAGES_RU } from "@lua/types";
import { useCustomerDetail, useUpdateCustomer } from "../data/hooks";
import { PageHeader } from "../components/PageHeader";
import { FormField } from "../components/FormField";
import { ManualAdjustmentModal } from "../components/ManualAdjustmentModal";

const REDEMPTION_STATUS_LABEL: Record<string, string> = {
  PENDING: "Ожидает",
  FULFILLED: "Выдана",
  EXPIRED: "Истекла",
  CANCELLED: "Отменена",
};

export function CustomerDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const detail = useCustomerDetail(id ?? null);
  const updateCustomer = useUpdateCustomer();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  if (!id) return null;

  function startEditing() {
    if (detail.status !== "success" || !detail.data) return;
    setFirstName(detail.data.profile.firstName);
    setLastName(detail.data.profile.lastName ?? "");
    setBirthDate(detail.data.profile.birthDate?.slice(0, 10) ?? "");
    setSaveError(null);
    setEditing(true);
  }

  async function handleSave() {
    if (!firstName.trim()) {
      setSaveError("Имя не может быть пустым.");
      return;
    }
    setBusy(true);
    setSaveError(null);
    try {
      await updateCustomer(id!, {
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        birthDate: birthDate || null,
      });
      detail.refresh();
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof ApiRequestError ? API_ERROR_MESSAGES_RU[err.code] : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Клиент"
        action={
          <Button variant="secondary" onClick={() => navigate("/customers")}>
            Назад к списку
          </Button>
        }
      />
      {detail.status === "loading" ? (
        <Skeleton height={400} />
      ) : detail.status === "success" && detail.data ? (
        <>
          <Card style={{ marginBottom: 24 }}>
            <SectionHeader
              title="Профиль"
              action={
                !editing ? (
                  <Button variant="ghost" onClick={startEditing}>
                    Изменить имя
                  </Button>
                ) : null
              }
            />
            {editing ? (
              <div style={{ maxWidth: 420 }}>
                <div className="lua-form-row">
                  <FormField label="Имя" htmlFor="cust-first-name">
                    <input id="cust-first-name" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </FormField>
                  <FormField label="Фамилия" htmlFor="cust-last-name">
                    <input id="cust-last-name" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </FormField>
                </div>
                <FormField label="Дата рождения" htmlFor="cust-birth-date">
                  <input id="cust-birth-date" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                </FormField>
                {saveError ? <p className="lua-form-field__error">{saveError}</p> : null}
                <div style={{ display: "flex", gap: 8 }}>
                  <Button onClick={() => void handleSave()} disabled={busy}>
                    {busy ? "Сохранение…" : "Сохранить"}
                  </Button>
                  <Button variant="secondary" onClick={() => setEditing(false)} disabled={busy}>
                    Отмена
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <p>
                  <strong>
                    {detail.data.profile.firstName} {detail.data.profile.lastName ?? ""}
                  </strong>
                </p>
                <p style={{ color: "var(--lua-color-text-muted)" }}>{detail.data.profile.phone}</p>
                <p style={{ color: "var(--lua-color-text-muted)" }}>
                  Дата рождения:{" "}
                  {detail.data.profile.birthDate ? formatDateOnly(detail.data.profile.birthDate) : "не указана"}
                </p>
                <p style={{ color: "var(--lua-color-text-muted)" }}>
                  В клубе с {new Date(detail.data.profile.createdAt).toLocaleDateString("ru-RU")}
                </p>
              </div>
            )}
          </Card>

          <Card style={{ marginBottom: 24 }}>
            <SectionHeader
              title="Лояльность"
              action={
                <Button variant="secondary" onClick={() => setAdjustOpen(true)}>
                  Корректировать баллы
                </Button>
              }
            />
            <p style={{ fontSize: "var(--lua-text-2xl)", fontFamily: "var(--lua-font-serif)", margin: "0 0 16px" }}>
              <Points value={detail.data.pointsBalance} />
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {detail.data.ledger.slice(0, 10).map((tx) => (
                <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--lua-text-sm)", borderBottom: "1px solid var(--lua-color-border)", paddingBottom: 4 }}>
                  <span>{tx.reason}</span>
                  <span style={{ color: tx.points < 0 ? "var(--lua-color-danger)" : "var(--lua-color-success)" }}>
                    <Points value={tx.points} signed />
                  </span>
                </div>
              ))}
              {detail.data.ledger.length === 0 ? <p style={{ color: "var(--lua-color-text-muted)" }}>Нет операций.</p> : null}
            </div>
          </Card>

          <Card style={{ marginBottom: 24 }}>
            <SectionHeader title="Заказы" />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {detail.data.orders.map((o) => (
                <div key={o.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--lua-text-sm)", borderBottom: "1px solid var(--lua-color-border)", paddingBottom: 4 }}>
                  <span>
                    {formatOrderDateTime(o.createdAt)} — {o.items.map((i) => i.productName).join(", ")}
                  </span>
                  <Money value={o.total} />
                </div>
              ))}
              {detail.data.orders.length === 0 ? <p style={{ color: "var(--lua-color-text-muted)" }}>Нет заказов.</p> : null}
            </div>
          </Card>

          <Card>
            <SectionHeader title="Награды" />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {detail.data.redemptions.map((r) => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--lua-text-sm)", borderBottom: "1px solid var(--lua-color-border)", paddingBottom: 4 }}>
                  <span>{formatOrderDateTime(r.createdAt)}</span>
                  <Points value={r.pointsCost} />
                  <Badge tone={r.status === "FULFILLED" ? "success" : r.status === "PENDING" ? "warning" : "neutral"}>
                    {REDEMPTION_STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                </div>
              ))}
              {detail.data.redemptions.length === 0 ? <p style={{ color: "var(--lua-color-text-muted)" }}>Нет обменов.</p> : null}
            </div>
          </Card>

          <ManualAdjustmentModal
            open={adjustOpen}
            onClose={() => setAdjustOpen(false)}
            customerId={id}
            customerName={detail.data.profile.firstName}
            currentBalance={detail.data.pointsBalance}
            onAdjusted={() => detail.refresh()}
          />
        </>
      ) : (
        <p>Клиент не найден.</p>
      )}
    </div>
  );
}
