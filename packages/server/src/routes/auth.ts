import { Router } from "express";
import { pool } from "../db";
import { AppError } from "../errors";
import { asyncHandler } from "../asyncHandler";
import { signSession } from "../auth/jwt";
import { attachSession } from "../auth/middleware";
import { rateLimit } from "../rateLimit";

export const authRouter = Router();

const loginRateLimit = rateLimit({ name: "login", windowMs: 60_000, max: 20 });

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

function readCredentials(body: LoginBody): { email: string; password: string } {
  if (
    typeof body.email !== "string" ||
    typeof body.password !== "string" ||
    !body.email ||
    !body.password
  ) {
    throw new AppError("VALIDATION", 422);
  }
  return { email: body.email, password: body.password };
}

authRouter.post(
  "/auth/customer/login",
  loginRateLimit,
  asyncHandler(async (req, res) => {
    const { email, password } = readCredentials(req.body as LoginBody);
    const result = await pool.query<{
      id: string;
      first_name: string;
      last_name: string | null;
      phone: string;
    }>("select * from login_customer($1, $2)", [email, password]);
    const row = result.rows[0];
    if (!row) throw new AppError("INVALID_CREDENTIALS", 401);

    const token = signSession({ kind: "customer", sub: row.id });
    res.json({
      token,
      customer: {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        phone: row.phone,
      },
    });
  }),
);

authRouter.post(
  "/auth/staff/login",
  loginRateLimit,
  asyncHandler(async (req, res) => {
    const { email, password } = readCredentials(req.body as LoginBody);
    const result = await pool.query<{
      id: string;
      display_name: string;
      role: string;
      location_id: string;
      active: boolean;
    }>("select * from login_staff($1, $2)", [email, password]);
    const row = result.rows[0];
    if (!row || !row.active) throw new AppError("INVALID_CREDENTIALS", 401);

    const token = signSession({
      kind: "staff",
      sub: row.id,
      role: row.role,
      locationId: row.location_id,
    });
    res.json({
      token,
      staff: {
        id: row.id,
        displayName: row.display_name,
        role: row.role,
        locationId: row.location_id,
      },
    });
  }),
);

interface PinLoginBody {
  staffCode?: unknown;
  pin?: unknown;
}

// Separate, tighter limiter than email/password login: a 4-6 digit PIN
// has far less entropy, so brute-forcing it needs to be meaningfully
// harder per unit time, not just "the same as everything else".
const pinLoginRateLimit = rateLimit({ name: "login-pin", windowMs: 60_000, max: 8 });

authRouter.post(
  "/auth/staff/login-pin",
  pinLoginRateLimit,
  asyncHandler(async (req, res) => {
    const body = req.body as PinLoginBody;
    if (typeof body.staffCode !== "string" || typeof body.pin !== "string" || !body.staffCode || !body.pin) {
      throw new AppError("VALIDATION", 422);
    }
    const result = await pool.query<{
      id: string;
      display_name: string;
      role: string;
      location_id: string;
      active: boolean;
    }>("select * from login_staff_by_code($1, $2)", [body.staffCode, body.pin]);
    const row = result.rows[0];
    if (!row || !row.active) throw new AppError("INVALID_CREDENTIALS", 401);

    const token = signSession({
      kind: "staff",
      sub: row.id,
      role: row.role,
      locationId: row.location_id,
    });
    res.json({
      token,
      staff: {
        id: row.id,
        displayName: row.display_name,
        role: row.role,
        locationId: row.location_id,
      },
    });
  }),
);

authRouter.get(
  "/auth/me",
  attachSession,
  asyncHandler(async (req, res) => {
    if (!req.session) throw new AppError("UNAUTHENTICATED", 401);
    res.json({ session: req.session });
  }),
);
