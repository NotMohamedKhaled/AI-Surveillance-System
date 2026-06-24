import express from "express";

import { authenticate } from "../middlewares/authentication.middleware";
import { authorize } from "../middlewares/authorization.middleware";
import { aiAuth } from "../middlewares/aiAuth.middleware";
import { validate } from "../middlewares/validate.middleware";

import {
  createAlertSchema,
  getAlertByIdSchema,
  getAllAlertsSchema,
  markAlertFalseSchema,
} from "../validations/alert.validation";

import {
  // createAlert,
  getAllAlerts,
  getAlertById,
  markAlertFalse,
  deleteAlert,
  restoreAlert,
} from "../controllers/alert.controller";

const router = express.Router();





router.get("/", authenticate, authorize(["super_admin", "admin", "security"]),  getAllAlerts);

router.get("/:id", authenticate, authorize(["super_admin", "admin", "security"]), validate(getAlertByIdSchema), getAlertById);

router.patch("/:id/status", authenticate, authorize(["super_admin", "admin"]), validate(markAlertFalseSchema), markAlertFalse);

router.delete("/:id", authenticate, authorize(["super_admin", "admin"]), validate(getAlertByIdSchema), deleteAlert);

router.patch("/:id/restore", authenticate, authorize(["super_admin", "admin"]), validate(getAlertByIdSchema), restoreAlert);

export default router;
