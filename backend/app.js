const express = require("express");
const scrapeRoute = require("./routes/scraper");
const cors = require("cors");
const logger = require("./config/logger");
const { authenticateToken } = require("./middlewares/authentication");
const { startCronJob } = require("./helpers/cronJob"); // Import the cron job logic
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());

// Set headers to allow cross-origin requests
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  next();
});

// Start the cron job
startCronJob();

// API route for scraping
app.use("/api/scrape", authenticateToken, scrapeRoute.router);

// Start the Express server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
