import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors";
import { verifySession, type CustomerClaims, type StaffClaims } from "./jwt";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: CustomerClaims | StaffClaims;
    }
  }
}

export function attachSession(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (header?.startsWith("Bearer ")) {
    const claims = verifySession(header.slice("Bearer ".length));
    if (claims) req.session = claims;
  }
  next();
}

export function requireCustomer(req: Request, _res: Response, next: NextFunction) {
  if (!req.session || req.session.kind !== "customer") {
    throw new AppError("UNAUTHENTICATED", 401);
  }
  next();
}

export function requireStaff(req: Request, _res: Response, next: NextFunction) {
  if (!req.session || req.session.kind !== "staff") {
    throw new AppError("UNAUTHENTICATED", 401);
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.session || req.session.kind !== "staff") {
      throw new AppError("UNAUTHENTICATED", 401);
    }
    if (!roles.includes(req.session.role)) {
      throw new AppError("FORBIDDEN", 403);
    }
    next();
  };
}
