import { Router } from "express";
import { queryAs, withRole } from "../db";
import { asyncHandler } from "../asyncHandler";
import { requireRole } from "../auth/middleware";
import { AppError } from "../errors";
import { writeAuditLog } from "../audit";
import {
  mapCategory,
  mapProduct,
  type CategoryRow,
  type ProductRow,
} from "../mappers";
import {
  readBoolean,
  readLocalizedText,
  readOptionalLocalizedText,
  readOptionalPositiveInt,
  readPriceMinorUnits,
  readSlug,
  readStringArray,
} from "../validation";

export const adminCatalogRouter = Router();

const adminOnly = requireRole("ADMIN", "OWNER");

// ---- Categories --------------------------------------------------------

adminCatalogRouter.get(
  "/admin/categories",
  adminOnly,
  asyncHandler(async (req, res) => {
    const rows = await queryAs<CategoryRow & { active: boolean }>(
      "app_admin",
      { staffId: req.session!.sub },
      "select * from product_categories order by sort_order",
    );
    res.json(rows.map((r) => ({ ...mapCategory(r), active: r.active })));
  }),
);

interface CategoryBody {
  name?: unknown;
  slug?: unknown;
  sortOrder?: unknown;
  active?: unknown;
}

adminCatalogRouter.post(
  "/admin/categories",
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = req.body as CategoryBody;
    const name = readLocalizedText(body.name);
    const slug = readSlug(body.slug ?? name.ru);
    const sortOrder = readOptionalPositiveInt(body.sortOrder) ?? 0;
    const staffId = req.session!.sub;

    const row = await withRole("app_admin", { staffId }, async (client) => {
      const result = await client.query<CategoryRow & { active: boolean }>(
        `insert into product_categories (name, slug, sort_order, active)
         values ($1, $2, $3, $4) returning *`,
        [JSON.stringify(name), slug, sortOrder, readBoolean(body.active, true)],
      );
      const created = result.rows[0]!;
      await writeAuditLog(client, {
        action: "catalog.category.created",
        actorStaffId: staffId,
        targetType: "product_category",
        targetId: created.id,
        summary: `Создана категория «${name.ru}»`,
      });
      return created;
    });

    res.status(201).json({ ...mapCategory(row), active: row.active });
  }),
);

adminCatalogRouter.patch(
  "/admin/categories/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = req.body as CategoryBody;
    const staffId = req.session!.sub;

    const row = await withRole("app_admin", { staffId }, async (client) => {
      const existing = await client.query<CategoryRow>(
        "select * from product_categories where id = $1",
        [req.params.id],
      );
      if (existing.rowCount === 0) throw new AppError("CATEGORY_NOT_FOUND", 404);

      const name = body.name !== undefined ? readLocalizedText(body.name) : null;
      const slug = body.slug !== undefined ? readSlug(body.slug) : null;
      const sortOrder = body.sortOrder !== undefined ? readOptionalPositiveInt(body.sortOrder) : null;
      const active = body.active !== undefined ? readBoolean(body.active) : null;

      const result = await client.query<CategoryRow & { active: boolean }>(
        `update product_categories set
           name = coalesce($1, name),
           slug = coalesce($2, slug),
           sort_order = coalesce($3, sort_order),
           active = coalesce($4, active),
           updated_at = now()
         where id = $5
         returning *`,
        [name ? JSON.stringify(name) : null, slug, sortOrder, active, req.params.id],
      );
      const updated = result.rows[0]!;
      await writeAuditLog(client, {
        action: "catalog.category.updated",
        actorStaffId: staffId,
        targetType: "product_category",
        targetId: updated.id,
        summary: `Обновлена категория «${(updated.name as Record<string, string>).ru}»`,
      });
      return updated;
    });

    res.json({ ...mapCategory(row), active: row.active });
  }),
);

