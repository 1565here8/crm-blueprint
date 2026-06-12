import type { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      session?: import("../auth/jwt").SessionClaims;
      requestId?: string;
    }
  }
}

export type { Request };
