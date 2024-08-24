const express = require("express");
const scrapeRoute = require("./routes/scraper");
const cron = require("node-cron");
const app = express();
const cors = require("cors");
const logger = require("./config/logger");
const { putSheetData } = require("./helpers/sheets");
const { authenticateToken } = require("./middlewares/authentication");
const { getDataClients } = require("./helpers/getDataClients");

app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// cron.schedule(
//   "*/3 * * * *",
//   async () => {
cron.schedule(
  "* 6 15,26 * *",
  async () => {
    logger.debug("Running cron job");

    const data = getDataClients();

    const helper = [];
    const responseFailed = [];

    try {
      for (const campos of data) {
        try {
          const result = await scrapeRoute.individualScraperWithTimeout(campos);
          helper.push(result);
        } catch (error) {
          logger.error(error.message);
          responseFailed.push(campos);
          if (responseFailed.length > 5) {
            throw new Error(
              "Fallaron muchas solicitudes, se cancela la generación"
            );
          }
        }
      }
      await putSheetData(helper);

      logger.debug("Scraping finished successfully");
      return;
    } catch (error) {
      console.error(error);
      logger.error(error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires", // You can set your timezone here
  }
);

app.use(express.json());
app.use("/api/scrape", authenticateToken, scrapeRoute.router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
