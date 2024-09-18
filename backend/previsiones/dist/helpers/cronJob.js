"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCronJob = startCronJob;
// cronJob.ts
const node_cron_1 = __importDefault(require("node-cron"));
const logger_1 = require("../config/logger");
const sheets_1 = require("./sheets");
const getDataClients_1 = require("./getDataClients");
const scraper_1 = require("../routes/scraper");
const cache_1 = require("../helpers/cache"); // Assuming deleteJob is exported from here
function startCronJob() {
    node_cron_1.default.schedule("0 5 15,16,17,25,28,30,31 * *", async () => {
        logger_1.logger.debug("Running cron job");
        try {
            const data = (await (0, getDataClients_1.getDataClients)());
            const helper = [];
            for (const campos of data) {
                try {
                    const result = await (0, scraper_1.individualScraperWithTimeout)(campos);
                    if (result.error) {
                        throw new Error(result.error);
                    }
                    helper.push(result);
                }
                catch (error) {
                    if (error instanceof Error) {
                        logger_1.logger.error(error.message);
                    }
                    else {
                        logger_1.logger.error(String(error));
                    }
                }
            }
            await (0, sheets_1.putSheetData)(helper);
            logger_1.logger.debug("Scraping finished successfully");
        }
        catch (error) {
            if (error instanceof Error) {
                logger_1.logger.error(error.message);
            }
            else {
                logger_1.logger.error(String(error));
            }
            throw error; // Let the error bubble up in case it needs further handling
        }
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires", // Set your timezone here
    });
    node_cron_1.default.schedule("0 0 * * 1-5", async () => {
        logger_1.logger.debug("Running cron job to clean cache");
        (0, cache_1.deleteJob)();
    });
}
//# sourceMappingURL=cronJob.js.map