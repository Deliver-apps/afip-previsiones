import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config/config";

const supabaseUrl: string = config.supabaseUrl ?? "";
const supabaseKey: string = config.supabaseKey ?? "";

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

export { supabase };
