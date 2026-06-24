import http from "http";
import app from "./app";
import { connectDB } from "./configs/db";
import { ENV } from "./configs/env";
import { seedSuperAdmin } from "./idk/seedSuperAdmin";
import { initSockets } from "./sockets";
import { markStaleCamerasOffline } from "./services/camera.service";

const server = http.createServer(app);

initSockets(server);

let isCameraWatcherRunning = false;

(async () => {
  await connectDB();
  await seedSuperAdmin();

  const thresholdMs = ENV.CAMERA_HEARTBEAT_TIMEOUT_MS;
  const intervalMs = ENV.CAMERA_HEARTBEAT_WATCHER_INTERVAL_MS;

  setInterval(async () => {
    if (isCameraWatcherRunning) {
      return;
    }
    isCameraWatcherRunning = true;
    try {
      const updatedCount = await markStaleCamerasOffline(thresholdMs);
      if (updatedCount > 0) {
        console.log(
          `[CameraWatcher] Marked ${updatedCount} camera(s) as OFFLINE (threshold ${thresholdMs}ms)`
        );
      }
    } catch (err) {
      console.error("[CameraWatcher] Error while marking stale cameras offline:", err);
    } finally {
      isCameraWatcherRunning = false;
    }
  }, intervalMs);

  server.listen(ENV.PORT, () => {
    console.log(`Server running on port ${ENV.PORT}`);
  });
})();
