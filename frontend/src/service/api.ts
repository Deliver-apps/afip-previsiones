const apiUrl = import.meta.env.VITE_API_URL;
const afipUrl = import.meta.env.VITE_AFIP_URL;
import { User } from "@src/models";
import axios, { AxiosError, AxiosResponse } from "axios";
import Cookies from "js-cookie";

// export const generateComprobanteReq = async (data) => {
//   try {

//     const response = await axios.post(`${apiUrl}api/scrape/comprobantes`,{...data, url: afipUrl});

//     return response.data;
//   } catch (error) {
//     console.error("Error generating comprobante:", error);
//   }
// };

interface ResponsePrevisiones {
  sucess: boolean;
  failed: User[];
  data: User[];
}

export const generatePrevisiones = async (
  data: User[]
): Promise<AxiosResponse<ResponsePrevisiones> | AxiosError> => {
  try {
    const response = await axios.post(
      `${apiUrl}api/scrape/previsiones`,
      {
        data,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Cookies.get("authToken")}`,
        },
        timeout: 30_000 * 2 * data.length,
      }
    );
    return response;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return error;
    }

    return error as AxiosError;
  }
};
