import { Router } from "express";
import type pg from "pg";
import { queryAs, withRole } from "../db";
import { asyncHandler } from "../asyncHandler";
import { requireRole } from "../auth/middleware";
import { AppError } from "../errors";
import { writeAuditLog } from "../audit";
import { mapCollection, mapReward, type CollectionRow, type RewardRow } from "../mappers";
import {
  readBoolean,
  readLocalizedText,
  readOptionalLocalizedText,
  readOptionalPositiveInt,
  readPositiveInt,
} from "../validation";

export const adminCollectionsRouter = Router();

const adminOnly = requireRole("ADMIN", "OWNER");

/** Same derivation as packages/server/src/routes/adminCatalog.ts — see its comment. */
async function resolveMediaAssetId(client: pg.PoolClient, imageUrl: string | null) {
  if (!imageUrl) return null;
  const result = await client.query<{ id: string }>(
    "select id from media_assets where url = $1 and kind = 'collection'",
    [imageUrl],
  );
  return result.rows[0]?.id ?? null;
}

// ---- Collections -----------------------------------------------------

adminCollectionsRouter.get(
  "/admin/collections",
  adminOnly,
  asyncHandler(async (req, res) => {
    const rows = await queryAs<CollectionRow & { active: boolean; sort_order: number }>(
      "app_admin",
      { staffId: req.session!.sub },
      `select c.*, coalesce(array_agg(cp.product_id) filter (where cp.product_id is not null), '{}') as product_ids
       from collections c
       left join collection_products cp on cp.collection_id = c.id
       group by c.id
       order by c.sort_order`,
    );
    res.json(rows.map((r) => ({ ...mapCollection(r), active: r.active, sortOrder: r.sort_order })));
  }),
);

interface CollectionBody {
  name?: unknown;
  subtitle?: unknown;
  description?: unknown;
  active?: unknown;
  featured?: unknown;
  sortOrder?: unknown;
  productIds?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  imageUrl?: unknown;
}

async function setCollectionProducts(client: pg.PoolClient, collectionId: string, productIds: unknown) {
  if (!Array.isArray(productIds)) return;
  await client.query("delete from collection_products where collection_id = $1", [collectionId]);
  for (const productId of productIds) {
    if (typeof productId !== "string") continue;
    await client.query(
      "insert into collection_products (collection_id, product_id) values ($1, $2) on conflict do nothing",
      [collectionId, productId],
    );
  }
}

adminCollectionsRouter.post(
  "/admin/collections",
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = req.body as CollectionBody;
    const name = readLocalizedText(body.name);
    const staffId = req.session!.sub;

    const row = await withRole("app_admin", { staffId }, async (client) => {
      const imageUrl = typeof body.imageUrl === "string" && body.imageUrl ? body.imageUrl : null;
      const mediaAssetId = await resolveMediaAssetId(client, imageUrl);
      const result = await client.query<CollectionRow & { active: boolean }>(
        `insert into collections (name, subtitle, description, active, featured, sort_order, starts_at, ends_at, image_url, media_asset_id)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning *`,
        [
          JSON.stringify(name),
          body.subtitle !== undefined ? JSON.stringify(readOptionalLocalizedText(body.subtitle)) : null,
          body.description !== undefined ? JSON.stringify(readOptionalLocalizedText(body.description)) : null,
          readBoolean(body.active, true),
          readBoolean(body.featured, false),
          readOptionalPositiveInt(body.sortOrder) ?? 0,
          typeof body.startsAt === "string" ? body.startsAt : null,
          typeof body.endsAt === "string" ? body.endsAt : null,
          imageUrl,
          mediaAssetId,
        ],
      );
      const created = result.rows[0]!;
      await setCollectionProducts(client, created.id, body.productIds);
      await writeAuditLog(client, {
        action: "catalog.collection.created",
        actorStaffId: staffId,
        targetType: "collection",
        targetId: created.id,
        summary: `Создана коллекция «${name.ru}»`,
      });
      return created;
    });

    res.status(201).json({ ...mapCollection({ ...row, product_ids: [] }), active: row.active });
  }),
);

