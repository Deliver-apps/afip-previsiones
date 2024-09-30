const apiUrl = import.meta.env.VITE_API_URL;
const afipUrl = import.meta.env.VITE_AFIP_URL;
import { User } from "@src/models";
import axios, { AxiosError, AxiosResponse } from "axios";
import Cookies from "js-cookie";

export const resetServer = async () => {
  try {
    await axios.post(
      `${apiUrl}api/scrape/reset`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Cookies.get("authToken")}`,
        },
      },
    );
  } catch (error) {
    console.error("Error reseting server:", error);
  }
};

interface ResponsePrevisiones {
  sucess: boolean;
  jobId: number;
  usersLength: number;
}

interface ResponseJob {
  id: number;
  state: string;
  result: string;
}

export const checkJobStatus = async (
  jobId: number,
): Promise<AxiosResponse<ResponseJob> | AxiosError> => {
  try {
    const response = await axios.get(
      `${apiUrl}api/scrape/previsiones/job/${jobId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Cookies.get("authToken")}`,
        },
      },
    );
    return response;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return error;
    }

    return error as AxiosError;
  }
};

export const generatePrevisiones = async (
  data: User[],
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
      },
    );
    return response;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return error;
    }

    return error as AxiosError;
  }
};
