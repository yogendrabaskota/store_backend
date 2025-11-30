"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserByEmail = void 0;
exports.isUserExist = isUserExist;
exports.sendResponse = sendResponse;
exports.createAuditLog = createAuditLog;
const prisma_1 = __importDefault(require("../config/prisma"));
async function isUserExist(email) {
    const user = await prisma_1.default.user.findUnique({
        where: { email },
    });
    return !!user;
}
function sendResponse(res, statusCode, message, data = null) {
    return res.status(statusCode).json({
        success: statusCode >= 200 && statusCode < 300,
        message,
        data,
    });
}
// In your user service or repository
const getUserByEmail = async (email) => {
    return await prisma_1.default.user.findUnique({
        where: { email },
    });
};
exports.getUserByEmail = getUserByEmail;
async function createAuditLog(userId, data, request) {
    try {
        await prisma_1.default.auditLog.create({
            data: {
                userId,
                action: data.action,
                description: data.description,
                resource: data.resource ?? null,
                resourceId: data.resourceId ?? null,
                oldData: data.oldData ?? null,
                newData: data.newData ?? null,
                ipAddress: request?.ip || request?.socket?.remoteAddress || null,
                userAgent: request?.get("User-Agent") || null,
            },
        });
    }
    catch (error) {
        console.error("Audit log creation failed:", error);
    }
}
//# sourceMappingURL=helper.js.map