// routes/career.routes.js
import express from "express";
import multer from "multer";
import {
  getAllJobs,
  getJobById,
} from "../controllers/job.controller.js";
import { applyJob } from "../controllers/application.controller.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOC, DOCX files are allowed"), false);
    }
  },
});

// Routes
router.get("/", getAllJobs);
router.get("/:jobId", getJobById);

// ✅ CRITICAL: upload.single("resume") MUST match the FormData field name
router.post("/apply", upload.single("resume"), applyJob);

export default router;
