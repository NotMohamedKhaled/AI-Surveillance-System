import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken'
import { IUserPayload } from '../services/auth.services';
import { ENV } from "../configs/env";


export const authenticate = (req:Request, res:Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET!) as IUserPayload;
    req.user = decoded;
   
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};