import { Request, Response } from "express";
import prisma from "../../../config/prisma";
import { isUserExist, sendResponse } from "../../../globals/helper";

class User {
  async registerUser(req: Request, res: Response): Promise<void> {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      sendResponse(res, 400, "Please provide all required data");
      return;
    }
    const exists = await isUserExist(email);
    if (exists) {
      sendResponse(
        res,
        400,
        "This email already exist, please use unique email"
      );
      return;
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password,
        role,
      },
    });
    sendResponse(res, 201, "User Created Successfully", newUser);
  }
}

export default new User();
