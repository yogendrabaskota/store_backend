import { ZodError, ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";

interface FormattedError {
  field: string;
  message: string;
}

interface ValidationErrorResponse {
  message: string;
  errors: FormattedError[];
}

interface ServerErrorResponse {
  message: string;
  error: string;
}

export const validate =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body); // cleans and validates
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const formattedErrors: FormattedError[] = err.issues.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));

        return res.status(400).json({
          message: "Validation Error",
          errors: formattedErrors,
        } as ValidationErrorResponse);
      }

      return res.status(500).json({
        message: "Server Error",
        error: err instanceof Error ? err.message : "Unknown error",
      } as ServerErrorResponse);
    }
  };