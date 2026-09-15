import { Badge, Button, Money, PlusIcon, Skeleton } from "@lua/ui";
import { useAdminMenu } from "../data/hooks";
import { PageHeader } from "../components/PageHeader";
import { DataTable, type DataTableColumn } from "../components/DataTable";

interface ProductRow {
  id: string;
  categoryId: string;
  name: Record<string, string>;
  price: { currency: "KZT"; minorUnits: number };
  isMustTry: boolean;
  isNew: boolean;
  isSeasonal: boolean;
}

export function MenuScreen() {
  const menu = useAdminMenu();

  const categoryName = (id: string) =>
    menu.status === "success"
      ? (menu.data.categories.find((c) => c.id === id)?.name.ru ?? "—")
      : "—";

  const columns: DataTableColumn<ProductRow>[] = [
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
      {menu.status === "loading" ? (
        <Skeleton height={300} />
      ) : menu.status === "success" ? (
        <DataTable columns={columns} rows={menu.data.products} />
      ) : (
        <p>Не удалось загрузить меню.</p>
      )}
    </div>
  );
}
