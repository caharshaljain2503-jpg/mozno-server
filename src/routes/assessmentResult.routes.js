import { Router } from "express";
import { submitAssessmentResult } from "../controllers/assessmentResult.controller.js";

const router = Router();

router.post("/", submitAssessmentResult);

export default router;

