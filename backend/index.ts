import express, { Request, Response, NextFunction } from "express";
import { router } from "./routes/scraper";
import cors from "cors";
import { logger } from "./config/logger";
import { authenticateToken } from "./middlewares/authentication";
import { startCronJob } from "./helpers/cronJob";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const app = express();
app.use(cors());
app.use(express.json());

// Set headers to allow cross-origin requests
app.use((req: Request, res: Response, next: NextFunction) => {
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
app.use("/api/scrape", authenticateToken, router);

// Start the Express server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
