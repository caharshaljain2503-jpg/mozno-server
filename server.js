import express from "express";
import { config } from "dotenv";
import db from "./src/configs/db.js";
import adminRouter from "./src/routes/admin.route.js";
import cors from "cors";
import DashRouter from "./src/routes/dashboard.route.js";
import blogRouter from "./src/routes/blog.route.js";
import careerRouter from "./src/routes/career.route.js";
import contactRoute from "./src/routes/contact.routes.js";
import router from "./src/routes/analyticsRoutes.js";
import testimonialRouter from "./src/routes/testimonials.routes.js";
import seoRouter from "./src/routes/seo.routes.js";
import marketRouter from "./src/routes/market.routes.js";
import settingsRouter from "./src/routes/settings.routes.js";
import partnerLogosRouter from "./src/routes/partnerLogos.routes.js";
import { refreshMarketCache } from "./src/controllers/market.controller.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redis from "./src/configs/redis.js";
import cron from "node-cron";
import mongoose from "mongoose";


config();
if (!process.env.SECRET_KEY) {
  process.env.SECRET_KEY = "dev-secret-key";
}
db();

const app = express();
app.set("trust proxy", 1);

if (process.env.ENABLE_EMAIL_WORKER === "true" && !process.env.VERCEL) {
  import("./src/workers/mailService.js").catch((error) => {
    console.error("Failed to start email worker:", error.message);
  });
}

const allowedOrigins = [
  "http://localhost:5173", // Vite default
  "http://localhost:5174", // Vite alternate
  "http://localhost:3000", // If you ever run on 3000
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "https://2ae9-2409-40c4-21d4-7cf3-6598-76a5-69da-8b70.ngrok-free.app",
  "https://monzo-wealth-admin.vercel.app",
  "https://mozno-wealth-admin.vercel.app",
  "https://mozno-wealth-main.vercel.app",
  "https://mozno-wealth-admin-main.vercel.app",
  "https://mozno-wealth.vercel.app",
  "https://mozno.in",
  "https://www.mozno.in",
  "https://admin.mozno.in",
];

const isAllowedVercelPreviewOrigin = (origin) => {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "https:") return false;
    if (!hostname.endsWith(".vercel.app")) return false;
    return (
      hostname.startsWith("mozno-wealth-main-") ||
      hostname.startsWith("mozno-wealth-admin-main-") ||
      hostname.startsWith("mozno-wealth-admin-")
    );
  } catch {
    return false;
  }
};

/** Vite often uses another port (e.g. 5174) or LAN URL — allow http dev origins */
const isDevLocalHttpOrigin = (origin) => {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "http:") return false;
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    return (
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
    );
  } catch {
    return false;
  }
};

// Default CORP/COEP block cross-port browser fetches (e.g. admin :5174 → API :6666).
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const allowDevLocal =
        process.env.NODE_ENV !== "production" && isDevLocalHttpOrigin(origin);

      if (
        allowedOrigins.includes(origin) ||
        isAllowedVercelPreviewOrigin(origin) ||
        allowDevLocal
      ) {
        callback(null, true);
      } else {
        console.log("CORS blocked origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Handle OPTIONS preflight explicitly so it always returns 200 before rate limiter
app.options("*", cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowDevLocal =
      process.env.NODE_ENV !== "production" && isDevLocalHttpOrigin(origin);
    if (
      allowedOrigins.includes(origin) ||
      isAllowedVercelPreviewOrigin(origin) ||
      allowDevLocal
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

let limiter;
try {
  if (redis && redis.status === 'ready') {
    limiter = rateLimit({
      store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
      }),
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Too many requests from this IP, please try again later.',
    });
    console.log('✅ Rate limiting with Redis enabled');
  } else {
    limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Too many requests from this IP, please try again later.',
    });
    console.log('⚠️ Rate limiting with memory store enabled (Redis not available)');
  }
} catch (error) {
  console.error('Error setting up rate limiter:', error.message);
  limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
}

// Apply rate limiter to all routes — skip OPTIONS preflight
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  return limiter(req, res, next);
});

// Body parser middlewares
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Ensure DB is available before hitting DB-backed routes.
app.use(async (req, res, next) => {
  if (req.path === "/health" || req.path === "/api/ping") {
    return next();
  }

  if (mongoose.connection.readyState === 1) {
    return next();
  }

  const connected = await db();
  if (!connected) {
    return res.status(503).json({
      success: false,
      message: "Database temporarily unavailable. Please retry shortly.",
    });
  }

  return next();
});

// Cron job to keep the server alive (only in production)
if (process.env.NODE_ENV === 'production') {
  cron.schedule("*/14 * * * *", async () => {
    try {
      console.log("⏱️ Cron running - keeping server alive");
      
      // Get the base URL from environment or construct from request
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
      
      const res = await fetch(`${baseUrl}/api/ping`);
      const text = await res.text();
      
      console.log("Ping response:", text);
    } catch (err) {
      console.error("Cron error:", err.message);
    }
  });
  console.log('⏰ Cron job scheduled for server keep-alive');
}

// Market data cron: refresh every 1 hour
cron.schedule("0 * * * *", async () => {
  try {
    await refreshMarketCache();
    console.log("📈 Market cache refreshed (hourly cron)");
  } catch (err) {
    console.error("Market cron error:", err.message);
  }
});
refreshMarketCache().catch((err) => {
  console.error("Initial market cache refresh failed:", err.message);
});

// Ping endpoint for health checks
app.get("/api/ping", (req, res) => {
  res.status(200).send("PONG");
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    redis: redis?.status || 'not connected',
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});


// Admin routes
app.use("/api/admin", adminRouter);
app.use("/api/admin/dashboard", DashRouter);

// Public routes
app.use("/api/blogs", blogRouter);
app.use("/api/career", careerRouter);
app.use("/api/contact", contactRoute);
app.use("/api/analytics", router);
app.use("/api/testimonials", testimonialRouter);
app.use("/api/seo", seoRouter);
app.use("/api/market", marketRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/partner-logos", partnerLogosRouter);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.method} ${req.url} not found` 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  
  // Handle CORS errors specifically
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS error: Origin not allowed'
    });
  }
  
  // Handle rate limit errors
  if (err.statusCode === 429) {
    return res.status(429).json({
      success: false,
      message: err.message || 'Too many requests'
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Allowed origins: ${allowedOrigins.join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  if (redis) {
    redis.quit();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  if (redis) {
    redis.quit();
  }
  process.exit(0);
});
