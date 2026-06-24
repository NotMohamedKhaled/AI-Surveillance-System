import mongoose from "mongoose";
import { ENV } from "./env";
import { migrateAlertAndIncidentSids } from "./migrateSids";

export const connectDB = async () => {
  try {
    await mongoose.connect(ENV.MONGO_URI);
    console.log("MongoDB connected");
    await migrateAlertAndIncidentSids();
  } catch (err) {
    console.error("DB connection failed", err);
    process.exit(1);
  }
};
