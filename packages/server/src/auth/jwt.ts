import jwt from "jsonwebtoken";
import { env } from "../env";

export interface CustomerClaims {
  kind: "customer";
  sub: string;
}

export interface StaffClaims {
  kind: "staff";
  sub: string;
  role: string;
  locationId: string;
}

export type SessionClaims = CustomerClaims | StaffClaims;

const TOKEN_TTL = "12h";

export function signSession(claims: SessionClaims): string {
  return jwt.sign(claims, env.jwtSecret, { expiresIn: TOKEN_TTL });
}

export function verifySession(token: string): SessionClaims | null {
  try {
    return jwt.verify(token, env.jwtSecret) as SessionClaims;
  } catch {
    return null;
  }
}
