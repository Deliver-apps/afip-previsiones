const { supabase } = require("../supabaseClient");

async function getDataClients() {
  let { data: users, error } = await supabase.from("afip_users").select("*");
  console.log(users, data, error);

  if (error) {
    console.error("Error getting users:", error);
    return [];
  }

  return users ?? [];
}

module.exports = {
  getDataClients,
};
