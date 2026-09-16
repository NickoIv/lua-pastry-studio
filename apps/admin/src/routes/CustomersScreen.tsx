import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Money, Points, SearchIcon, Skeleton } from "@lua/ui";
import { useAdminCustomers } from "../data/hooks";
import { PageHeader } from "../components/PageHeader";
import { DataTable, type DataTableColumn } from "../components/DataTable";

interface CustomerRow {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  pointsBalance: number;
  ordersCount: number;
  lifetimeSpend: { currency: "KZT"; minorUnits: number };
  lastOrderAt?: string;
  marketingOptIn: boolean;
}

export function CustomersScreen() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const customers = useAdminCustomers({ q: query, page, pageSize });

  const total = customers.status === "success" ? customers.data.total : 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const columns: DataTableColumn<CustomerRow>[] = [
    {
      key: "name",
      header: "Имя",
      render: (c) => `${c.firstName} ${c.lastName ?? ""}`.trim(),
    },
    { key: "phone", header: "Телефон", render: (c) => c.phone },
    {
      key: "balance",
      header: "Баланс",
      align: "right",
      render: (c) => <Points value={c.pointsBalance} />,
    },
    { key: "orders", header: "Заказов", align: "right", render: (c) => c.ordersCount },
    {
      key: "spend",
      header: "Потрачено",
      align: "right",
      render: (c) => <Money value={c.lifetimeSpend} />,
    },
    {
      key: "lastVisit",
      header: "Последний визит",
      render: (c) => (c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString("ru-RU") : "—"),
    },
    {
      key: "marketing",
      header: "Рассылка",
      render: (c) => (
        <Badge tone={c.marketingOptIn ? "success" : "neutral"}>
          {c.marketingOptIn ? "Да" : "Нет"}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Клиенты" />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
          maxWidth: 360,
          border: "1px solid var(--lua-color-border)",
          borderRadius: "var(--lua-radius-sm)",
          padding: "var(--lua-space-xs) var(--lua-space-sm)",
          background: "var(--lua-color-surface)",
        }}
      >
        <SearchIcon aria-hidden="true" />
        <input
          type="search"
          placeholder="Имя или телефон"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          aria-label="Поиск клиентов"
          style={{ border: "none", outline: "none", flex: 1, font: "inherit", background: "none" }}
        />
      </div>
      {customers.status === "loading" ? (
        <Skeleton height={260} />
      ) : customers.status === "success" ? (
        <>
          <DataTable
            columns={columns}
            rows={customers.data.items.map((c) => ({ ...c, pointsBalance: c.pointsBalance ?? 0 }))}
            onRowClick={(row) => navigate(`/customers/${row.id}`)}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
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
        <p>Не удалось загрузить клиентов.</p>
      )}
    </div>
  );
}
