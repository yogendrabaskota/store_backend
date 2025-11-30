import { Request, Response } from "express";
import prisma from "../config/prisma";
import { AuditLogData } from "../modules/auditLog/utils/auditLog.types";

export async function isUserExist(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
  });
  return !!user;
}

export function sendResponse(
  res: Response,
  statusCode: number,
  message: string,
  data: any = null
) {
  return res.status(statusCode).json({
    success: statusCode >= 200 && statusCode < 300,
    message,
    data,
  });
}

// In your user service or repository
export const getUserByEmail = async (email: string) => {
  return await prisma.user.findUnique({
    where: { email },
  });
};

export async function createAuditLog(
  userId: string,
  data: AuditLogData,
  request?: Request
): Promise<void> {
  try {
    await prisma.auditLog.create({
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
  } catch (error) {
    console.error("Audit log creation failed:", error);
  }
}
