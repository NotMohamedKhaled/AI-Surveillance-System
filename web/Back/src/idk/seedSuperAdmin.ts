import User from "../models/user.model";
import bcrypt from "bcrypt";
import { ENV } from "../configs/env";

export const seedSuperAdmin = async () => {
  const existing = await User.findOne({ role: "super_admin" });

  if (existing) {
    if (
      ENV.FORCE_RESET_SUPER_ADMIN_PASSWORD &&
      ENV.SUPER_ADMIN_PASSWORD
    ) {
      const matches = await bcrypt.compare(
        ENV.SUPER_ADMIN_PASSWORD,
        existing.password
      );
      if (!matches) {
        existing.password = ENV.SUPER_ADMIN_PASSWORD;
        await existing.save();
        console.log(
          "[Auth] Super admin password was reset from SUPER_ADMIN_PASSWORD. Set FORCE_RESET_SUPER_ADMIN_PASSWORD=false in .env and restart."
        );
      }
    }
    console.log("[Auth] Super admin already exists — sign in with:", existing.email);
    return;
  }

  const email = String(ENV.SUPER_ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  if (!email || !ENV.SUPER_ADMIN_PASSWORD) {
    console.error(
      "[Auth] Cannot seed super admin: set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in .env"
    );
    return;
  }

  // Plain password: User model pre("save") hashes once. Do not bcrypt.hash here or login will always 401.
  await User.create({
    name: "SuperAdmin",
    email,
    phone: "01010101011",
    password: ENV.SUPER_ADMIN_PASSWORD,
    role: "super_admin",
  });

  console.log("[Auth] Super admin created — sign in with:", email);
};