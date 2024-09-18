// getDataClients.ts

import { supabase } from "../supabaseClient";
import { Campos } from "../types/campo.types";
import { User } from "../types/user.types";

async function getDataClients(): Promise<User[]> {
  const { data: users, error } = await supabase.from("afip_users").select("*");

  if (error) {
    console.error("Error getting users:", error);
    return [];
  }

  return users ?? [];
}

export { getDataClients };
