import { Request, Response } from "express";
import prisma from "../../../config/prisma";

class User {
  async registerUser(req: Request, res: Response): Promise<void> {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        message: "Please provide all required data",
      });
      return;
    }
    const emailExist = await prisma.user.findUnique(email);
    if (emailExist) {
      res.status(400).json({
        message: "This email already ecist, please use unique email",
      });
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
    res.status(201).json({
      message: "User created successfully",
      data: newUser,
    });
  }
}

export default new User();
