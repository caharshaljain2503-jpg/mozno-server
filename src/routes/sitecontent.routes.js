import { Router } from "express";
import {
  getSiteContentAdmin,
  getDefaultSocialPosts,
  updateSiteContentAdmin,
} from "../controllers/sitecontent.controller.js";

const router = Router();

router.get("/social-defaults", getDefaultSocialPosts);
router.get("/", getSiteContentAdmin);
router.put("/", updateSiteContentAdmin);

export default router;

