import express from "express";
import cors from "cors";

const app = express();

// Allow the React app to call this API
app.use(cors({ origin: process.env.CLIENT_URL }));

// Read JSON request bodies (e.g. order data)
app.use(express.json());

// Health check – confirms the server is running
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Cloud Nine API is running" });
});

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