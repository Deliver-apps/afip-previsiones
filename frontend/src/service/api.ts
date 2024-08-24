const apiUrl = import.meta.env.VITE_API_URL;
const afipUrl = import.meta.env.VITE_AFIP_URL;
import { User } from "@src/models";
import axios from "axios";
import Cookies from "js-cookie";

// export const generateComprobanteReq = async (data) => {
//   try {

//     const response = await axios.post(`${apiUrl}api/scrape/comprobantes`,{...data, url: afipUrl});

//     return response.data;
//   } catch (error) {
//     console.error("Error generating comprobante:", error);
//   }
// };

export const generatePrevisiones = async (data: User[]) => {
  try {
    console.log("data", data);
    const response = await axios.post(`${apiUrl}api/scrape/previsiones`, {
      data,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Cookies.get("authToken")}`
      }
    });
    return response;
  } catch (error) {
    console.error("Error generating previsiones:", error);
  }
};
