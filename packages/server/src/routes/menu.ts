import { Router } from "express";
import { queryAs } from "../db";
import { asyncHandler } from "../asyncHandler";
import { sessionRole } from "../auth/sessionRole";
import {
  mapCategory,
  mapCollection,
  mapProduct,
  type CategoryRow,
  type CollectionRow,
  type ProductRow,
} from "../mappers";

export const menuRouter = Router();

/**
 * Guest/Staff-facing catalog: only `active` rows, and each product
 * carries a computed `inStockAnywhere` so the UI can show "Нет в
 * наличии" instead of hiding an otherwise-active product that's just
 * out of stock everywhere today — see docs/ARCHITECTURE.md "Admin
 * catalog CMS". Inactive (archived/discontinued) products are not sent
 * at all, matching the product brief §6.
 */
menuRouter.get(
  "/menu/categories",
  asyncHandler(async (req, res) => {
    const { role, guards } = sessionRole(req.session);
    const rows = await queryAs<CategoryRow>(
      role,
      guards,
      "select * from product_categories where active order by sort_order",
    );
    res.json(rows.map(mapCategory));
  }),
);

menuRouter.get(
  "/menu/products",
  asyncHandler(async (req, res) => {
    const { role, guards } = sessionRole(req.session);
    const rows = await queryAs<ProductRow & { in_stock_anywhere: boolean }>(
      role,
      guards,
      `select p.*,
         coalesce(bool_or(pa.in_stock), true) as in_stock_anywhere
       from products p
       left join product_availability pa on pa.product_id = p.id
       where p.active
       group by p.id
       order by p.created_at`,
    );
    res.json(rows.map((row) => ({ ...mapProduct(row), inStockAnywhere: row.in_stock_anywhere })));
  }),
);

menuRouter.get(
  "/menu/collections",
  asyncHandler(async (req, res) => {
    const { role, guards } = sessionRole(req.session);
    const rows = await queryAs<CollectionRow>(
      role,
      guards,
      `select c.*, coalesce(array_agg(cp.product_id) filter (where cp.product_id is not null), '{}') as product_ids
       from collections c
       left join collection_products cp on cp.collection_id = c.id
       where c.active
       group by c.id
       order by c.sort_order, c.featured desc`,
    );
    res.json(rows.map(mapCollection));
  }),
);
