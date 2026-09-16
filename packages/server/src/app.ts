import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { API_ERROR_MESSAGES_RU } from "@lua/types";
import { attachSession } from "./auth/middleware";
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

export function createApp() {
  const app = express();
  app.use(cors());
  // Served as-is, no query/auth on the files themselves — filenames are
  // server-generated random UUIDs (packages/server/src/media.ts), so
  // there's nothing sensitive to gate a directory listing isn't even
  // enabled for. Mounted before express.json() so it never touches the
  // JSON body parser.
  app.use("/media", express.static(UPLOAD_ROOT));
  app.use(express.json());
  app.use(attachSession);

  app.get("/health", (_req, res) => res.json({ ok: true }));

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

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const appError = mapPostgresError(err);
    res
      .status(appError.status)
      .json({
        error: { code: appError.code, message: API_ERROR_MESSAGES_RU[appError.code] },
      });
  };
  app.use(errorHandler);

  return app;
}
