import express from "express";
import { getPublicSettings, getSettings, updateSettings } from "../controllers/settings.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public endpoint used by main frontend:
// GET /api/settings/public
router.get("/public", getPublicSettings);

// Admin endpoints
router.get("/", authMiddleware, getSettings);
router.put("/", authMiddleware, updateSettings);

export default router;

