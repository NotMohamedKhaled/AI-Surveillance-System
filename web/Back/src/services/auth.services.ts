import User from "../models/user.model";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { ENV } from "../configs/env";
import {UserRole} from '../models/user.model'

export interface IUserPayload{
    id: string;
    role: UserRole;
}

export const loginService = async (email: string, password: string) => {
    const lower = String(email || "").trim().toLowerCase();
    const user = await User.findOne({
      isDeleted: false,
      $expr: { $eq: [{ $toLower: "$email" }, lower] },
    });
    if (!user) {
        throw new Error("Invalid email or password")
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error("Invalid email or password");
    }

      const token = jwt.sign(
    {
      id: user._id.toString(), //id: user._id.toString,

      role: user.role,
    },
    ENV.JWT_SECRET as string,
    { expiresIn: "1d"  }
  );

  return{
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}
