import multer, { StorageEngine } from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import { FileFilterCallback } from "multer";


const uploadsDir = path.join(__dirname, "uploads"); // adjust path to match your project

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage: StorageEngine = multer.diskStorage({
  destination: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ): void => {
    cb(null, "uploads");
  },

  filename: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ): void => {
    cb(null, Date.now().toString() + "_" + file.originalname);
  },
});


// File filter
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const ext = path.extname(file.originalname).toLowerCase();

  const allowed: string[] = [".jpg", ".png", ".jpeg"];

  if (!allowed.includes(ext)) {
    return cb(new Error("only images are allowed (png,jpg,jpeg)"));
  }

  cb(null, true);
};


const MB = 1024 * 1024;



export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * MB,
  },
});