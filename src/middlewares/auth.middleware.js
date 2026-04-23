import jwt from "jsonwebtoken";
import Admin from "../models/admin.model.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    // Verify JWT
    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    // Fetch admin by ID
    const admin = await Admin.findById(decoded.id);
    if (!admin) return res.status(401).json({ message: "Admin not found" });

    // Attach user info to request
    req.user = { id: admin._id, email: admin.email, role: admin.role };
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};