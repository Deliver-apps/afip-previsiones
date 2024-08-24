import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Ensure the environment variables are typed correctly
const supabaseURL: string = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseApiKey: string = import.meta.env.VITE_SUPABASE_APIKEY as string;

// Create the Supabase client with the typed variables
export const supabase: SupabaseClient = createClient(
  supabaseURL,
  supabaseApiKey
);
