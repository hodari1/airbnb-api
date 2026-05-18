import express, { Request, Response, NextFunction } from "express";
import compression from "compression";
import morgan from "morgan";
import { setupSwagger } from "./config/swagger";
import { generalLimiter, strictLimiter } from "./middlewares/rateLimiter";
import { errorHandler } from "./middlewares/errorHandler";
import v1Router from "./routes/v1/index";

const app = express();
const PORT = Number(process.env["PORT"]) || 3000;

// Compression
app.use(compression());

// Logging
app.use(morgan(process.env["NODE_ENV"] === "production" ? "combined" : "dev"));

// Body parsing
app.use(express.json());

// Swagger
setupSwagger(app);

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

// ✅ Deprecation middleware — warns clients hitting unversioned /api/* routes
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  if (!req.path.startsWith("/v1")) {
    res.set("Deprecation", "true");
    res.set("Sunset", "2025-12-31");
    res.set(
      "Link",
      `<${process.env["API_URL"] || "http://localhost:3000"}/api/v1${req.path}>; rel="successor-version"`
    );
    console.warn(`[DEPRECATED] ${req.method} /api${req.path} — use /api/v1${req.path}`);
  }
  next();
});

// Rate limiting
app.use(generalLimiter);
app.use("/api/v1/auth/register", strictLimiter);
app.use("/api/v1/auth/login", strictLimiter);
app.use("/api/v1/bookings", strictLimiter);
app.use("/api/v1/listings", strictLimiter);
app.use("/api/v1/reviews", strictLimiter);

// Routes
app.use("/api/v1", v1Router);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});