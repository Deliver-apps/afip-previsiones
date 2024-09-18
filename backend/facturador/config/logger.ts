import { createLogger, transports, format, addColors, config } from "winston";

addColors({
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
});

const customLevels = {
  levels: config.npm.levels,
};
export const logger = createLogger({
  transports: [
    new transports.Console({
      level: "debug",
      format: format.combine(
        format.timestamp(),
        format.json(),
        format.colorize({ all: true }),
        format.printf(
          (info) => `${info.timestamp} [${info.level}]: ${info.message}`,
        ),
      ),
    }),
  ],
  levels: customLevels.levels,
});