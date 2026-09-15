import { Router } from "express";
import { queryAs } from "../db";
import { asyncHandler } from "../asyncHandler";
import { requireCustomer } from "../auth/middleware";
import { mapCustomer, type CustomerRow } from "../mappers";
import { AppError } from "../errors";

export const customerRouter = Router();

customerRouter.get(
  "/me/profile",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const customerId = req.session!.sub;
    const rows = await queryAs<CustomerRow>(
      "app_customer",
      { customerId },
      "select * from customer_profiles where id = $1",
      [customerId],
    );
    const row = rows[0];
    if (!row) throw new AppError("VALIDATION", 404);
    res.json(mapCustomer(row));
  }),
);