adminCollectionsRouter.patch(
  "/admin/collections/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = req.body as CollectionBody;
    const staffId = req.session!.sub;

    await withRole("app_admin", { staffId }, async (client) => {
      const existing = await client.query<CollectionRow>("select * from collections where id = $1", [
        req.params.id,
      ]);
      if (existing.rowCount === 0) throw new AppError("COLLECTION_NOT_FOUND", 404);

      const name = body.name !== undefined ? readLocalizedText(body.name) : null;
      const active = body.active !== undefined ? readBoolean(body.active) : null;
      const featured = body.featured !== undefined ? readBoolean(body.featured) : null;
      const sortOrder = body.sortOrder !== undefined ? readOptionalPositiveInt(body.sortOrder) : null;
      const imageUrl = typeof body.imageUrl === "string" && body.imageUrl ? body.imageUrl : null;
      const mediaAssetId = body.imageUrl !== undefined ? await resolveMediaAssetId(client, imageUrl) : null;

      await client.query(
        `update collections set
           name = coalesce($1, name),
           subtitle = case when $2 then $3 else subtitle end,
           description = case when $4 then $5 else description end,
           active = coalesce($6, active),
           featured = coalesce($7, featured),
           sort_order = coalesce($8, sort_order),
           starts_at = case when $9 then $10 else starts_at end,
           ends_at = case when $11 then $12 else ends_at end,
           image_url = case when $13 then $14 else image_url end,
           media_asset_id = case when $13 then $15 else media_asset_id end,
           updated_at = now()
         where id = $16`,
        [
          name ? JSON.stringify(name) : null,
          body.subtitle !== undefined,
          body.subtitle !== undefined ? JSON.stringify(readOptionalLocalizedText(body.subtitle)) : null,
          body.description !== undefined,
          body.description !== undefined ? JSON.stringify(readOptionalLocalizedText(body.description)) : null,
          active,
          featured,
          sortOrder,
          body.startsAt !== undefined,
          typeof body.startsAt === "string" ? body.startsAt : null,
          body.endsAt !== undefined,
          typeof body.endsAt === "string" ? body.endsAt : null,
          body.imageUrl !== undefined,
          imageUrl,
          mediaAssetId,
          req.params.id,
        ],
      );

      if (body.productIds !== undefined) {
        await setCollectionProducts(client, String(req.params.id), body.productIds);
      }

      await writeAuditLog(client, {
        action: "catalog.collection.updated",
        actorStaffId: staffId,
        targetType: "collection",
        targetId: String(req.params.id),
        summary: `Обновлена коллекция «${(name ?? (existing.rows[0]!.name as Record<string, string>)).ru}»`,
      });
    });

    const rows = await queryAs<CollectionRow & { active: boolean; sort_order: number }>(
      "app_admin",
      { staffId },
      `select c.*, coalesce(array_agg(cp.product_id) filter (where cp.product_id is not null), '{}') as product_ids
       from collections c left join collection_products cp on cp.collection_id = c.id
       where c.id = $1 group by c.id`,
      [req.params.id],
    );
    const row = rows[0]!;
    res.json({ ...mapCollection(row), active: row.active, sortOrder: row.sort_order });
  }),
);

adminCollectionsRouter.delete(
  "/admin/collections/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const staffId = req.session!.sub;
    await withRole("app_admin", { staffId }, async (client) => {
      const existing = await client.query<CollectionRow>("select * from collections where id = $1", [
        req.params.id,
      ]);
      if (existing.rowCount === 0) throw new AppError("COLLECTION_NOT_FOUND", 404);
      await client.query("delete from collections where id = $1", [req.params.id]);
      await writeAuditLog(client, {
        action: "catalog.collection.deleted",
        actorStaffId: staffId,
        targetType: "collection",
        targetId: String(req.params.id),
        summary: `Удалена коллекция «${(existing.rows[0]!.name as Record<string, string>).ru}»`,
      });
    });
    res.status(204).send();
  }),
);

// ---- Rewards (admin view + write) -----------------------------------

adminCollectionsRouter.get(
  "/admin/rewards",
  adminOnly,
  asyncHandler(async (req, res) => {
    const rows = await queryAs<RewardRow>(
      "app_admin",
      { staffId: req.session!.sub },
      "select * from rewards order by points_cost",
    );
    res.json(rows.map(mapReward));
  }),
);

interface RewardBody {
  title?: unknown;
  description?: unknown;
  linkedProductId?: unknown;
  pointsCost?: unknown;
  active?: unknown;
  perCustomerLimit?: unknown;
  perCustomerLimitWindowDays?: unknown;
  stock?: unknown;
}

