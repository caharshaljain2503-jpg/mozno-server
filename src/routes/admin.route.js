import { Router } from "express";
import {
  adminLogin,
  createAdmin,
  deleteAdmin,
  getAdmin,
  getAdminDetails,
  getAdminStats,
  getAllAdmins,
  resetAdminPassword,
  sendOtp,
  toggleAdminStatus,
  updateAdmin,
  verifyOtp,
} from "../controllers/admin.controller.js";
import rateLimit from "express-rate-limit";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.js";
import {
  addBlog,
  changeCommentStatus,
  deleteCommentById,
  EditBlogs,
  getAllBlogAdmin,
  getAllComments,
  getBlogById,
  getBlogBySlug,
  getBlogBySlugAdmin,
  handleDeleteBlogs,
  toggleBlogVisibility,
} from "../controllers/blog.controller.js";
import testimonialRoutes from "../routes/testimonials.routes.js";
import faqRoutes from "./faq.routes.js";
import {
  getAllLeads,
  getLeadsById,
  setLeadStatus,
} from "../controllers/lead.controller.js";
import router from "./notification.routes.js";
import seoRouter from "./seo.routes.js";
import analyticsrouter from "./analyticsRoutes.js";
import jobRouter from "./job.routes.js";
import appRouter from "./application.routes.js";
import DashRouter from "./dashboard.route.js";
import siteContentRouter from "./sitecontent.routes.js";
import partnerLogosRouter from "../routes/partnerLogos.routes.js";
import settingsRouter from "./settings.routes.js";

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
});

const adminRouter = Router();

// ==================== PUBLIC ROUTES ====================
adminRouter.post("/sign-in", authLimiter, adminLogin);
adminRouter.post("/send-otp", authLimiter, sendOtp);
adminRouter.post("/verify-otp", authLimiter, verifyOtp);

// ==================== PROTECTED ROUTES ====================
// All routes below require authentication

// ------ ADMIN USER MANAGEMENT (specific routes FIRST) ------
adminRouter.get("/profile", authMiddleware, getAdminDetails);
adminRouter.get("/stats", authMiddleware, getAdminStats);
adminRouter.get("/users", authMiddleware, getAllAdmins);  // Changed from "/" to "/users"
adminRouter.post("/users", authMiddleware, createAdmin);   // Changed from "/" to "/users"
adminRouter.get("/users/:id", authMiddleware, getAdmin);
adminRouter.put("/users/:id", authMiddleware, updateAdmin);
adminRouter.delete("/users/:id", authMiddleware, deleteAdmin);
adminRouter.patch("/users/:id/status", authMiddleware, toggleAdminStatus);
adminRouter.post("/users/:id/reset-password", authMiddleware, resetAdminPassword);

// ------ BLOGS ------
adminRouter.get("/blogs", authMiddleware, getAllBlogAdmin);
adminRouter.get("/blogs/slug/:slug", authMiddleware, getBlogBySlugAdmin);
adminRouter.get("/blogs/:blogId", authMiddleware, getBlogById);
adminRouter.post("/blogs", authMiddleware, upload.single("image"), addBlog); 
adminRouter.patch("/blogs/:blogId", authMiddleware, upload.single("image"), EditBlogs);
adminRouter.delete("/blogs/:blogId", authMiddleware, handleDeleteBlogs);
adminRouter.patch("/blogs/:blogId/visibility", authMiddleware, toggleBlogVisibility);

// ------ COMMENTS ------
adminRouter.get("/comments", authMiddleware, getAllComments);
adminRouter.patch("/comments/:commentId/status", authMiddleware, changeCommentStatus);
adminRouter.delete("/comments/:commentId", authMiddleware, deleteCommentById);

// ------ CONTACTS/LEADS ------
adminRouter.get("/contact", authMiddleware, getAllLeads);
adminRouter.get("/contact/:id", authMiddleware, getLeadsById);
adminRouter.patch("/contact/:id/status", authMiddleware, setLeadStatus);

// ------ SUB-ROUTERS ------
adminRouter.use("/testimonials", authMiddleware, testimonialRoutes);
adminRouter.use("/faqs", authMiddleware, faqRoutes);
adminRouter.use("/notifications", authMiddleware, router);
adminRouter.use("/seo", authMiddleware, seoRouter);
adminRouter.use("/analytics", authMiddleware, analyticsrouter);
adminRouter.use("/jobs", authMiddleware, jobRouter);
adminRouter.use("/applications", authMiddleware, appRouter);
adminRouter.use("/dashboard", authMiddleware, DashRouter);
adminRouter.use("/site-content", authMiddleware, siteContentRouter);
adminRouter.use("/partner-logos", authMiddleware, partnerLogosRouter);
adminRouter.use("/settings", authMiddleware, settingsRouter);

export default adminRouter;