import { User, UserVeps } from "@src/models/user.model";
import { supabase } from "./supabaseClient";

export async function getDataUsers(): Promise<User[]> {
  let { data: users, error } = await supabase.from("afip_users").select("*");

  if (error) {
    console.error("Error getting users:", error);
    return [];
  }

  return users ?? [];
}

export async function editDataUser(user: User): Promise<User> {
  let { data, error } = await supabase.from("afip_users").upsert(user);

  if (error) {
    console.error("Error editing user:", error);
    return {} as User;
  }

  return data?.[0] ?? ({} as User);
}

export async function getDataUsersVeps(): Promise<UserVeps[]> {
  let { data: users, error } = await supabase.from("vep_users").select("*");

  if (error) {
    console.error("Error getting users:", error);
    return [];
  }

  return users ?? [];
}
