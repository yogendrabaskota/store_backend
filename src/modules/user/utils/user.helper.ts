import jwt from "jsonwebtoken";

// Access TOken Helper Function
export const generateAccessToken = (userId: string, role: string) => {
  if (!userId || !role) {
    throw new Error("Missing userId or role");
  }
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set in environment");
  }

  const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET;
  const ACCESS_TOKEN_EXPIRY: string = process.env.ACCESS_TOKEN_EXPIRY || "15m";

  return jwt.sign({ userId, role }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  } as any);
};

// Refresh TOken Helper Function
export const generateRefreshToken = (userId: string, role: string) => {
  if (!userId || !role) {
    throw new Error("Missing userId or role");
  }
  if (!process.env.JWT_REFRESH_TOKEN) {
    throw new Error("JWT_REFRESH_TOKEN is not set in environment");
  }

  const JWT_REFRESH_TOKEN = process.env.JWT_REFRESH_TOKEN;
  const REFRESH_TOKEN_EXPIRY: string = process.env.REFRESH_TOKEN_EXPIRY || "7d";

  return jwt.sign({ userId, role }, JWT_REFRESH_TOKEN, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  } as any);
};
