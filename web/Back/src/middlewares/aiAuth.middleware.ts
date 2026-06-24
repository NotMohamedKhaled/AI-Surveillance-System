import { Request, Response, NextFunction } from "express";
import { ENV } from "../configs/env";

export const aiAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.header("x-api-key");

  if (!apiKey || apiKey !== ENV.AI_API_KEY) {
    return res.status(403).json({ message: "Forbidden: Invalid API Key" });
  }

  next();
};
