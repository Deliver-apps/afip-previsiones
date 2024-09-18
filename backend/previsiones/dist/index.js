"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const scraper_1 = require("./routes/scraper");
const cors_1 = __importDefault(require("cors"));
const authentication_1 = require("./middlewares/authentication");
const cronJob_1 = require("./helpers/cronJob");
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
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
(0, cronJob_1.startCronJob)();
// API route for scraping
app.use("/api/scrape", authentication_1.authenticateToken, scraper_1.router);
// Start the Express server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map