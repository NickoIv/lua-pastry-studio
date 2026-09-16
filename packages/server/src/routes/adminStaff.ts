import { Router } from "express";
import { withRole } from "../db";
import { asyncHandler } from "../asyncHandler";
import { requireRole } from "../auth/middleware";
import { AppError } from "../errors";
import { writeAuditLog } from "../audit";
import { readAssignableStaffRole, readNonEmptyString, readPassword } from "../validation";

export const adminStaffRouter = Router();

const adminOnly = requireRole("ADMIN", "OWNER");

interface StaffAccountRow {
  id: string;
  email: string;
  display_name: string;
  role: string;
  location_id: string;
  active: boolean;
  created_at: string;
}

function mapStaffAccount(row: StaffAccountRow) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    locationId: row.location_id,
    active: row.active,
    createdAt: row.created_at,
  };
}

interface CreateStaffBody {
  email?: unknown;
  password?: unknown;
  displayName?: unknown;
  role?: unknown;
  locationId?: unknown;
}

adminStaffRouter.post(
  "/admin/staff",
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = req.body as CreateStaffBody;
    const email = readNonEmptyString(body.email, "email");
    const password = readPassword(body.password);
    const displayName = readNonEmptyString(body.displayName, "displayName");
    const role = readAssignableStaffRole(body.role);
    const locationId = readNonEmptyString(body.locationId, "locationId");
    const actorStaffId = req.session!.sub;

    const row = await withRole("app_admin", { staffId: actorStaffId }, async (client) => {
      const result = await client.query<StaffAccountRow>(
        "select * from admin_create_staff_account($1, $2, $3, $4, $5)",
        [email, password, displayName, role, locationId],
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

    res.status(201).json(mapStaffAccount(row));
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

    const row = await withRole("app_admin", { staffId: actorStaffId }, async (client) => {
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
      return updated;
    });

    res.json(mapStaffAccount(row));
  }),
);
