import { useState } from "react";
import { Badge, Button, Skeleton } from "@lua/ui";
import { useAdminStaff, useAuditLog } from "../data/hooks";
import { PageHeader } from "../components/PageHeader";

const ACTION_LABEL: Record<string, string> = {
  "catalog.category.created": "Категория создана",
  "catalog.category.updated": "Категория изменена",
  "catalog.category.deleted": "Категория удалена",
  "catalog.product.created": "Товар создан",
  "catalog.product.updated": "Товар изменён",
  "catalog.product.archived": "Товар архивирован",
  "catalog.availability.updated": "Изменена доступность товара",
  "catalog.collection.created": "Коллекция создана",
  "catalog.collection.updated": "Коллекция изменена",
  "catalog.collection.deleted": "Коллекция удалена",
  "catalog.reward.created": "Награда создана",
  "catalog.reward.updated": "Награда изменена",
  "catalog.reward.archived": "Награда архивирована",
  "settings.loyalty_program.updated": "Изменены настройки лояльности",
  "loyalty.manual_adjustment": "Ручная корректировка баллов",
  "loyalty.earn": "Начислены баллы",
  "loyalty.redeem": "Списаны баллы",
  "reward.redemption.fulfilled": "Награда выдана",
  "staff.created": "Сотрудник создан",
  "staff.updated": "Сотрудник изменён",
  "staff.deactivated": "Сотрудник деактивирован",
  "staff.reactivated": "Сотрудник активирован",
  "customer.name_updated": "Изменено имя клиента",
  "customer.birthday_updated": "Изменена дата рождения клиента",
  "media.uploaded": "Загружено изображение",
  "media.removed": "Изображение удалено",
};

function actionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action;
}

export function AuditScreen() {
  const staff = useAdminStaff();
  const [action, setAction] = useState("");
  const [actorStaffId, setActorStaffId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pageSize = 25;

  const log = useAuditLog({
    action: action || undefined,
    actorStaffId: actorStaffId || undefined,
    from: from ? `${from}T00:00:00Z` : undefined,
    to: to ? `${to}T23:59:59Z` : undefined,
    page,
    pageSize,
  });

  const total = log.status === "success" ? log.data.total : 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageHeader title="Журнал действий" />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          style={{ minWidth: 200 }}
        >
          <option value="">Все действия</option>
          {Object.keys(ACTION_LABEL).map((a) => (
            <option key={a} value={a}>
              {ACTION_LABEL[a]}
            </option>
          ))}
        </select>
        <select
          value={actorStaffId}
          onChange={(e) => {
            setActorStaffId(e.target.value);
            setPage(1);
          }}
          style={{ minWidth: 180 }}
        >
          <option value="">Все сотрудники</option>
          {staff.status === "success"
            ? staff.data.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName}
                </option>
              ))
            : null}
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
          aria-label="С даты"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
          aria-label="По дату"
        />
      </div>

      {log.status === "loading" ? (
        <Skeleton height={400} />
      ) : log.status === "success" ? (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {log.data.items.map((entry) => (
              <div
                key={entry.id}
                style={{
                  border: "1px solid var(--lua-color-border)",
                  borderRadius: "var(--lua-radius-md)",
                  padding: "var(--lua-space-sm) var(--lua-space-md)",
                  background: "var(--lua-color-surface)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: "var(--lua-text-xs)", color: "var(--lua-color-text-faint)" }}>
                      {new Date(entry.createdAt).toLocaleString("ru-RU", { timeZone: "Asia/Almaty" })} ·{" "}
                      {entry.actorDisplayName ?? "Система"}
                    </span>
                    <span>
                      <Badge tone="accent">{actionLabel(entry.action)}</Badge> {entry.summary}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  >
                    {expandedId === entry.id ? "Скрыть" : "Подробнее"}
                  </Button>
                </div>
                {expandedId === entry.id ? (
                  <div
                    style={{
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: "1px solid var(--lua-color-border)",
                      fontSize: "var(--lua-text-sm)",
                      color: "var(--lua-color-text-muted)",
                    }}
                  >
                    <p style={{ margin: "0 0 4px" }}>
                      Объект: {entry.targetType} ({entry.targetId})
                    </p>
                    {entry.metadata ? (
                      <pre
                        style={{
                          background: "var(--lua-color-surface-alt)",
                          padding: "var(--lua-space-xs)",
                          borderRadius: "var(--lua-radius-sm)",
                          overflowX: "auto",
                          margin: 0,
                        }}
                      >
                        {JSON.stringify(entry.metadata, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
            {log.data.items.length === 0 ? (
              <p style={{ color: "var(--lua-color-text-muted)" }}>Записей не найдено.</p>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16 }}>
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Назад
            </Button>
            <span style={{ fontSize: "var(--lua-text-sm)", color: "var(--lua-color-text-muted)" }}>
              Страница {page} из {pageCount} ({total})
            </span>
            <Button variant="secondary" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
              Далее
            </Button>
          </div>
        </>
      ) : (
        <p>Не удалось загрузить журнал.</p>
      )}
    </div>
  );
}
