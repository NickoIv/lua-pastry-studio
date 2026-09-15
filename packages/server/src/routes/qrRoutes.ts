import { Router } from "express";
import { withRole } from "../db";
import { asyncHandler } from "../asyncHandler";
import { requireCustomer, requireStaff } from "../auth/middleware";
import { generateRawToken, digestToken } from "../qr";
import { getQrTokenTtlSeconds } from "../loyaltyProgram";
import { AppError } from "../errors";

export const qrRouter = Router();

/** Scenario A: the guest's own rotating identity QR — see docs/QR-SECURITY.md. */
qrRouter.post(
  "/me/qr/identity",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const customerId = req.session!.sub;
    const ttlSeconds = await getQrTokenTtlSeconds("app_customer", { customerId });
    const rawToken = generateRawToken();
    const digest = digestToken(rawToken);

    const expiresAt = await withRole("app_customer", { customerId }, async (client) => {
      const result = await client.query<{ create_qr_session: { expiresAt: string } }>(
        "select create_qr_session($1, $2, $3, $4, $5) as create_qr_session",
        [digest, "IDENTITY", customerId, null, ttlSeconds],
      );
      return result.rows[0]!.create_qr_session.expiresAt;
    });

    res.json({ token: rawToken, purpose: "IDENTITY", expiresAt });
  }),
);

interface ResolveBody {
  token?: unknown;
}

/** The Staff Scan screen's only entry point into who/what a QR identifies. */
qrRouter.post(
  "/staff/qr/resolve",
  requireStaff,
  asyncHandler(async (req, res) => {
    const body = req.body as ResolveBody;
    if (typeof body.token !== "string" || !body.token)
      throw new AppError("VALIDATION", 422);

    const digest = digestToken(body.token);
    const result = await withRole(
      "app_staff",
      { staffId: req.session!.sub },
      async (client) => {
        const queryResult = await client.query<{ resolve_qr_token: unknown }>(
          "select resolve_qr_token($1) as resolve_qr_token",
          [digest],
        );
        return queryResult.rows[0]!.resolve_qr_token;
      },
    );

    res.json(result);
  }),
);
