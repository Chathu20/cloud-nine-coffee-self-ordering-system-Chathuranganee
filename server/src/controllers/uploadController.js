import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import AppError from "../utils/AppError.js";

// Uploaded menu photos are saved in server/uploads/ and served at /api/uploads/<file>
export const UPLOAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../uploads");
export const UPLOAD_URL = "/api/uploads";

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB (the browser already shrinks photos before sending)

// Recognise the real file type from its first bytes ("magic numbers"),
// instead of trusting the file name or the type the browser claims.
const detectImageType = (buffer) => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
};

// Keep the file in memory first, so it can be checked before anything is written to disk
const receiveOneImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
}).single("image");

// Turns multer's own errors (e.g. file too large) into clear 400 messages
export const acceptImage = (req, res, next) => {
  receiveOneImage(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") return next(new AppError("Image must be 3 MB or smaller"));
    return next(new AppError("Please upload a single image file"));
  });
};

// POST /api/admin/uploads  (form field "image") → { url: "/api/uploads/<random>.jpg" }
export const uploadImage = async (req, res) => {
  if (!req.file) {
    throw new AppError("Please choose an image to upload");
  }

  const type = detectImageType(req.file.buffer);
  if (!type) {
    throw new AppError("Only JPG, PNG or WebP images are allowed");
  }

  // A random name: never use the uploaded file's own name (it could contain "../" or clash)
  const fileName = `${crypto.randomUUID()}.${type}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, fileName), req.file.buffer);

  res.status(201).json({ url: `${UPLOAD_URL}/${fileName}` });
};