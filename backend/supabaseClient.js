const { createClient } = require("@supabase/supabase-js");
const config = require("./config/config");

const supabaseUrl = config.supabaseUrl;
const supabaseKey = config.supabaseKey;

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = {
  supabase,
};
