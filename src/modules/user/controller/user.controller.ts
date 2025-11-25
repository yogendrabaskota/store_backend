import { Request, Response } from "express";
import prisma from "../../../config/prisma";
import {
  getUserByEmail,
  isUserExist,
  sendResponse,
} from "../../../globals/helper";
import bcrypt from "bcrypt";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/user.helper";
import { AuthRequest } from "../../../middleware/auth.middleware";
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

  async loginUser(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      // Check if user exists and fetch user data
      const userExists = await isUserExist(email);
      if (!userExists) {
        return sendResponse(res, 404, "No user found with this email");
      }

      // Fetch the actual user from database
      const user = await getUserByEmail(email);
      if (!user) {
        return sendResponse(res, 404, "No user found with this email");
      }

      //Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return sendResponse(res, 400, "Incorrect password");
      }

      // Generating tokens
      const accessToken = generateAccessToken(user.id, user.role);
      const refreshToken = generateRefreshToken(user.id, user.role);

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return sendResponse(res, 200, "Login successful", {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        accessToken,
        refreshToken,
      });
    } catch (err) {
      console.error("Login error:", err);
      return sendResponse(res, 500, "Something went wrong");
    }
  }
}

export default new User();
