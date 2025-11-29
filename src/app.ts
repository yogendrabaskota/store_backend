import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import userRoute from "./modules/user/route/user.route";
import categoryRoute from "./modules/category/route/category.route";
import productRoute from "./modules/product/route/product.route";

// Load environment variables
dotenv.config();

const app: Application = express();

// ---------------------------
// Middlewares
// ---------------------------

// Security HTTP headers
app.use(helmet());

// Prevent HTTP parameter pollution
app.use(hpp());

// Enable CORS (adjust origin in production)
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Logging
app.use(morgan("combined"));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  message: "Too many requests from this IP, please try again later",
});
app.use(limiter);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------
// Routes
// ---------------------------
app.use("/api/users", userRoute);
app.use("/api/v1", categoryRoute);
app.use("/api/v1", productRoute);

// ---------------------------
// Default error handler
// ---------------------------
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong" });
});

export default app;
