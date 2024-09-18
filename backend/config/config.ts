import dotenv from "dotenv";
dotenv.config();

export const config = {
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
