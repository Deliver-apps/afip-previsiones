const { verifyAccessToken } = require("../utils/verifyAcessToken");
const { logger } = require("../config/logger");

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    logger.error("No token provided");
    return res.sendStatus(401);
  }

  const result = await verifyAccessToken(token);

  if (!result.success) {
    logger.error(`Invalid token: ${result.error}`);
    return res.status(403).json({ error: result.error });
  }

  next();
}

module.exports = {
  authenticateToken,
};
