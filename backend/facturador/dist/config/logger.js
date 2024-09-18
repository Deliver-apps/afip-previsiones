"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = require("winston");
(0, winston_1.addColors)({
    error: "red",
    warn: "yellow",
    info: "green",
    http: "magenta",
    debug: "blue",
});
const customLevels = {
    levels: winston_1.config.npm.levels,
};
exports.logger = (0, winston_1.createLogger)({
    transports: [
        new winston_1.transports.Console({
            level: "debug",
            format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.json(), winston_1.format.colorize({ all: true }), winston_1.format.printf((info) => `${info.timestamp} [${info.level}]: ${info.message}`)),
        }),
    ],
    levels: customLevels.levels,
});
//# sourceMappingURL=logger.js.map