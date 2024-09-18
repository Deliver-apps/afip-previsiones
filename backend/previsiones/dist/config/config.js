"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_APIKEY,
    secretClient: process.env.SECRET_CLIENT,
    sheetWebId: process.env.SHEET_WEB_ID,
    chromeExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    nodeEnv: process.env.NODE_ENV,
    digitalOceanAccessKey: process.env.DO_ACCESS_KEY,
    digitalOceanSecretKey: process.env.DO_SECRET_KEY,
    baseUrlDo: process.env.BASE_URL_DO,
};
//# sourceMappingURL=config.js.map