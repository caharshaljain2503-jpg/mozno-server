import express from "express";
import {
  getAllFaqsAdmin,
  createFaq,
  updateFaq,
  deleteFaq,
  toggleFaqStatus,
} from "../controllers/faq.controller.js";

const router = express.Router();

// Admin routes (mounted under /api/admin/faqs with authMiddleware)
router.get("/", getAllFaqsAdmin);
router.post("/", createFaq);
router.put("/:id", updateFaq);
router.delete("/:id", deleteFaq);
router.patch("/:id/toggle-status", toggleFaqStatus);

export default router;

