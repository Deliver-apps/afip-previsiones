import React, { useEffect, useState } from "react";
import { AppDispatch, AppStore } from "@src/redux/store";
import {
  DataGrid,
  GridColDef,
  GridRowId,
  GridRowSelectionModel,
  GridToolbarFilterButton,
} from "@mui/x-data-grid";
import { User } from "@src/models";
import { useDispatch, useSelector } from "react-redux";
import {
  addUser,
  deleteUser,
  editUser,
  fetchUsers,
  modifyState,
} from "@src/redux/states";
import { Box, Button, IconButton } from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  PlayCircleFilledOutlined,
  Queue,
} from "@mui/icons-material";
import CircularProgress from "@mui/material/CircularProgress";
import spanishLocaleText from "@src/helpers/spanish.helper";
import { EditForm } from "../EditForm";
import "react-toastify/dist/ReactToastify.css";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "@src/helpers/toastifyCustom";
import {
  checkJobStatus,
  generatePrevisiones,
  resetServer,
  triggerRedeploy,
} from "@src/service/api";
import { isAxiosError } from "axios";
import { CustomModal } from "../CustomModal";
import { ToastContainer } from "react-toastify";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
  Stack,
} from "@mui/material";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export type UsersTableProps = {};

const UsersTable: React.FC<UsersTableProps> = () => {
  const [users, setUsers] = useState<User[]>([]);
  const pageSize = 12;
  const dispatch = useDispatch<AppDispatch>();
  const stateUsers = useSelector((store: AppStore) => store.users);
  const [open, setOpen] = useState(false);
  const [newUserToAdd, setNewUserToAdd] = useState(false);
  const [selectedRows, setSelectedRows] = useState<GridRowId[]>([]);
  const [dataUser, setDataUser] = useState<User>({
    id: 0,
    username: "",
    password: "",
    is_company: false,
    company_name: "",
    real_name: "",
    cuit_company: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loadingPrevisiones, setLoadingPrevisiones] = useState(false);
  const [failedOpen, setFailedOpen] = useState(false);
  const [descriptionModal, setDescriptionModal] = useState("");
  const [jobId, setJobId] = useState(0);
  const [timeExpected, setTimeExpected] = useState(0);
  const [isActiveInterval, setIsActiveInterval] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDialogRedeploy, setOpenDialogRedeploy] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActiveInterval) {
      console.log("Intervalo activo");
      interval = setInterval(async () => {
        const checked = await checkJobStatus(jobId);
        console.log("Intervalo ejecutado");
        if (isAxiosError(checked)) {
          console.error("Error checking job status:", checked);
          showErrorToast(
            "Error en la consulta a la API de la Prevision",
            "top-right",
            4000,
          );
          setFailedOpen(true);
          setIsActiveInterval(false);
          setLoadingPrevisiones(false);
        } else if (checked.data.state === "finished") {
          setIsActiveInterval(false);
          setLoadingPrevisiones(false);
          showSuccessToast(
            "Previsiones generadas correctamente",
            "top-right",
            4000,
          );
        }
      }, timeExpected);
      console.log("Intervalo creado");
    } else if (interval !== null) {
      console.log("Intervalo desactivado");
      clearInterval(interval);
      setLoadingPrevisiones(false);
    }

    // Cleanup function to clear interval when component unmounts or dependency changes
    return () => {
      if (interval !== null) {
        clearInterval(interval);
        setLoadingPrevisiones(false);
      }
    };
  }, [isActiveInterval]); // Add timeExpected as a dependency

  const handleCloseModal = () => setFailedOpen(false);
  const handleAcceptModal = () => {
    setFailedOpen(false);
  };

  const handleEditForm = (params: User, newUser?: boolean) => {
    const new_user = {
      id: users[users.length - 1].id + 1,
      username: "",
      password: "",
      is_company: false,
      company_name: "",
      real_name: "",
      cuit_company: "",
    };
    setOpen(true);
    newUser ? setNewUserToAdd(newUser) : setNewUserToAdd(false);
    setDataUser(newUser ? new_user : params);
  };

  const handleEditUser = (user: User) => {
    try {
      dispatch(editUser(user));
      showSuccessToast("Usuario editado correctamente!", "top-right", 4000);
      dispatch(modifyState(user));
    } catch (error) {
      showErrorToast("Error al editar usuario!", "top-right", 4000);
      console.error("Error editing user:", error);
    }
  };

  const handleCreateUser = (user: User) => {
    try {
      console.log("PREVIOOOOOOOO");
      dispatch(addUser(user)).then(() =>
        showSuccessToast("Usuario agregado correctamente!", "top-right", 4000),
      );
      dispatch(modifyState(user));
    } catch (error) {
      showErrorToast("Error al crear usuario!", "top-right", 4000);
      console.error("Error editing user:", error);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const goToExcel = () => {
    window.open(
      "https://docs.google.com/spreadsheets/d/1kb04CjX9wC7k9Z8VBUydpqSoGnRfD4pnEaouVvrZ6rs/edit?pli=1&gid=281256569#gid=281256569",
      "_blank",
    );
  };

  const handleGenerar = async () => {
    const filterBySelectedRows = (selectedRows: GridRowId[]) => {
      return users.filter((user) => selectedRows.includes(user.id));
    };

    setLoadingPrevisiones(true);
    showSuccessToast("Generando Previsiones...", "top-right", 4000);

    try {
      const filteredUsers = filterBySelectedRows(selectedRows);
      const response = await generatePrevisiones(filteredUsers);
      console.log(response);
      if (isAxiosError(response)) {
        showErrorToast(
          "Error en la consulta a la API de la Prevision",
          "top-right",
          4000,
        );
      } else {
        console.log("NOt error");
        setJobId(response.data.jobId);
        setTimeExpected(response.data.usersLength * 150_000);
        setIsActiveInterval(true);
        showSuccessToast("Iniciando consulta de usuarios", "top-right", 4000);
      }
    } catch (error) {
      console.error("An unexpected error occurred:", error);
      showErrorToast(
        "Error en la consulta a la API de la Prevision",
        "top-right",
        4000,
      );

      setLoadingPrevisiones(false);
    }
  };

  const CustomToolbar = () => {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center", // Centers the toolbar horizontally
          width: "100%",
        }}
      >
        <GridToolbarFilterButton />
        <Button
          disabled={selectedRows.length <= 0 || loadingPrevisiones}
          onClick={handleGenerar}
          sx={{
            pb: 1.1,
          }}
        >
          Generar Previsiones
          {loadingPrevisiones ? (
            <CircularProgress />
          ) : (
            <PlayCircleFilledOutlined />
          )}
        </Button>
        <Button
          sx={{
            pb: 1.1,
          }}
          onClick={() => goToExcel()}
        >
          {" "}
          Ir al Excel!
        </Button>
        <Button
          sx={{
            pb: 1.1,
            color: "red",
          }}
          onClick={() => setOpenDialog(!openDialog)}
        >
          {" "}
          Reiniciar Server...
        </Button>
        <Button
          sx={{
            pb: 1.1,
            color: "red",
          }}
          onClick={() => setOpenDialogRedeploy(!openDialogRedeploy)}
        >
          {" "}
          Redeploy Server...
        </Button>
        <Button
          sx={{
            pb: 1.1,
            color: "blue",
          }}
          onClick={() => handleEditForm(dataUser, true)}
        >
          {" "}
          <Queue fontSize="small" />
        </Button>
      </Box>
    );
  };

  const columns: GridColDef[] = [
    {
      field: "id",
      headerName: "id",
      width: 40,
      flex: 1,
      filterable: false,
      disableColumnMenu: true,
      sortable: false,
    },
    {
      field: "username",
      headerName: "CUIT",
      width: 120,
      flex: 1,
      sortable: false,
      disableColumnMenu: true,
    },
    {
      field: "password",
      headerName: "Contraseña",
      sortable: false,
      width: 130,
      flex: 1,
      renderCell: (params) => {
        return (
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ marginRight: 8 }}>
              {showPassword ? params.value : "***************"}
            </span>
            <IconButton
              aria-label="toggle password visibility"
              onClick={(event) => {
                event?.stopPropagation();
                handleClickShowPassword();
              }}
              size="small"
              style={{ padding: 0 }}
            >
              {showPassword ? (
                <VisibilityOff fontSize="small" />
              ) : (
                <Visibility fontSize="small" />
              )}
            </IconButton>
          </div>
        );
      },
      align: "left",
      disableColumnMenu: true,
    },
    {
      field: "is_company",
      headerName: "¿Es Empresa?",
      width: 130,
      flex: 1,
      renderCell: (params) => (params.value ? "Si" : "No"),
      align: "center",
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
    },
    {
      field: "company_name",
      headerName: "Nombre Empresa",
      width: 200,
      flex: 2,
      disableColumnMenu: true,
      sortable: false,
    },
    {
      field: "real_name",
      headerName: "Persona Física",
      width: 200,
      flex: 2,
      disableColumnMenu: true,
      sortable: false,
    },
    {
      field: "cuit_company",
      headerName: "Cuit Empresa",
      width: 130,
      flex: 1,
      sortable: false,
      disableColumnMenu: true,
    },
    {
      field: "actions",
      headerName: "Acciones",
      sortable: false,
      width: 130,
      align: "center",
      headerAlign: "center",
      flex: 1,
      renderCell: (params) => (
        <div>
          <Button
            onClick={(event) => {
              event?.stopPropagation();
              handleEditForm(params.row);
            }}
          >
            Editar
          </Button>
          <Button
            sx={{
              color: "red",
              fontSize: "small",
            }}
            onClick={(event) => {
              event?.stopPropagation();
              showConfirmationToast(
                () => handleDelete(params.row),
                () => console.log("Deny"),
              );
            }}
          >
            Borrar
          </Button>
        </div>
      ),
      filterable: false,
      disableColumnMenu: true,
    },
    // {
    //   field: "delete",
    //   headerName: "Borrado",
    //   sortable: false,
    //   width: 130,
    //   flex: 1,
    //   renderCell: (params) => (

    //   ),
    //   filterable: false,
    //   disableColumnMenu: true,
    // },
  ];

  const showConfirmationToast = (onAccept: () => void, onDeny: () => void) => {
    toast.info(
      ({ closeToast }) => (
        <div>
          <Typography variant="subtitle1" gutterBottom>
            ¿Estás seguro de borrar este usuario?
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={() => {
                onAccept();
                closeToast?.();
              }}
            >
              Aceptar
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                onDeny();
                closeToast?.();
              }}
            >
              Cancelar
            </Button>
          </Stack>
        </div>
      ),
      {
        autoClose: false,
        closeOnClick: false,
        closeButton: false,
      },
    );
  };

  const handleDelete = (user: User) => {
    try {
      dispatch(deleteUser(user));
      showSuccessToast("Usuario borrado correctamente!", "top-right", 4000);
      dispatch(modifyState(user));
    } catch (error) {
      showErrorToast("Error al borrar usuario!", "top-right", 4000);
      console.error("Error editing user:", error);
    }
  };

  const handleSelectionChange = (newSelection: GridRowSelectionModel) => {
    setSelectedRows([...newSelection]);
  };
  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  useEffect(() => {
    setUsers(stateUsers);
  }, [stateUsers]);

  const handleAccept = async () => {
    if (openDialogRedeploy) {
      const response = await triggerRedeploy();
      setOpenDialogRedeploy(false);
      showInfoToast(
        "Haciendo redeploy del servidor, espere 3 minutos...",
        "top-right",
        2000,
      );
      if (response.error) {
        showErrorToast("Error en la redeploy del servidor", "top-right", 5000);
      } else {
        showSuccessToast(
          "Redeploy del servidor realizado correctamente, espere 3 minutos...",
          "top-right",
          120000,
        );
      }
    } else if (openDialog) {
      await resetServer();
      setOpenDialog(false);
      showInfoToast(
        "Reiniciando servidor, espere un momento...",
        "top-right",
        4000,
      );
    }
  };

  const handleCancel = () => {
    console.log("Cancelled!");
    setOpenDialog(false);
    setOpenDialogRedeploy(false);
  };

  return (
    <>
      <ToastContainer />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "calc(100vh - 64px)", // Subtract height of AppBar or any header if present
          width: "100%", // Full width of the viewport
          padding: "16px", // Add some padding for better appearance
          boxSizing: "border-box", // Ensure padding is included in the width and height
        }}
      >
        <DataGrid
          rows={users}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize },
            },
          }}
          pageSizeOptions={[5, pageSize]}
          checkboxSelection
          localeText={spanishLocaleText}
          density="compact"
          onRowSelectionModelChange={handleSelectionChange}
          slots={{
            toolbar: CustomToolbar,
          }}
          sx={{
            height: "100%", // Make DataGrid take the full height of its container
            width: "100%", // Make DataGrid take the full width of its container
          }}
        />
      </div>
      <EditForm
        open={open}
        handleClose={handleClose}
        dataUser={dataUser}
        handleEditUser={newUserToAdd ? handleCreateUser : handleEditUser}
        newUser={newUserToAdd}
      />
      <CustomModal
        open={failedOpen}
        onClose={handleCloseModal}
        onAccept={handleAcceptModal}
        title="Previsiones falladas"
        description={descriptionModal}
      />
      <div>
        <Dialog
          open={openDialog}
          onClose={handleCancel}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">{"Confirm Action"}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              Seguro que quieres reiniciar el servidor?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancel} color="primary">
              No
            </Button>
            <Button onClick={handleAccept} color="error" autoFocus>
              Sí
            </Button>
          </DialogActions>
        </Dialog>
      </div>
      <div>
        <Dialog
          open={openDialogRedeploy}
          onClose={handleCancel}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">{"Confirm Action"}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              Seguro que queres hacer un redeploy del servidor?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancel} color="primary">
              No
            </Button>
            <Button onClick={handleAccept} color="error" autoFocus>
              Sí
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </>
  );
};

export default UsersTable;
