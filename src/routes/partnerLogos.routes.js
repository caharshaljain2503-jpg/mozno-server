import express from "express";
import upload from "../middlewares/multer.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  getPublicPartnerLogos,
  getAllPartnerLogosAdmin,
  createPartnerLogo,
  updatePartnerLogo,
  deletePartnerLogo,
  reorderPartnerLogos,
} from "../controllers/partnerLogo.controller.js";

const router = express.Router();

router.get("/public", getPublicPartnerLogos);

router.get("/", authMiddleware, getAllPartnerLogosAdmin);
router.post("/", authMiddleware, upload.single("image"), createPartnerLogo);
router.patch("/reorder", authMiddleware, reorderPartnerLogos);
router.put("/:id", authMiddleware, upload.single("image"), updatePartnerLogo);
router.delete("/:id", authMiddleware, deletePartnerLogo);

export default router;