adminCatalogRouter.delete(
  "/admin/categories/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const staffId = req.session!.sub;
    await withRole("app_admin", { staffId }, async (client) => {
      const existing = await client.query<CategoryRow>(
        "select * from product_categories where id = $1",
        [req.params.id],
      );
      if (existing.rowCount === 0) throw new AppError("CATEGORY_NOT_FOUND", 404);

      try {
        await client.query("delete from product_categories where id = $1", [req.params.id]);
      } catch (error) {
        const pgError = error as { code?: string };
        if (pgError.code === "23503") throw new AppError("CATEGORY_IN_USE", 409);
        throw error;
      }

      await writeAuditLog(client, {
        action: "catalog.category.deleted",
        actorStaffId: staffId,
        targetType: "product_category",
        targetId: String(req.params.id),
        summary: `Удалена категория «${(existing.rows[0]!.name as Record<string, string>).ru}»`,
      });
    });
    res.status(204).send();
  }),
);

// ---- Products ------------------------------------------------------------

adminCatalogRouter.get(
  "/admin/products",
  adminOnly,
  asyncHandler(async (req, res) => {
    const rows = await queryAs<ProductRow & { active: boolean }>(
      "app_admin",
      { staffId: req.session!.sub },
      "select * from products order by created_at",
    );
    res.json(rows.map((r) => ({ ...mapProduct(r), active: r.active })));
  }),
);

interface ProductBody {
  categoryId?: unknown;
  name?: unknown;
  description?: unknown;
  price?: unknown;
  allergens?: unknown;
  isSeasonal?: unknown;
  isNew?: unknown;
  isMustTry?: unknown;
  active?: unknown;
  imageUrl?: unknown;
}

adminCatalogRouter.post(
  "/admin/products",
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = req.body as ProductBody;
    const name = readLocalizedText(body.name);
    const description = readOptionalLocalizedText(body.description) ?? { ru: "", kk: "", en: "" };
    const categoryId = typeof body.categoryId === "string" ? body.categoryId : null;
    if (!categoryId) throw new AppError("VALIDATION", 422);
    const priceMinorUnits = readPriceMinorUnits(body.price);
    const staffId = req.session!.sub;

    const row = await withRole("app_admin", { staffId }, async (client) => {
      const result = await client.query<ProductRow & { active: boolean }>(
        `insert into products (category_id, name, description, price_minor_units, allergens, is_seasonal, is_new, is_must_try, active, image_url)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning *`,
        [
          categoryId,
          JSON.stringify(name),
          JSON.stringify(description),
          priceMinorUnits,
          readStringArray(body.allergens),
          readBoolean(body.isSeasonal),
          readBoolean(body.isNew),
          readBoolean(body.isMustTry),
          readBoolean(body.active, true),
          typeof body.imageUrl === "string" && body.imageUrl ? body.imageUrl : null,
        ],
      );
      const created = result.rows[0]!;

      const locations = await client.query<{ id: string }>("select id from locations");
      for (const location of locations.rows) {
        await client.query(
          "insert into product_availability (product_id, location_id, in_stock) values ($1, $2, true) on conflict do nothing",
          [created.id, location.id],
        );
      }

      await writeAuditLog(client, {
        action: "catalog.product.created",
        actorStaffId: staffId,
        targetType: "product",
        targetId: created.id,
        summary: `Создан товар «${name.ru}»`,
        metadata: { priceMinorUnits },
      });
      return created;
    });

    res.status(201).json({ ...mapProduct(row), active: row.active });
  }),
);

