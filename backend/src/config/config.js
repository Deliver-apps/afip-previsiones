const dotenv = require("dotenv");
dotenv.config();

const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_APIKEY,
  secretClient: process.env.SECRET_CLIENT,
  sheetWebId: process.env.SHEET_WEB_ID,
};

module.exports = config;
