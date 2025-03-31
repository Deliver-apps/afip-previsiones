import { User } from "@src/models/user.model";
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

export async function addDataUser(user: Partial<User>): Promise<User> {
  console.log("USETRRRRRRE", user);
  let { data, error } = await supabase.from("afip_users").insert(user);

  if (error) {
    console.error("Error adding user:", error);
    return {} as User;
  }

  return data?.[0] ?? ({} as User);
}

export async function deleteDataUser(user: User): Promise<User> {
  let { data, error } = await supabase
    .from("afip_users")
    .delete()
    .eq("id", user.id);

  if (error) {
    console.error("Error deleting user:", error);
    return {} as User;
  }

  return data?.[0] ?? ({} as User);
}
