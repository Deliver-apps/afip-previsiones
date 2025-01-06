import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Select,
  MenuItem,
  TextField,
  Grid,
  Typography,
  Autocomplete,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { PrimarySearchAppBar } from "../Home/components";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, AppStore } from "@src/redux/store";
import { fetchUsersVeps } from "@src/redux/states";
import { UserVeps } from "@src/models";
import { loadVep } from "@src/service/api";
import moment from "moment-timezone";
import { showErrorToast, showSuccessToast } from "@src/helpers/toastifyCustom";
import "moment/locale/es";
import { ToastContainer } from "react-toastify";

export default function Veps() {
  const [users, setUsers] = useState<UserVeps[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserVeps | null | undefined>(
    null,
  );
  const [blockCargar, setBlockCargar] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const stateUsersVep = useSelector((store: AppStore) => store.users_veps);
  // Fetch users from an endpoint
  useEffect(() => {
    dispatch(fetchUsersVeps());
  }, [dispatch]);

  useEffect(() => {
    setUsers(stateUsersVep);
  }, [stateUsersVep]);

  const switchMonthToSpanish = (month: string) => {
    switch (month) {
      case "January":
        return "enero";
      case "February":
        return "febrero";
      case "March":
        return "marzo";
      case "April":
        return "abril";
      case "May":
        return "mayo";
      case "June":
        return "junio";
      case "July":
        return "julio";
      case "August":
        return "agosto";
      case "September":
        return "septiembre";
      case "October":
        return "octubre";
      case "November":
        return "noviembre";
      case "December":
        return "diciembre";
      default:
        return month;
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
  };

  useEffect(() => {
    if (selectedFile && selectedUser && selectedDate) {
      setBlockCargar(true);
    } else {
      setBlockCargar(false);
    }
  }, [selectedFile, selectedUser, selectedDate]);

  function bufferToBase64(arrayBuffer: ArrayBuffer) {
    let binary = "";
    const bytes = new Uint8Array(arrayBuffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Separate logic for each button, even if both clear the form for now
  const handleCargarClick = async () => {
    // In the future, you'd handle form submission here
    console.log("Cargar: Form submitted or processed here.");
    if (!selectedUser || !selectedFile) {
      console.error("Falta seleccionar usuario o archivo");
      return;
    }
    moment.locale("es"); // Set locale to Spanish
    moment.tz.setDefault("America/Argentina/Buenos_Aires");

    const current_month_spanish = switchMonthToSpanish(moment().format("MMMM"));
    const current_year = moment().format("YYYY");

    const arrayBuffer = await selectedFile.arrayBuffer();

    const base64Pdf = bufferToBase64(arrayBuffer);

    try {
      await loadVep(
        base64Pdf,
        `veps_${current_month_spanish}_${current_year}/vep_${selectedUser.id}_${current_month_spanish}.pdf`,
      );
      showSuccessToast("Archivo cargado correctamente", "top-right", 4000);
      clearForm();
    } catch (error) {
      showErrorToast("Error cargando archivo", "top-right", 4000);
    }
  };

  const handleCancelClick = () => {
    // For now, just reset the form
    clearForm();
  };

  // Common function to reset the form
  const clearForm = () => {
    setSelectedUser(null);
    setSelectedFile(null);
    setSelectedDate(null);
  };

  const today = new Date();
  const tommorrow = new Date();
  tommorrow.setDate(today.getDate() + 1);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <ToastContainer />
      <PrimarySearchAppBar />
      <Box
        sx={{
          mt: 4,
          mx: "auto",
          p: 2,
          maxWidth: 600,
          width: "100%",
        }}
      >
        <Typography variant="h6" gutterBottom>
          Cargar Datos para Veps
        </Typography>
        <Grid container spacing={2}>
          {/* 1) Selector for users */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <Autocomplete
                fullWidth
                // The list of options
                options={users}
                // How each option is displayed in the dropdown
                getOptionLabel={(user) => `${user.real_name} - ${user.cuit}`}
                // The currently selected user
                value={selectedUser!}
                // Called when the user selects an option
                onChange={(_, newValue) => {
                  setSelectedUser(newValue);
                }}
                // Required to handle how Autocomplete determines if an option is the same as the current value
                isOptionEqualToValue={(option, value) =>
                  option.id === value?.id
                }
                // If you never want a clear (X) button, you can disable it
                disableClearable
                // The input field
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Usuario"
                    variant="outlined"
                    required
                  />
                )}
              />
            </FormControl>
          </Grid>

          {/* 2) File input for PDF */}
          <Grid item xs={12} sm={6}>
            <Button variant="outlined" component="label" fullWidth>
              {selectedFile ? selectedFile.name : "Seleccionar PDF"}
              <input
                type="file"
                hidden
                accept="application/pdf"
                onChange={handleFileChange}
              />
            </Button>
          </Grid>

          {/* 3) Date picker */}
          <Grid item xs={12} sm={6}>
            <DatePicker
              label="Fecha de ejecución"
              value={selectedDate}
              onChange={handleDateChange}
              minDate={tommorrow}
              // renderInput={(params) => <TextField fullWidth {...params} />}
            />
          </Grid>

          {/* Buttons at bottom: Cargar (left), Cancel (right) */}
          <Grid item xs={12}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                mt: 2,
              }}
            >
              <Button
                variant="contained"
                onClick={handleCargarClick}
                disabled={!blockCargar}
              >
                Cargar
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleCancelClick}
                sx={{ ml: 2 }}
              >
                Cancelar
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
}
