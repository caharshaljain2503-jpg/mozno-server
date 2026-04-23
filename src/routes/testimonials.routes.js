// routes/testimonial.routes.js
import express from "express";
import {
  getAllTestimonials,
  getTestimonialById,
  getPublishedTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  toggleStatus,
  toggleFeatured,
  toggleApproval,
  bulkUpdateStatus,
  bulkDelete,
  updateOrder,
} from "../controllers/testimonial.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public routes
router.get("/public", getPublishedTestimonials);

// Admin routes (protected)
router.get("/", authMiddleware, getAllTestimonials);
router.get("/:id", authMiddleware, getTestimonialById);
router.post("/", authMiddleware, createTestimonial);
router.put("/:id", authMiddleware, updateTestimonial);
router.delete("/:id", authMiddleware, deleteTestimonial);

// Toggle routes
router.patch("/:id/toggle-status", authMiddleware, toggleStatus);
router.patch("/:id/toggle-featured", authMiddleware, toggleFeatured);
router.patch("/:id/toggle-approval", authMiddleware, toggleApproval);

// Bulk operations
router.post("/bulk/status", authMiddleware, bulkUpdateStatus);
router.post("/bulk/delete", authMiddleware, bulkDelete);
router.post("/bulk/order", authMiddleware, updateOrder);

export default router;
