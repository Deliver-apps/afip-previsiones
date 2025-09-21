const dotenv = require("dotenv");
dotenv.config();

const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_APIKEY,
  secretClient: process.env.SECRET_CLIENT,
  sheetWebId: process.env.SHEET_WEB_ID,
  chromeExecutablePath : process.env.PUPPETEER_EXECUTABLE_PATH,
  nodeEnv: process.env.NODE_ENV,
  digitalOceanAccessKey: process.env.DO_ACCESS_KEY,
  digitalOceanSecretKey: process.env.DO_SECRET_KEY,
  baseUrlDo: process.env.BASE_URL_DO,
  whatsappApiUrl: process.env.WHATSAPP_API_URL,
  // Configuraciones del scraper
  scraper: {
    timeout: parseInt(process.env.SCRAPER_TIMEOUT) || 400000, // 6.6 minutos
    pageTimeout: parseInt(process.env.PAGE_TIMEOUT) || 30000, // 30 segundos
    navigationTimeout: parseInt(process.env.NAVIGATION_TIMEOUT) || 30000,
    maxRetries: parseInt(process.env.MAX_RETRIES) || 1,
    screenshotBucket: process.env.SCREENSHOT_BUCKET || "previsiones-afip",
    userAgent: process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
  
  // Configuraciones de Puppeteer
  puppeteer: {
    headless: process.env.PUPPETEER_HEADLESS !== 'false',
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--single-process",
      "--no-zygote",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--disable-extensions",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
    ],
  },
};

module.exports = config;
