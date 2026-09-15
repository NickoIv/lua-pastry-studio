import { Badge, Button, Money, PlusIcon } from "@lua/ui";
import type { Product } from "@lua/types";
import { useBackend } from "../backend/useBackend";
import { PageHeader } from "../components/PageHeader";
import { DataTable, type DataTableColumn } from "../components/DataTable";

export function MenuScreen() {
  const backend = useBackend();
  const products = backend.store.products;
  const categoryName = (id: string) =>
    backend.store.categories.find((c) => c.id === id)?.name.ru ?? "—";

  const columns: DataTableColumn<Product>[] = [
    { key: "name", header: "Товар", render: (p) => p.name.ru },
    { key: "category", header: "Категория", render: (p) => categoryName(p.categoryId) },
    {
      key: "price",
      header: "Цена",
      align: "right",
      render: (p) => <Money value={p.price} />,
    },
    {
      key: "flags",
      header: "Метки",
      render: (p) => (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {p.isMustTry ? <Badge tone="accent">Must Try</Badge> : null}
          {p.isNew ? <Badge tone="success">Новинка</Badge> : null}
          {p.isSeasonal ? <Badge tone="warning">Сезонное</Badge> : null}
        </div>
      ),
    },
    {
      key: "availability",
      header: "Наличие",
      render: (p) => (
        <Badge tone={p.availability.every((a) => a.inStock) ? "success" : "danger"}>
          {p.availability.every((a) => a.inStock) ? "В наличии" : "Нет в наличии"}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Меню"
        action={
          <Button leadingIcon={<PlusIcon />} disabled>
            Добавить товар
          </Button>
        }
      />
      <DataTable columns={columns} rows={products} />
    </div>
  );
}
