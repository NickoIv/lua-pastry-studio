import { Router } from "express";
import { queryAs } from "../db";
import { asyncHandler } from "../asyncHandler";
import { sessionRole } from "../auth/sessionRole";
import { mapLocation, type LocationRow } from "../mappers";

export const locationsRouter = Router();

locationsRouter.get(
  "/locations",
  asyncHandler(async (req, res) => {
    const { role, guards } = sessionRole(req.session);
    const rows = await queryAs<LocationRow>(
      role,
      guards,
      "select * from locations order by name",
    );
    res.json(rows.map(mapLocation));
  }),
);
