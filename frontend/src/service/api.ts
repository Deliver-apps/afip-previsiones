const apiUrl = import.meta.env.VITE_API_URL;
const afipUrl = import.meta.env.VITE_AFIP_URL;
import { User } from "@src/models";
import axios, { AxiosError, AxiosResponse } from "axios";
import Cookies from "js-cookie";
const tokenGitHubCarlos = import.meta.env.VITE_GITHUB_CARLOS;

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

export const triggerRedeploy = async (): Promise<{
  error: boolean;
  message: string;
}> => {
  try {
    // We'll create a unique filename so we don't need the existing file's SHA
    const fileName = `trigger-${Date.now()}.txt`;
    const commitMessage = "Trigger redeploy from React";
    const fileContent = `Redeploy triggered at ${new Date().toISOString()}`;

    // GitHub API requires file content to be Base64 encoded
    const base64Content = btoa(fileContent);

    const url = `https://api.github.com/repos/Deliver-apps/afip-previsiones/contents/${fileName}`;

    const response = await axios.put(
      url,
      {
        message: commitMessage,
        content: base64Content,
      },
      {
        headers: {
          Authorization: `Bearer ${tokenGitHubCarlos}`,
          // "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    console.log("GitHub commit response:", response.data);

    return {
      error: false,
      message: "Redeploy triggered",
    };
  } catch (error) {
    console.error("Error triggering redeploy:", error);

    return {
      error: true,
      message: "Error triggering redeploy",
    };
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
  whatsapp: boolean = false,
): Promise<AxiosResponse<ResponsePrevisiones> | AxiosError> => {
  try {
    const response = await axios.post(
      `${apiUrl}api/scrape/previsiones?whatsapp=${whatsapp}`,
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
