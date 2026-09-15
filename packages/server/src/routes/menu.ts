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

menuRouter.get(
  "/menu/categories",
  asyncHandler(async (req, res) => {
    const { role, guards } = sessionRole(req.session);
    const rows = await queryAs<CategoryRow>(
      role,
      guards,
      "select * from product_categories order by sort_order",
    );
    res.json(rows.map(mapCategory));
  }),
);

menuRouter.get(
  "/menu/products",
  asyncHandler(async (req, res) => {
    const { role, guards } = sessionRole(req.session);
    const rows = await queryAs<ProductRow>(
      role,
      guards,
      "select * from products order by created_at",
    );
    res.json(rows.map(mapProduct));
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
       group by c.id
       order by c.featured desc`,
    );
    res.json(rows.map(mapCollection));
  }),
);
