// authenticateToken.ts

import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";
import { verifyAccessToken } from "../utils/verifyAccessToken";

interface VerifyAccessTokenResult {
  success: boolean;
  error?: string;
}

async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader: string | undefined = req.headers.authorization;
  const token: string | undefined = authHeader && authHeader.split(" ")[1];

  if (!token) {
    logger.error("No token provided");
    res.sendStatus(401);
    return;
  }

  const result: VerifyAccessTokenResult = await verifyAccessToken(token);

  if (!result.success) {
    logger.error(`Invalid token: ${result.error}`);
    res.status(403).json({ error: result.error });
    return;
  }

  next();
}

export { authenticateToken };
