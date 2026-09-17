import { Router } from "express";
import { queryAs, withRole } from "../db";
import { asyncHandler } from "../asyncHandler";
import { sessionRole } from "../auth/sessionRole";
import { requireRole } from "../auth/middleware";
import { AppError } from "../errors";
import { writeAuditLog } from "../audit";
import { mapLocation, type LocationRow } from "../mappers";
import { readBoolean, readNonEmptyString, readOptionalPositiveInt } from "../validation";

export const locationsRouter = Router();

const adminOnly = requireRole("ADMIN", "OWNER");

locationsRouter.get(
  "/locations",
  asyncHandler(async (req, res) => {
    const { role, guards } = sessionRole(req.session);
    const rows = await queryAs<LocationRow>(
      role,
      guards,
      "select * from locations order by sort_order, name",
    );
    res.json(rows.map(mapLocation));
  }),
);

interface LocationBody {
  name?: unknown;
  shortName?: unknown;
  address?: unknown;
  city?: unknown;
  phone?: unknown;
  openHours?: unknown;
  sortOrder?: unknown;
  isActive?: unknown;
}

/**
 * Real Admin data (product brief §4) — a location's name/address/hours
 * are no longer hardcoded seed values. Every write goes through
 * admin_create_location/admin_update_location (020_locations_and_staff_multi_location.sql)
 * so nothing here can slip past RLS.
 */
locationsRouter.post(
  "/admin/locations",
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = req.body as LocationBody;
    const name = readNonEmptyString(body.name, "name");
    const shortName = readNonEmptyString(body.shortName, "shortName");
    const address = readNonEmptyString(body.address, "address");
    const city = readNonEmptyString(body.city, "city");
    const openHours = readNonEmptyString(body.openHours, "openHours");
    const phone = typeof body.phone === "string" && body.phone ? body.phone : null;
    const sortOrder = readOptionalPositiveInt(body.sortOrder) ?? 0;
    const actorStaffId = req.session!.sub;

    const row = await withRole("app_admin", { staffId: actorStaffId }, async (client) => {
      const result = await client.query<LocationRow>(
        "select * from admin_create_location($1, $2, $3, $4, $5, $6, $7)",
        [name, shortName, address, city, phone, openHours, sortOrder],
      );
      const created = result.rows[0]!;
      await writeAuditLog(client, {
        action: "location.created",
        actorStaffId,
        targetType: "location",
        targetId: created.id,
        summary: `Создана точка «${shortName}»`,
      });
      return created;
    });

    res.status(201).json(mapLocation(row));
  }),
);

locationsRouter.patch(
  "/admin/locations/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = req.body as LocationBody;
    const name = body.name !== undefined ? readNonEmptyString(body.name, "name") : null;
    const shortName = body.shortName !== undefined ? readNonEmptyString(body.shortName, "shortName") : null;
    const address = body.address !== undefined ? readNonEmptyString(body.address, "address") : null;
    const city = body.city !== undefined ? readNonEmptyString(body.city, "city") : null;
    const openHours = body.openHours !== undefined ? readNonEmptyString(body.openHours, "openHours") : null;
    const phone = body.phone !== undefined ? (typeof body.phone === "string" ? body.phone : null) : null;
    const sortOrder = body.sortOrder !== undefined ? readOptionalPositiveInt(body.sortOrder) : null;
    const isActive = body.isActive !== undefined ? readBoolean(body.isActive) : null;
    const actorStaffId = req.session!.sub;

    const row = await withRole("app_admin", { staffId: actorStaffId }, async (client) => {
      const existing = await client.query<LocationRow>("select * from locations where id = $1", [req.params.id]);
      if (existing.rowCount === 0) throw new AppError("LOCATION_NOT_FOUND", 404);

      const result = await client.query<LocationRow>(
        "select * from admin_update_location($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [req.params.id, name, shortName, address, city, phone, openHours, sortOrder, isActive],
      );
      const updated = result.rows[0]!;
      await writeAuditLog(client, {
        action: "location.updated",
        actorStaffId,
        targetType: "location",
        targetId: updated.id,
        summary: `Обновлена точка «${updated.short_name}»`,
      });
      return updated;
    });

    res.json(mapLocation(row));
  }),
);
