import { AppError } from "../errors";
import type { SessionRole, SessionGuards } from "../db";
import type { CustomerClaims, StaffClaims } from "./jwt";

export function sessionRole(session: CustomerClaims | StaffClaims | undefined): {
  role: SessionRole;
  guards: SessionGuards;
} {
  if (!session) throw new AppError("UNAUTHENTICATED", 401);
  if (session.kind === "customer") {
    return { role: "app_customer", guards: { customerId: session.sub } };
  }
  const role: SessionRole =
    session.role === "ADMIN" || session.role === "OWNER" ? "app_admin" : "app_staff";
  return { role, guards: { staffId: session.sub } };
}
