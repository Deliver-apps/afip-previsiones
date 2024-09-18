"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
// import { router } from "./routes/scraper";
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config/config");
// import { startCronJob } from "./helpers/cronJob";
const PORT = config_1.config.port ? parseInt(config_1.config.port) : 3000;
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Set headers to allow cross-origin requests
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
// Start the cron job
// startCronJob();
// API route for scraping
// app.use("/api/scrape", authenticateToken, router);
app.get("/", (req, res) => {
    res.send("Hello World!");
});
// Start the Express server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map