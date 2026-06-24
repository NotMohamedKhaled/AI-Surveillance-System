import express from "express";
import { authenticate } from "../middlewares/authentication.middleware";
import { authorize } from "../middlewares/authorization.middleware";
import { aiAuth } from "../middlewares/aiAuth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createCameraSchema,
  getCameraByAiIdSchema,
  getCameraById,
  toggleCameraSchema,
  updateCameraByIdSchema,
} from "../validations/camera.validation";
import {
  getAllCameras,
  createCamera,
  getCameraById as getCameraByIdHandler,
  updateCameraById,
  deleteCameraById,
  restoreCameraById,
  cameraHeartBeat,
  toggleCamera,
  getCamerasForAI,
  createCameraAlert,
} from "../controllers/camera.controller";
import { upload } from "../middlewares/upload.middleware";

const router = express.Router();
//
router.get("/ai", aiAuth, getCamerasForAI); // ai calls this to get cameras, to do if cam disabled or deleted => trigger that req in ai
router.post("/ai/:cameraAiId/alerts", aiAuth, validate(getCameraByAiIdSchema),upload.single("frame"), createCameraAlert); // detection happens in ai, this req is triggered
router.post("/ai/:cameraAiId/heartbeat", aiAuth, validate(getCameraByAiIdSchema), cameraHeartBeat);

router.get("/", authenticate, authorize(["super_admin", "admin", "security"]), getAllCameras);
router.post("/", authenticate, authorize(["super_admin"]), validate(createCameraSchema), createCamera);
router.get("/:id", authenticate, authorize(["super_admin", "admin", "security"]), validate(getCameraById), getCameraByIdHandler);
router.put("/:id", authenticate, authorize(["super_admin", "admin"]), validate(updateCameraByIdSchema), updateCameraById);
router.delete("/:id", authenticate, authorize(["super_admin", "admin"]), validate(getCameraById), deleteCameraById);
router.patch("/:id/restore", authenticate, authorize(["super_admin", "admin"]), validate(getCameraById), restoreCameraById);
router.patch("/:id/toggle", authenticate, authorize(["super_admin", "admin"]), validate(toggleCameraSchema), toggleCamera);

export default router;
