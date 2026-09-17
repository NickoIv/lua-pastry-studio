import { Router } from "express";
import type pg from "pg";
import { withRole } from "../db";
import { asyncHandler } from "../asyncHandler";
import { requireRole } from "../auth/middleware";
import { AppError } from "../errors";
import { writeAuditLog } from "../audit";
import {
  readAssignableStaffRole,
  readNonEmptyString,
  readPassword,
  readPin,
  readStaffCode,
  readUuidArray,
} from "../validation";

export const adminStaffRouter = Router();

const adminOnly = requireRole("ADMIN", "OWNER");

interface StaffAccountRow {
  id: string;
  email: string | null;
  display_name: string;
  role: string;
  location_id: string;
  staff_code: string;
  active: boolean;
  created_at: string;
}

function mapStaffAccount(row: StaffAccountRow, locationIds: string[]) {
  return {
    id: row.id,
    email: row.email ?? undefined,
    displayName: row.display_name,
    role: row.role,
    locationId: row.location_id,
    locationIds,
    staffCode: row.staff_code,
    active: row.active,
    createdAt: row.created_at,
  };
}

async function fetchLocationIds(client: pg.PoolClient, staffId: string) {
  const rows = await client.query<{ location_id: string }>(
    `select sl.location_id from staff_locations sl
     join locations l on l.id = sl.location_id
     where sl.staff_id = $1
     order by l.sort_order`,
    [staffId],
  );
  return rows.rows.map((r) => r.location_id);
}

/**
 * The simplified default flow (product brief §6): a staff code + PIN,
 * no individual work email required. Email/password remain accepted
 * as optional secondary fields (e.g. an ADMIN who wants a real login),
 * never as the only option — see 021_staff_pin_auth.sql.
 */
interface CreateStaffBody {
  displayName?: unknown;
  role?: unknown;
  locationIds?: unknown;
  primaryLocationId?: unknown;
  staffCode?: unknown;
  pin?: unknown;
  email?: unknown;
  password?: unknown;
}

adminStaffRouter.post(
  "/admin/staff",
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = req.body as CreateStaffBody;
    const displayName = readNonEmptyString(body.displayName, "displayName");
    const role = readAssignableStaffRole(body.role);
    const locationIds = readUuidArray(body.locationIds, "locationIds");
    const primaryLocationId = readNonEmptyString(body.primaryLocationId, "primaryLocationId");
    if (!locationIds.includes(primaryLocationId)) throw new AppError("VALIDATION", 422);
    const staffCode = readStaffCode(body.staffCode);
    const pin = body.pin !== undefined ? readPin(body.pin) : null;
    const email = body.email !== undefined ? readNonEmptyString(body.email, "email") : null;
    const password = body.password !== undefined ? readPassword(body.password) : null;
    if (!pin && !password) throw new AppError("VALIDATION", 422);
    const actorStaffId = req.session!.sub;

    const row = await withRole("app_admin", { staffId: actorStaffId }, async (client) => {
      const result = await client.query<StaffAccountRow>(
        "select * from admin_create_staff_account_v2($1, $2, $3, $4, $5, $6, $7, $8)",
        [displayName, role, locationIds, primaryLocationId, staffCode, pin, email, password],
      );
      const created = result.rows[0]!;
      await writeAuditLog(client, {
        action: "staff.created",
        actorStaffId,
        targetType: "staff",
        targetId: created.id,
        summary: `Создан сотрудник «${displayName}» (${role})`,
        metadata: { role },
      });
      return created;
    });

    res.status(201).json(mapStaffAccount(row, locationIds));
  }),
);

interface UpdateStaffBody {
  displayName?: unknown;
  role?: unknown;
  active?: unknown;
  locationId?: unknown;
}

