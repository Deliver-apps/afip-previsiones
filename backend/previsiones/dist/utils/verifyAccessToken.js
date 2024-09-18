"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAccessToken = verifyAccessToken;
const supabaseClient_1 = require("../supabaseClient");
async function verifyAccessToken(token) {
    try {
        const cleanToken = token.replace(/=+$/, "");
        const { data, error } = await supabaseClient_1.supabase.auth.getUser(cleanToken);
        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true, data: data.user };
    }
    catch (error) {
        return { success: false, error: "No se pudo verificar el token" };
    }
}
//# sourceMappingURL=verifyAccessToken.js.map