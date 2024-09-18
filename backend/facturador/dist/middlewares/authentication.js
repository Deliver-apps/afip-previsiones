"use strict";
// authenticateToken.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
const logger_1 = require("../config/logger");
const verifyAccessToken_1 = require("../utils/verifyAccessToken");
async function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
        logger_1.logger.error("No token provided");
        res.sendStatus(401);
        return;
    }
    const result = await (0, verifyAccessToken_1.verifyAccessToken)(token);
    if (!result.success) {
        logger_1.logger.error(`Invalid token: ${result.error}`);
        res.status(403).json({ error: result.error });
        return;
    }
    next();
}
//# sourceMappingURL=authentication.js.map