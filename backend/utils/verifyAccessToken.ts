import { supabase } from "../supabaseClient";

export async function verifyAccessToken(token: string) {
  try {
    const cleanToken = token.replace(/=+$/, "");
    const { data, error } = await supabase.auth.getUser(cleanToken);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data.user };
  } catch (error) {
    return { success: false, error: "No se pudo verificar el token" };
  }
}
