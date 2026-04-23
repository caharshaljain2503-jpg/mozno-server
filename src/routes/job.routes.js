import express from "express";
import {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  deleteJob,
  changeJobStatus,
  getJobStats,
} from "../controllers/job.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
const jobRouter = express.Router();

// Public routes
jobRouter.get("/", getAllJobs);
jobRouter.get("/stats", getJobStats);
jobRouter.get("/:id", getJobById);

//private
jobRouter.post("/", authMiddleware, createJob);
jobRouter.put("/:id", authMiddleware, updateJob);
jobRouter.delete("/:id", authMiddleware, deleteJob);
jobRouter.patch("/:id/status", authMiddleware, changeJobStatus);

export default jobRouter;
