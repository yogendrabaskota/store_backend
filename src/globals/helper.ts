import { Response } from "express";
import prisma from "../config/prisma";

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
