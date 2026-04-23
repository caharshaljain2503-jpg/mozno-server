import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  getSeoSettings,
  updateSeoSettings,
  getRobotsTxt,
  getSitemap,
  getSchemaJson,
  previewSeo,
} from "../controllers/seo.controller.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../public/uploads/seo");
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `seo-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|svg|ico|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const seoRouter = express.Router();

// Public routes (no auth required)
seoRouter.get("/robots.txt", getRobotsTxt);
seoRouter.get("/sitemap.xml", getSitemap);
seoRouter.get("/schema.json", getSchemaJson);

// Protected routes (admin only)
seoRouter.use(authMiddleware);

seoRouter.get("/", getSeoSettings);
seoRouter.put(
  "/",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
    { name: "ogImage", maxCount: 1 },
    { name: "twitterImage", maxCount: 1 },
  ]),
  updateSeoSettings
);
seoRouter.get("/preview", previewSeo);

export default seoRouter;