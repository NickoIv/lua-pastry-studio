import { useState } from "react";
import { Button, Skeleton } from "@lua/ui";
import { useAdminStaff, useAuditLog } from "../data/hooks";
import { PageHeader } from "../components/PageHeader";
import "./AuditScreen.css";

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
  "loyalty.manual_adjustment": "Корректировка баллов",
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
  "location.created": "Точка создана",
  "location.updated": "Точка изменена",
};

function actionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action;
}

/** "±123" from summary/metadata text when present — used only for the compact list-row subtitle. */
function pointsFromMetadata(metadata?: Record<string, unknown>): number | null {
  if (!metadata) return null;
  const raw = metadata.points;
  return typeof raw === "number" ? raw : null;
}

function reasonFromMetadata(metadata?: Record<string, unknown>): string | null {
  if (!metadata) return null;
  const raw = metadata.reason;
  return typeof raw === "string" && raw.trim() ? raw : null;
}

type QuickFilter = "all" | "today" | "7d" | "30d";

function quickFilterRange(filter: QuickFilter): { from?: string; to?: string } {
  if (filter === "all") return {};
  const now = new Date();
  const days = filter === "today" ? 0 : filter === "7d" ? 7 : 30;
  const from = new Date(now);
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: now.toISOString() };
}

export function AuditScreen() {
  const staff = useAdminStaff();
  const [action, setAction] = useState("");
  const [actorStaffId, setActorStaffId] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pageSize = 25;

  const range = quickFilter === "all" ? { from: from ? `${from}T00:00:00Z` : undefined, to: to ? `${to}T23:59:59Z` : undefined } : quickFilterRange(quickFilter);

  const log = useAuditLog({
    action: action || undefined,
    actorStaffId: actorStaffId || undefined,
    from: range.from,
    to: range.to,
    page,
    pageSize,
  });

  const total = log.status === "success" ? log.data.total : 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageHeader title="Журнал действий" />

      <div className="lua-audit-filters">
        <div className="lua-audit-filters__quick">
          {([
            ["all", "Все"],
            ["today", "Сегодня"],
            ["7d", "7 дней"],
            ["30d", "30 дней"],
          ] as [QuickFilter, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`lua-audit-filters__quick-btn${quickFilter === key ? " lua-audit-filters__quick-btn--active" : ""}`}
              onClick={() => {
                setQuickFilter(key);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="lua-audit-filters__row">
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
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
          <label className="lua-audit-filters__date">
            Дата с
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setQuickFilter("all");
                setPage(1);
              }}
              aria-label="Дата с"
            />
          </label>
          <label className="lua-audit-filters__date">
            Дата по
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setQuickFilter("all");
                setPage(1);
              }}
              aria-label="Дата по"
            />
          </label>
        </div>
      </div>

      {log.status === "loading" ? (
        <Skeleton height={400} />
      ) : log.status === "success" ? (
        <>
          <div className="lua-audit-list">
            {log.data.items.map((entry) => {
              const points = pointsFromMetadata(entry.metadata);
              const reason = reasonFromMetadata(entry.metadata);
              return (
                <div key={entry.id} className="lua-audit-row">
                  <div className="lua-audit-row__main" onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}>
                    <div className="lua-audit-row__timestamp">
                      {new Date(entry.createdAt).toLocaleString("ru-RU", {
                        timeZone: "Asia/Almaty",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="lua-audit-row__body">
                      <span className="lua-audit-row__actor">{entry.actorDisplayName ?? "Система"}</span>
                      <span className="lua-audit-row__action">{actionLabel(entry.action)}</span>
                      {entry.targetLabel ? (
                        <span className="lua-audit-row__target">
                          {entry.targetLabel}
                          {points !== null ? (
                            <span className={points < 0 ? "lua-audit-row__points--negative" : "lua-audit-row__points--positive"}>
                              {" "}
                              · {points > 0 ? "+" : ""}
                              {points} баллов
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                      {reason ? <span className="lua-audit-row__reason">Причина: {reason}</span> : null}
                    </div>
                    <Button variant="ghost">{expandedId === entry.id ? "Скрыть" : "Подробнее"}</Button>
                  </div>
                  {expandedId === entry.id ? (
                    <div className="lua-audit-row__detail">
                      <dl>
                        <dt>Сотрудник</dt>
                        <dd>{entry.actorDisplayName ?? "Система"}</dd>
                        {entry.targetLabel ? (
                          <>
                            <dt>Объект</dt>
                            <dd>{entry.targetLabel}</dd>
                          </>
                        ) : null}
                        <dt>Событие</dt>
                        <dd>{entry.summary}</dd>
                        <dt>Дата и время</dt>
                        <dd>{new Date(entry.createdAt).toLocaleString("ru-RU", { timeZone: "Asia/Almaty" })}</dd>
                      </dl>
                      {entry.metadata ? (
                        <details className="lua-audit-row__technical">
                          <summary>Технические детали</summary>
                          <p style={{ margin: "8px 0 4px", color: "var(--lua-color-text-muted)" }}>
                            ID объекта: {entry.targetType} / {entry.targetId}
                          </p>
                          <pre>{JSON.stringify(entry.metadata, null, 2)}</pre>
                        </details>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
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
