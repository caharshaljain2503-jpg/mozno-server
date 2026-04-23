import express from "express";
import {
  getAllApplications,
  getApplicationById,
  changeApplicationStatus,
  addInternalNote,
  deleteApplication,
  bulkDeleteApplications,
  downloadResume,
  getApplicationStats,
  exportApplicationsCSV,
  applyJob,
} from "../controllers/application.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
const appRouter = express.Router();


appRouter.post("/apply", applyJob);
appRouter.get("/stats/overview", authMiddleware, getApplicationStats);

appRouter.get("/export/csv", authMiddleware, exportApplicationsCSV);

appRouter.delete("/bulk/delete", authMiddleware, bulkDeleteApplications);

appRouter.get("/", authMiddleware, getAllApplications);
appRouter.get("/:id", authMiddleware, getApplicationById);
appRouter.patch("/:id/status", authMiddleware, changeApplicationStatus);
appRouter.post("/:id/notes", authMiddleware, addInternalNote);
appRouter.delete("/:id", authMiddleware, deleteApplication);

appRouter.get("/:id/resume", authMiddleware, downloadResume);

export default appRouter;