adminCatalogRouter.patch(
  "/admin/products/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = req.body as ProductBody;
    const staffId = req.session!.sub;

    const row = await withRole("app_admin", { staffId }, async (client) => {
      const existing = await client.query<ProductRow & { active: boolean }>(
        "select * from products where id = $1",
        [req.params.id],
      );
      if (existing.rowCount === 0) throw new AppError("PRODUCT_NOT_FOUND", 404);

      const name = body.name !== undefined ? readLocalizedText(body.name) : null;
      const description = body.description !== undefined ? readOptionalLocalizedText(body.description) : null;
      const price = body.price !== undefined ? readPriceMinorUnits(body.price) : null;
      const categoryId = typeof body.categoryId === "string" ? body.categoryId : null;
      const allergens = body.allergens !== undefined ? readStringArray(body.allergens) : null;
      const isSeasonal = body.isSeasonal !== undefined ? readBoolean(body.isSeasonal) : null;
      const isNew = body.isNew !== undefined ? readBoolean(body.isNew) : null;
      const isMustTry = body.isMustTry !== undefined ? readBoolean(body.isMustTry) : null;
      const active = body.active !== undefined ? readBoolean(body.active) : null;
      const imageUrl = body.imageUrl !== undefined ? (body.imageUrl as string | null) : undefined;

      const result = await client.query<ProductRow & { active: boolean }>(
        `update products set
           category_id = coalesce($1, category_id),
           name = coalesce($2, name),
           description = coalesce($3, description),
           price_minor_units = coalesce($4, price_minor_units),
           allergens = coalesce($5, allergens),
           is_seasonal = coalesce($6, is_seasonal),
           is_new = coalesce($7, is_new),
           is_must_try = coalesce($8, is_must_try),
           active = coalesce($9, active),
           image_url = case when $10 then $11 else image_url end,
           updated_at = now()
         where id = $12
         returning *`,
        [
          categoryId,
          name ? JSON.stringify(name) : null,
          description ? JSON.stringify(description) : null,
          price,
          allergens,
          isSeasonal,
          isNew,
          isMustTry,
          active,
          imageUrl !== undefined,
          imageUrl ?? null,
          req.params.id,
        ],
      );
      const updated = result.rows[0]!;

      const wasArchived = active === false && existing.rows[0]!.active !== false;
      await writeAuditLog(client, {
        action: wasArchived ? "catalog.product.archived" : "catalog.product.updated",
        actorStaffId: staffId,
        targetType: "product",
        targetId: updated.id,
        summary: `${wasArchived ? "Архивирован" : "Обновлён"} товар «${(updated.name as Record<string, string>).ru}»`,
      });
      return updated;
    });

    res.json({ ...mapProduct(row), active: row.active });
  }),
);

// ---- Availability -----------------------------------------------------

adminCatalogRouter.get(
  "/admin/products/:id/availability",
  adminOnly,
  asyncHandler(async (req, res) => {
    const rows = await queryAs<{
      product_id: string;
      location_id: string;
      in_stock: boolean;
      daily_limit: number | null;
      unavailable_reason: string | null;
    }>(
      "app_admin",
      { staffId: req.session!.sub },
      "select * from product_availability where product_id = $1",
      [req.params.id],
    );
    res.json(
      rows.map((r) => ({
        productId: r.product_id,
        locationId: r.location_id,
        inStock: r.in_stock,
        dailyLimit: r.daily_limit,
        unavailableReason: r.unavailable_reason,
      })),
    );
  }),
);

interface AvailabilityBody {
  locationId?: unknown;
  inStock?: unknown;
  dailyLimit?: unknown;
  unavailableReason?: unknown;
}

adminCatalogRouter.put(
  "/admin/products/:id/availability",
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = req.body as AvailabilityBody;
    if (typeof body.locationId !== "string") throw new AppError("VALIDATION", 422);
    const inStock = readBoolean(body.inStock, true);
    const staffId = req.session!.sub;

    await withRole("app_admin", { staffId }, async (client) => {
      await client.query(
        `insert into product_availability (product_id, location_id, in_stock, daily_limit, unavailable_reason)
         values ($1, $2, $3, $4, $5)
         on conflict (product_id, location_id) do update set
           in_stock = excluded.in_stock, daily_limit = excluded.daily_limit, unavailable_reason = excluded.unavailable_reason`,
        [
          req.params.id,
          body.locationId,
          inStock,
          readOptionalPositiveInt(body.dailyLimit),
          typeof body.unavailableReason === "string" ? body.unavailableReason : null,
        ],
      );
      await writeAuditLog(client, {
        action: "catalog.availability.updated",
        actorStaffId: staffId,
        targetType: "product",
        targetId: String(req.params.id),
        summary: `Обновлена доступность товара`,
        metadata: { locationId: body.locationId as string, inStock },
      });
    });

    res.status(204).send();
  }),
);
