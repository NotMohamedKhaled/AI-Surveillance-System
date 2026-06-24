import express from "express";
import { login } from "../controllers/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import { loginSchema } from "../validations/auth.validation";
import { loginLimiter } from "../middlewares/rateLimit.middleware";

const router = express.Router();

router.post("/login", loginLimiter,validate(loginSchema), login);

export default router;