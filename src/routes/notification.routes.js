import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  getAllNotifications,
  getNotificationById,
  createNotification,
  createBulkNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getNotificationStats,
} from "../controllers/notification.controller.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// ============= GET ROUTES =============
router.get("/", getAllNotifications);
router.get("/stats", getNotificationStats);
router.get("/:id", getNotificationById);

// ============= CREATE ROUTES =============
router.post("/", createNotification);
router.post("/bulk", createBulkNotifications);

// ============= UPDATE ROUTES =============
router.patch("/:id/read", markAsRead);
router.patch("/read-all", markAllAsRead);

// ============= DELETE ROUTES =============
router.delete("/:id", deleteNotification);
router.delete("/", clearAllNotifications);

export default router;