adminStaffRouter.patch(
  "/admin/staff/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = req.body as UpdateStaffBody;
    const displayName = body.displayName !== undefined ? readNonEmptyString(body.displayName, "displayName") : null;
    const role = body.role !== undefined ? readAssignableStaffRole(body.role) : null;
    const active = typeof body.active === "boolean" ? body.active : null;
    const locationId = typeof body.locationId === "string" ? body.locationId : null;
    const actorStaffId = req.session!.sub;

    if (req.params.id === actorStaffId && active === false) {
      // A plain FORBIDDEN reads oddly here ("нет прав") for what's
      // really "you're about to lock yourself out" — but there's no
      // dedicated code for it and this is a narrow, honest edge case,
      // not a security boundary the DB function also needs to enforce.
      throw new AppError("VALIDATION", 422);
    }

    const { row, locationIds } = await withRole("app_admin", { staffId: actorStaffId }, async (client) => {
      const before = await client.query<{ active: boolean; role: string }>(
        "select active, role from staff_profiles where id = $1",
        [req.params.id],
      );
      const result = await client.query<StaffAccountRow>(
        "select * from admin_update_staff_account($1, $2, $3, $4, $5)",
        [req.params.id, displayName, role, active, locationId],
      );
      const updated = result.rows[0]!;

      let action: "staff.updated" | "staff.deactivated" | "staff.reactivated" = "staff.updated";
      if (active === true && before.rows[0]?.active === false) action = "staff.reactivated";
      else if (active === false && before.rows[0]?.active !== false) action = "staff.deactivated";

      await writeAuditLog(client, {
        action,
        actorStaffId,
        targetType: "staff",
        targetId: updated.id,
        summary: `Обновлён сотрудник «${updated.display_name}»`,
        metadata: { role: updated.role, active: updated.active },
      });
      return { row: updated, locationIds: await fetchLocationIds(client, updated.id) };
    });

    res.json(mapStaffAccount(row, locationIds));
  }),
);

interface StaffLocationsBody {
  locationIds?: unknown;
  primaryLocationId?: unknown;
}

adminStaffRouter.put(
  "/admin/staff/:id/locations",
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = req.body as StaffLocationsBody;
    const locationIds = readUuidArray(body.locationIds, "locationIds");
    const primaryLocationId = readNonEmptyString(body.primaryLocationId, "primaryLocationId");
    if (!locationIds.includes(primaryLocationId)) throw new AppError("VALIDATION", 422);
    const actorStaffId = req.session!.sub;

    const { row, ids } = await withRole("app_admin", { staffId: actorStaffId }, async (client) => {
      await client.query("select admin_set_staff_locations($1, $2, $3)", [
        req.params.id,
        locationIds,
        primaryLocationId,
      ]);
      const result = await client.query<StaffAccountRow>("select * from staff_profiles where id = $1", [
        req.params.id,
      ]);
      const updated = result.rows[0];
      if (!updated) throw new AppError("STAFF_NOT_FOUND", 404);
      await writeAuditLog(client, {
        action: "staff.updated",
        actorStaffId,
        targetType: "staff",
        targetId: updated.id,
        summary: `Изменены точки сотрудника «${updated.display_name}»`,
      });
      return { row: updated, ids: await fetchLocationIds(client, updated.id) };
    });

    res.json(mapStaffAccount(row, ids));
  }),
);

interface ResetPinBody {
  pin?: unknown;
}

adminStaffRouter.post(
  "/admin/staff/:id/reset-pin",
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = req.body as ResetPinBody;
    const pin = readPin(body.pin);
    const actorStaffId = req.session!.sub;

    await withRole("app_admin", { staffId: actorStaffId }, async (client) => {
      await client.query("select admin_reset_staff_pin($1, $2)", [req.params.id, pin]);
      await writeAuditLog(client, {
        action: "staff.updated",
        actorStaffId,
        targetType: "staff",
        targetId: String(req.params.id),
        summary: "Сброшен PIN-код сотрудника",
      });
    });

    res.json({ ok: true });
  }),
);
