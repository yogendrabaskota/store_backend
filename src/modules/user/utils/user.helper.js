"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Access TOken Helper Function
const generateAccessToken = (userId, role) => {
    if (!userId || !role) {
        throw new Error("Missing userId or role");
    }
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not set in environment");
    }
    const JWT_SECRET = process.env.JWT_SECRET;
    const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m";
    return jsonwebtoken_1.default.sign({ userId, role }, JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
    });
};
exports.generateAccessToken = generateAccessToken;
// Refresh TOken Helper Function
const generateRefreshToken = (userId, role) => {
    if (!userId || !role) {
        throw new Error("Missing userId or role");
    }
    if (!process.env.JWT_REFRESH_TOKEN) {
        throw new Error("JWT_REFRESH_TOKEN is not set in environment");
    }
    const JWT_REFRESH_TOKEN = process.env.JWT_REFRESH_TOKEN;
    const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";
    return jsonwebtoken_1.default.sign({ userId, role }, JWT_REFRESH_TOKEN, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
    });
};
exports.generateRefreshToken = generateRefreshToken;
//# sourceMappingURL=user.helper.js.map