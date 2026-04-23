// routes/analyticsRoutes.js
import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  getDailyVisits,
  getRecentVisits,
  getDashboardStats,
  updateDuration,
  trackVisit,
} from "../controllers/analytics.controller.js";

const router = express.Router();

// Public routes (for tracking)
router.post("/track-visit", trackVisit);
router.post("/update-duration", updateDuration);

// authMiddlewareed routes (for admin dashboard)
router.get("/stats", authMiddleware, getDashboardStats);
router.get("/recent", authMiddleware, getRecentVisits);
router.get("/daily", authMiddleware, getDailyVisits);

export default router;