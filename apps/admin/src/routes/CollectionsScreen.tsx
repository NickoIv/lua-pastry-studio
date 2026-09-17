import { useState } from "react";
import { Badge, Button, PlusIcon, Skeleton } from "@lua/ui";
import {
  isServerMode,
  useAdminCollections,
  useAdminMenu,
  useCreateCollection,
  useDeleteCollection,
  useUpdateCollection,
} from "../data/hooks";
import { TableRowActions } from "../components/RowActionsMenu";
import { PageHeader } from "../components/PageHeader";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { CollectionFormModal, type CollectionFormValue } from "../components/CollectionFormModal";

interface CollectionRow {
  id: string;
  name: Record<string, string>;
  subtitle?: Record<string, string>;
  productIds: string[];
  active?: boolean;
  featured: boolean;
  sortOrder?: number;
  imageUrl?: string;
}

export function CollectionsScreen() {
  const collections = useAdminCollections();
  const menu = useAdminMenu();
  const createCollection = useCreateCollection();
  const updateCollection = useUpdateCollection();
  const deleteCollection = useDeleteCollection();
  const [modal, setModal] = useState<{ open: boolean; value: CollectionFormValue | null }>({
    open: false,
    value: null,
  });

  const columns: DataTableColumn<CollectionRow>[] = [
    { key: "name", header: "Коллекция", render: (c) => c.name.ru },
    { key: "subtitle", header: "Подзаголовок", render: (c) => c.subtitle?.ru ?? "—" },
    { key: "count", header: "Товаров", align: "right", render: (c) => c.productIds.length },
    {
      key: "featured",
      header: "Featured",
      render: (c) => (c.featured ? <Badge tone="accent">Да</Badge> : "—"),
    },
    {
      key: "status",
      header: "Статус",
      render: (c) => <Badge tone={c.active === false ? "neutral" : "success"}>{c.active === false ? "Скрыта" : "Активна"}</Badge>,
    },
    {
      key: "actions",
      header: "",
      render: (c) => (
        <TableRowActions
          actions={[
            {
              key: "edit",
              label: "Изменить",
              onClick: () =>
                setModal({
                  open: true,
                  value: {
                    id: c.id,
                    nameRu: c.name.ru ?? "",
                    nameKk: c.name.kk ?? "",
                    nameEn: c.name.en ?? "",
                    subtitleRu: c.subtitle?.ru ?? "",
                    sortOrder: c.sortOrder ?? 0,
                    active: c.active ?? true,
                    featured: c.featured,
                    productIds: c.productIds,
                    imageUrl: c.imageUrl ?? "",
                  },
                }),
            },
            {
              key: "delete",
              label: "Удалить",
              tone: "danger",
              onClick: async () => {
                await deleteCollection(c.id);
                collections.refresh();
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Коллекции"
        action={
          <Button leadingIcon={<PlusIcon />} disabled={!isServerMode} onClick={() => setModal({ open: true, value: null })}>
            Новая коллекция
          </Button>
        }
      />
      {!isServerMode ? (
        <p style={{ color: "var(--lua-color-text-muted)", marginBottom: 16 }}>
          Редактирование коллекций доступно только в режиме реального бэкенда (VITE_LUA_DATA_MODE=server).
        </p>
      ) : null}
      {collections.status === "loading" ? (
        <Skeleton height={220} />
      ) : collections.status === "success" ? (
        <DataTable columns={columns} rows={collections.data} />
      ) : (
        <p>Не удалось загрузить коллекции.</p>
      )}

      <CollectionFormModal
        open={modal.open}
        onClose={() => setModal({ open: false, value: null })}
        initial={modal.value}
        products={menu.status === "success" ? menu.data.products : []}
        onSubmit={async (input) => {
          if (modal.value?.id) {
            await updateCollection(modal.value.id, input);
          } else {
            await createCollection(input);
          }
          collections.refresh();
        }}
      />
    </div>
  );
}