adminCollectionsRouter.post(
  "/admin/rewards",
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = req.body as RewardBody;
    const title = readLocalizedText(body.title);
    const pointsCost = readPositiveInt(body.pointsCost, "pointsCost");
    if (pointsCost <= 0) throw new AppError("VALIDATION", 422);
    const staffId = req.session!.sub;

    const row = await withRole("app_admin", { staffId }, async (client) => {
      const result = await client.query<RewardRow>(
        `insert into rewards (title, description, linked_product_id, points_cost, is_active, per_customer_limit, per_customer_limit_window_days, stock)
         values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
        [
          JSON.stringify(title),
          body.description !== undefined ? JSON.stringify(readOptionalLocalizedText(body.description)) : null,
          typeof body.linkedProductId === "string" ? body.linkedProductId : null,
          pointsCost,
          readBoolean(body.active, true),
          readOptionalPositiveInt(body.perCustomerLimit),
          readOptionalPositiveInt(body.perCustomerLimitWindowDays),
          readOptionalPositiveInt(body.stock),
        ],
      );
      const created = result.rows[0]!;
      await writeAuditLog(client, {
        action: "catalog.reward.created",
        actorStaffId: staffId,
        targetType: "reward",
        targetId: created.id,
        summary: `Создана награда «${title.ru}» за ${pointsCost} баллов`,
        metadata: { pointsCost },
      });
      return created;
    });

    res.status(201).json(mapReward(row));
  }),
);

adminCollectionsRouter.patch(
  "/admin/rewards/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = req.body as RewardBody;
    const staffId = req.session!.sub;

    const row = await withRole("app_admin", { staffId }, async (client) => {
      const existing = await client.query<RewardRow>("select * from rewards where id = $1", [req.params.id]);
      if (existing.rowCount === 0) throw new AppError("REWARD_NOT_FOUND", 404);

      const title = body.title !== undefined ? readLocalizedText(body.title) : null;
      const pointsCost = body.pointsCost !== undefined ? readPositiveInt(body.pointsCost, "pointsCost") : null;
      const active = body.active !== undefined ? readBoolean(body.active) : null;

      const result = await client.query<RewardRow>(
        `update rewards set
           title = coalesce($1, title),
           description = case when $2 then $3 else description end,
           linked_product_id = case when $4 then $5 else linked_product_id end,
           points_cost = coalesce($6, points_cost),
           is_active = coalesce($7, is_active),
           per_customer_limit = case when $8 then $9 else per_customer_limit end,
           per_customer_limit_window_days = case when $10 then $11 else per_customer_limit_window_days end,
           stock = case when $12 then $13 else stock end
         where id = $14
         returning *`,
        [
          title ? JSON.stringify(title) : null,
          body.description !== undefined,
          body.description !== undefined ? JSON.stringify(readOptionalLocalizedText(body.description)) : null,
          body.linkedProductId !== undefined,
          typeof body.linkedProductId === "string" ? body.linkedProductId : null,
          pointsCost,
          active,
          body.perCustomerLimit !== undefined,
          readOptionalPositiveInt(body.perCustomerLimit),
          body.perCustomerLimitWindowDays !== undefined,
          readOptionalPositiveInt(body.perCustomerLimitWindowDays),
          body.stock !== undefined,
          readOptionalPositiveInt(body.stock),
          req.params.id,
        ],
      );
      const updated = result.rows[0]!;

      // IMPORTANT: this update never touches reward_redemptions.points_cost
      // — every redemption snapshots its cost at request time
      // (infra/db/migrations/005_functions.sql#request_reward_redemption),
      // so an in-flight PENDING redemption keeps its original price even
      // if the reward's live price changes here. See docs/QR-SECURITY.md.
      const wasArchived = active === false && existing.rows[0]!.is_active !== false;
      await writeAuditLog(client, {
        action: wasArchived ? "catalog.reward.archived" : "catalog.reward.updated",
        actorStaffId: staffId,
        targetType: "reward",
        targetId: updated.id,
        summary: `${wasArchived ? "Архивирована" : "Обновлена"} награда «${(updated.title as Record<string, string>).ru}»`,
      });
      return updated;
    });

    res.json(mapReward(row));
  }),
);
