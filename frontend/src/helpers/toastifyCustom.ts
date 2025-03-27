import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

type ToastPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";

export const showErrorToast = (
  message: string,
  position: ToastPosition,
  time: number,
) => {
  toast.error(message, {
    position,
    autoClose: time,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "colored",
  });
};

export const showSuccessToast = (
  message: string,
  position: ToastPosition,
  time: number,
) => {
  toast.success(message, {
    position,
    autoClose: time,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "colored",
  });
};

export const showInfoToast = (
  message: string,
  position: ToastPosition,
  time: number,
) => {
  toast.info(message, {
    position,
    autoClose: time,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "colored",
  });
};

export const showWarningToast = (
  message: string,
  position: ToastPosition,
  time: number,
) => {
  toast.warning(message, {
    position,
    autoClose: time,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "colored",
  });
};

export const showDefaultToast = (
  message: string,
  position: ToastPosition,
  time: number,
) => {
  toast(message, {
    position,
    autoClose: time,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "colored",
  });
};
