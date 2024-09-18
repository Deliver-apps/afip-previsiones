// cronJob.ts
import cron from "node-cron";
import { logger } from "../config/logger";
import { putSheetData } from "./sheets";
import { getDataClients } from "./getDataClients";
import { individualScraperWithTimeout } from "../routes/scraper";
import { deleteJob } from "../helpers/cache"; // Assuming deleteJob is exported from here
import { Campos } from "../types/campo.types";

function startCronJob(): void {
  cron.schedule(
    "0 5 15,16,17,25,28,30,31 * *",
    async () => {
      logger.debug("Running cron job");

      try {
        const data = (await getDataClients()) as Campos[];

        const helper: any[] = [];

        for (const campos of data) {
          try {
            const result = await individualScraperWithTimeout(campos);
            if (result.error) {
              throw new Error(result.error);
            }
            helper.push(result);
          } catch (error) {
            if (error instanceof Error) {
              logger.error(error.message);
            } else {
              logger.error(String(error));
            }
          }
        }

        await putSheetData(helper);

        logger.debug("Scraping finished successfully");
      } catch (error) {
        if (error instanceof Error) {
          logger.error(error.message);
        } else {
          logger.error(String(error));
        }
        throw error; // Let the error bubble up in case it needs further handling
      }
    },
    {
      scheduled: true,
      timezone: "America/Argentina/Buenos_Aires", // Set your timezone here
    },
  );

  cron.schedule("0 0 * * 1-5", async () => {
    logger.debug("Running cron job to clean cache");
    deleteJob();
  });
}

export { startCronJob };
