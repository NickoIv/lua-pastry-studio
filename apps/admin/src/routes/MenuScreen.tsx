import { useState } from "react";
import { Badge, Button, Money, PlusIcon, Skeleton } from "@lua/ui";
import { ApiRequestError } from "@lua/data-server";
import { API_ERROR_MESSAGES_RU } from "@lua/types";
import {
  isServerMode,
  useAdminMenu,
  useCreateCategory,
  useCreateProduct,
  useDeleteCategory,
  useLocations,
  useUpdateCategory,
  useUpdateProduct,
} from "../data/hooks";
import { PageHeader } from "../components/PageHeader";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { CategoryFormModal, type CategoryFormValue } from "../components/CategoryFormModal";
import { ProductFormModal, type ProductFormValue } from "../components/ProductFormModal";
import { AvailabilityModal } from "../components/AvailabilityModal";

interface CategoryRow {
  id: string;
  name: Record<string, string>;
  sortOrder: number;
  active?: boolean;
}

interface ProductRow {
  id: string;
  categoryId: string;
  name: Record<string, string>;
  description: Record<string, string>;
  price: { currency: "KZT"; minorUnits: number };
  allergens: string[];
  isMustTry: boolean;
  isNew: boolean;
  isSeasonal: boolean;
  active?: boolean;
  imageUrl?: string;
}

export function MenuScreen() {
  const menu = useAdminMenu();
  const locations = useLocations();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const [categoryModal, setCategoryModal] = useState<{ open: boolean; value: CategoryFormValue | null }>({
    open: false,
    value: null,
  });
  const [productModal, setProductModal] = useState<{ open: boolean; value: ProductFormValue | null }>({
    open: false,
    value: null,
  });
  const [availabilityFor, setAvailabilityFor] = useState<{ id: string; name: string } | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const categoryName = (id: string) =>
    menu.status === "success" ? (menu.data.categories.find((c) => c.id === id)?.name.ru ?? "—") : "—";

  async function handleDeleteCategory(id: string) {
    setCategoryError(null);
    try {
      await deleteCategory(id);
      menu.refresh();
    } catch (err) {
      setCategoryError(
        err instanceof ApiRequestError ? API_ERROR_MESSAGES_RU[err.code] : "Не удалось удалить категорию",
      );
    }
  }

  const categoryColumns: DataTableColumn<CategoryRow>[] = [
    { key: "name", header: "Категория", render: (c) => c.name.ru },
    { key: "sort", header: "Порядок", render: (c) => c.sortOrder },
    {
      key: "status",
      header: "Статус",
      render: (c) => <Badge tone={c.active === false ? "neutral" : "success"}>{c.active === false ? "Скрыта" : "Активна"}</Badge>,
    },
    {
      key: "actions",
      header: "",
      render: (c) => (
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant="ghost"
            onClick={() =>
              setCategoryModal({
                open: true,
                value: { id: c.id, nameRu: c.name.ru ?? "", nameKk: c.name.kk ?? "", nameEn: c.name.en ?? "", sortOrder: c.sortOrder, active: c.active ?? true },
              })
            }
          >
            Изменить
          </Button>
          <Button variant="ghost" onClick={() => void handleDeleteCategory(c.id)}>
            Удалить
          </Button>
        </div>
      ),
    },
  ];

  const productColumns: DataTableColumn<ProductRow>[] = [
    { key: "name", header: "Товар", render: (p) => p.name.ru },
    { key: "category", header: "Категория", render: (p) => categoryName(p.categoryId) },
    { key: "price", header: "Цена", align: "right", render: (p) => <Money value={p.price} /> },
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
      key: "status",
      header: "Статус",
      render: (p) => <Badge tone={p.active === false ? "neutral" : "success"}>{p.active === false ? "В архиве" : "Активен"}</Badge>,
    },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            variant="ghost"
            onClick={() =>
              setProductModal({
                open: true,
                value: {
                  id: p.id,
                  categoryId: p.categoryId,
                  nameRu: p.name.ru ?? "",
                  nameKk: p.name.kk ?? "",
                  nameEn: p.name.en ?? "",
                  descriptionRu: p.description?.ru ?? "",
                  descriptionKk: p.description?.kk ?? "",
                  descriptionEn: p.description?.en ?? "",
                  price: Math.round(p.price.minorUnits / 100),
                  allergens: (p.allergens ?? []).join(", "),
                  isSeasonal: p.isSeasonal,
                  isNew: p.isNew,
                  isMustTry: p.isMustTry,
                  active: p.active ?? true,
                  imageUrl: p.imageUrl ?? "",
                },
              })
            }
          >
            Изменить
          </Button>
          <Button variant="ghost" onClick={() => setAvailabilityFor({ id: p.id, name: p.name.ru ?? "" })}>
            Наличие
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              await updateProduct(p.id, { active: p.active === false });
              menu.refresh();
            }}
          >
            {p.active === false ? "Вернуть" : "Архивировать"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Меню"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              variant="secondary"
              leadingIcon={<PlusIcon />}
              disabled={!isServerMode}
              onClick={() => setCategoryModal({ open: true, value: null })}
            >
              Категория
            </Button>
            <Button leadingIcon={<PlusIcon />} disabled={!isServerMode} onClick={() => setProductModal({ open: true, value: null })}>
              Товар
            </Button>
          </div>
        }
      />
      {!isServerMode ? (
        <p style={{ color: "var(--lua-color-text-muted)", marginBottom: 16 }}>
          Редактирование каталога доступно только в режиме реального бэкенда (VITE_LUA_DATA_MODE=server).
        </p>
      ) : null}
      {menu.status === "loading" ? (
        <Skeleton height={300} />
      ) : menu.status === "success" ? (
        <>
          <h2 style={{ fontSize: "var(--lua-text-md)", marginBottom: 8 }}>Категории</h2>
          {categoryError ? <p className="lua-form-field__error">{categoryError}</p> : null}
          <div style={{ marginBottom: 24 }}>
            <DataTable columns={categoryColumns} rows={menu.data.categories} />
          </div>
          <h2 style={{ fontSize: "var(--lua-text-md)", marginBottom: 8 }}>Товары</h2>
          <DataTable columns={productColumns} rows={menu.data.products} />
        </>
      ) : (
        <p>Не удалось загрузить меню.</p>
      )}

      <CategoryFormModal
        open={categoryModal.open}
        onClose={() => setCategoryModal({ open: false, value: null })}
        initial={categoryModal.value}
        onSubmit={async (input) => {
          if (categoryModal.value?.id) {
            await updateCategory(categoryModal.value.id, input);
          } else {
            await createCategory(input);
          }
          menu.refresh();
        }}
      />
      <ProductFormModal
        open={productModal.open}
        onClose={() => setProductModal({ open: false, value: null })}
        initial={productModal.value}
        categories={menu.status === "success" ? menu.data.categories : []}
        onSubmit={async (input) => {
          if (productModal.value?.id) {
            await updateProduct(productModal.value.id, input);
          } else {
            await createProduct(input);
          }
          menu.refresh();
        }}
      />
      <AvailabilityModal
        open={availabilityFor !== null}
        onClose={() => setAvailabilityFor(null)}
        productId={availabilityFor?.id ?? null}
        productName={availabilityFor?.name ?? ""}
        locations={locations.status === "success" ? locations.data : []}
      />
    </div>
  );
}
