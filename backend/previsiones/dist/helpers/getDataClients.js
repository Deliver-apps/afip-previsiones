"use strict";
// getDataClients.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDataClients = getDataClients;
const supabaseClient_1 = require("../supabaseClient");
async function getDataClients() {
    const { data: users, error } = await supabaseClient_1.supabase.from("afip_users").select("*");
    if (error) {
        console.error("Error getting users:", error);
        return [];
    }
    return users ?? [];
}
//# sourceMappingURL=getDataClients.js.map