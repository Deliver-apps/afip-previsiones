"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("./config/config");
const supabaseUrl = config_1.config.supabaseUrl ?? "";
const supabaseKey = config_1.config.supabaseKey ?? "";
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
exports.supabase = supabase;
//# sourceMappingURL=supabaseClient.js.map