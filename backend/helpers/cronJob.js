// cronJob.js
const cron = require("node-cron");
const logger = require("../config/logger");
const { putSheetData } = require("./sheets");
const { getDataClients } = require("./getDataClients");
const scrapeRoute = require("../routes/scraper");

function startCronJob() {
  cron.schedule(
    "0 5 15,16,17,25,28,30,31 * *",
    async () => {
      logger.debug("Running cron job");

      const data = await getDataClients();
      logger.debug("Data clients", data);

      const helper = [];
      try {
        for (const campos of data) {
          try {
            const result =
              await scrapeRoute.individualScraperWithTimeout(campos);
            if (result.error) {
              throw new Error(result.error);
            }
            helper.push(result);
          } catch (error) {
            logger.error(error.message);
          }
        }
        await putSheetData(helper);

        logger.debug("Scraping finished successfully");
        return;
      } catch (error) {
        logger.error(error.message);
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
  })
}


module.exports = { startCronJob };
