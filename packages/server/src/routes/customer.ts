import { Router } from "express";
import { queryAs, withRole } from "../db";
import { asyncHandler } from "../asyncHandler";
import { requireCustomer } from "../auth/middleware";
import { mapCustomer, type CustomerRow } from "../mappers";
import { AppError } from "../errors";
import { readNonEmptyString, readOptionalDateOnly } from "../validation";

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

interface UpdateProfileBody {
  firstName?: unknown;
  lastName?: unknown;
  birthDate?: unknown;
  /** Guest's "current coffee shop" — see docs/ARCHITECTURE.md "Guest location selection". */
  homeLocationId?: unknown;
}

customerRouter.patch(
  "/me/profile",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const body = req.body as UpdateProfileBody;
    const customerId = req.session!.sub;
    const firstName = body.firstName !== undefined ? readNonEmptyString(body.firstName, "firstName") : null;
    const lastNameTouched = body.lastName !== undefined;
    const lastName = lastNameTouched ? (typeof body.lastName === "string" ? body.lastName.trim() || null : null) : null;
    const birthDateTouched = body.birthDate !== undefined;
    const birthDate = birthDateTouched ? readOptionalDateOnly(body.birthDate) : null;
    const locationTouched = body.homeLocationId !== undefined;
    const homeLocationId = locationTouched
      ? typeof body.homeLocationId === "string" && body.homeLocationId
        ? body.homeLocationId
        : null
      : null;

    const row = await withRole("app_customer", { customerId }, async (client) => {
      const result = await client.query<CustomerRow>(
        `update customer_profiles set
           first_name = coalesce($1, first_name),
           last_name = case when $2 then $3 else last_name end,
           birth_date = case when $4 then $5 else birth_date end,
           home_location_id = case when $6 then $7 else home_location_id end
         where id = $8
         returning *`,
        [firstName, lastNameTouched, lastName, birthDateTouched, birthDate, locationTouched, homeLocationId, customerId],
      );
      return result.rows[0];
    });
    if (!row) throw new AppError("VALIDATION", 404);
    res.json(mapCustomer(row));
  }),
);
