import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { API_ERROR_MESSAGES_RU } from "@lua/types";
import { attachSession } from "./auth/middleware";
import { buildCorsOptions } from "./corsPolicy";
import { pool } from "./db";
import { env } from "./env";
import { mapPostgresError } from "./errors";
import { UPLOAD_ROOT } from "./media";
import { authRouter } from "./routes/auth";
import { menuRouter } from "./routes/menu";
import { customerRouter } from "./routes/customer";
import { loyaltyRouter } from "./routes/loyalty";
import { rewardsRouter } from "./routes/rewards";
import { ordersRouter } from "./routes/orders";
import { qrRouter } from "./routes/qrRoutes";
import { redemptionsRouter } from "./routes/redemptions";
import { staffRouter } from "./routes/staff";
import { adminRouter } from "./routes/admin";
import { adminCatalogRouter } from "./routes/adminCatalog";
import { adminCollectionsRouter } from "./routes/adminCollections";
import { adminStaffRouter } from "./routes/adminStaff";
import { adminCustomersRouter } from "./routes/adminCustomers";
import { adminAuditRouter } from "./routes/adminAudit";
import { mediaRouter } from "./routes/media";
import { locationsRouter } from "./routes/locations";
import { pushRouter } from "./routes/push";

const SERVER_VERSION = "0.1.0"; // keep in sync with packages/server/package.json

export function createApp() {
  const app = express();
  app.use(cors(buildCorsOptions(env.corsOrigin)));
  // Served as-is, no query/auth on the files themselves — filenames are
  // server-generated random UUIDs (packages/server/src/media.ts), so
  // there's nothing sensitive to gate a directory listing isn't even
  // enabled for. Mounted before express.json() so it never touches the
  // JSON body parser.
  app.use("/media", express.static(UPLOAD_ROOT));
  app.use(express.json());
  app.use(attachSession);

  // Deliberately minimal — no DB credentials, no schema details, no
  // stack traces. `demo:start` (see scripts/demo/) polls this to know
  // when the backend is actually ready, not just that the process
  // started, and a human can `curl` it as a first troubleshooting step.
  app.get("/health", async (_req, res) => {
    try {
      await pool.query("select 1");
      res.json({ ok: true, db: "connected", version: SERVER_VERSION });
    } catch {
      res.status(503).json({ ok: false, db: "unreachable", version: SERVER_VERSION });
    }
  });

  app.use("/api", authRouter);
  app.use("/api", menuRouter);
  app.use("/api", customerRouter);
  app.use("/api", loyaltyRouter);
  app.use("/api", rewardsRouter);
  app.use("/api", ordersRouter);
  app.use("/api", qrRouter);
  app.use("/api", redemptionsRouter);
  app.use("/api", staffRouter);
  app.use("/api", adminRouter);
  app.use("/api", adminCatalogRouter);
  app.use("/api", adminCollectionsRouter);
  app.use("/api", adminStaffRouter);
  app.use("/api", adminCustomersRouter);
  app.use("/api", adminAuditRouter);
  app.use("/api", mediaRouter);
  app.use("/api", locationsRouter);
  app.use("/api", pushRouter);

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const appError = mapPostgresError(err);
    res
      .status(appError.status)
      .json({
        error: { code: appError.code, message: appError.detail ?? API_ERROR_MESSAGES_RU[appError.code] },
      });
  };
  app.use(errorHandler);

  return app;
}
