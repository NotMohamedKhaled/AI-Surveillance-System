import { ZodObject, ZodError } from "zod";
import { Request, Response, NextFunction } from "express";

export const validate =
  (schema: ZodObject<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse and validate the request
       const parsed = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

    if (parsed.body) req.body = parsed.body;
    if (parsed.params) req.params = parsed.params as typeof req.params;
    if (parsed.query) req.query = parsed.query as typeof req.query;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
         return res.status(400).json({
          message: "Validation error",
          errors: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        });
      }

      return res.status(500).json({
        message: "Internal server error",
      });
    }
  };