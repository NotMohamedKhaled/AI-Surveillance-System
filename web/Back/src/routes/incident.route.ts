import express from "express";
import { authenticate } from "../middlewares/authentication.middleware";
import { authorize } from "../middlewares/authorization.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createIncidentSchema,getIncidentByAlertIdSchema,getIncidentByCameraIdSchema,getIncidentByIdSchema,updateIncidentSchema } from "../validations/incident.validations";
import { createIncident,getAllIncidents,getIncidentById,getIncidentsByAlert,getIncidentsByCamera,updateIncident,deleteIncident,restoreIncident } from "../controllers/incident.controller";
import { upload } from "../middlewares/upload.middleware";
const router = express.Router()


router.post("/", authenticate, authorize(["security", "admin", "super_admin"]), validate(createIncidentSchema), createIncident); //security decides to handle an alert.
router.get("/", authenticate, authorize(["security", "admin", "super_admin"]), getAllIncidents);
router.get("/:id", authenticate, authorize(["security", "admin", "super_admin"]), validate(getIncidentByIdSchema), getIncidentById);
router.get("/camera/:cameraId", authenticate, authorize(["security", "admin", "super_admin"]), validate(getIncidentByCameraIdSchema), getIncidentsByCamera);
router.get("/alert/:alertId", authenticate, authorize(["security", "admin", "super_admin"]), validate(getIncidentByAlertIdSchema), getIncidentsByAlert);
router.patch("/:id", authenticate, authorize(["security", "admin", "super_admin"]), validate(updateIncidentSchema), updateIncident);
router.delete("/:id", authenticate, authorize(["super_admin", "admin"]), validate(getIncidentByIdSchema), deleteIncident);
router.patch("/:id/restore", authenticate, authorize(["super_admin", "admin"]), validate(getIncidentByIdSchema), restoreIncident);

export default router;