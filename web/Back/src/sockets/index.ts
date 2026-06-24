import http from "http";
import { Server, Socket } from "socket.io";

let io: Server | null = null;

export const onlineUsers = new Map<string, number>();

export const initSockets = (server: http.Server) => {
  if (io) {
    return io;
  }

  io = new Server(server, {
    cors: {
      origin: "*", // adjust to your Angular origin in production
      credentials: true,
    },
  });

  const dashboardNsp = io.of("/dashboard");

  dashboardNsp.on("connection", (socket: Socket) => {
    socket.on("joinCamera", (cameraId: string) => {
      if (cameraId) {
        console.log(`Camera ${cameraId} joined`);
        socket.join(`camera:${cameraId}`);
      }
    });

    socket.on("leaveCamera", (cameraId: string) => {
      if (cameraId) {
        console.log(`Camera ${cameraId} left`);
        socket.leave(`camera:${cameraId}`);
      }
    });

    socket.on("user:connected", async (userId: string) => {
      if (!userId) return;
      socket.data.userId = userId;
      const count = onlineUsers.get(userId) || 0;
      onlineUsers.set(userId, count + 1);

      try {
        const User = require("../models/user.model").default;
        const now = new Date();
        await User.findByIdAndUpdate(userId, { lastActiveAt: now });
        dashboardNsp.emit("user:active", { userId, timestamp: now, isOnline: true });
      } catch (err) {
        console.error("Error updating user lastActiveAt:", err);
      }
    });

    socket.on("disconnect", async () => {
      const userId = socket.data.userId;
      if (userId) {
        const count = onlineUsers.get(userId) || 0;
        if (count <= 1) {
          onlineUsers.delete(userId);
          try {
            const User = require("../models/user.model").default;
            const now = new Date();
            await User.findByIdAndUpdate(userId, { lastActiveAt: now });
            dashboardNsp.emit("user:active", { userId, timestamp: now, isOnline: false });
          } catch (err) {}
        } else {
          onlineUsers.set(userId, count - 1);
        }
      }
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.io has not been initialized. Call initSockets(server) first.");
  }
  return io;
};

export const getDashboardNamespace = () => {
  return getIO().of("/dashboard");
};

