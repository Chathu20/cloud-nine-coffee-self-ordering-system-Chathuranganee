import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import menuRoutes from "./routes/menuRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { UPLOAD_DIR, UPLOAD_URL } from "./controllers/uploadController.js";

const app = express();

// Allow the React app to call this API
app.use(cors({ origin: process.env.CLIENT_URL }));

// Read JSON request bodies (e.g. order data)
app.use(express.json());

// Health check – confirms the server and database are running
app.get("/api/health", (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.json({
    status: "ok",
    message: "Cloud Nine API is running",
    database: dbConnected ? "connected" : "disconnected",
  });
});

// API routes
app.use("/api/menu", menuRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

// Uploaded menu photos (public, read-only). "nosniff" stops browsers treating a file as anything but an image.
app.use(
  UPLOAD_URL,
  express.static(UPLOAD_DIR, {
    index: false,
    dotfiles: "deny",
    maxAge: "7d",
    setHeaders: (res) => res.set("X-Content-Type-Options", "nosniff"),
  })
);
// 404 for unknown API routes
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});



export default app;