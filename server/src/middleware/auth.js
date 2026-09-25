import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Allows the request only if a valid token is sent
export const protect = async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || "").split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Please log in to continue" });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Session expired or invalid. Please log in again." });
  }

  const user = await User.findById(payload.id);
  if (!user) {
    return res.status(401).json({ message: "This account no longer exists" });
  }

  req.user = user;
  next();
};

// Allows the request only for the listed roles, e.g. authorize("ADMIN")
export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "You do not have permission to do this" });
  }
  next();
};