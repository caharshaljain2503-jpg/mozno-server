// routes/dashboard.routes.js
import express from "express";
import {
  getDashboardStats,
  getQuickStats,
  getAnalyticsOverview,
} from "../controllers/dashboard.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const DashRouter = express.Router();

DashRouter.get("/", authMiddleware, getDashboardStats);
DashRouter.get("/quick-stats", authMiddleware, getQuickStats);
DashRouter.get("/analytics", authMiddleware, getAnalyticsOverview);

export default DashRouter;