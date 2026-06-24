import express from "express";
import cors from "cors";
import AuthRouter from "./routes/auth.route";
import UserRouter from "./routes/user.route";
import CameraRouter from "./routes/camera.route";
import AlertRouter from "./routes/alert.route";
import IncidentRouter from "./routes/incident.route";
import { globalLimiter } from "./middlewares/rateLimit.middleware";

const app = express();

app.use(cors());
app.use(express.json());
app.use(globalLimiter);
app.use("/uploads", express.static("uploads"));

app.use("/dashboard/api/auth", AuthRouter);
app.use("/dashboard/api/user", UserRouter);
app.use("/dashboard/api/camera", CameraRouter);
app.use("/dashboard/api/incident", IncidentRouter);
app.use("/dashboard/api/alert", AlertRouter);

export default app;
