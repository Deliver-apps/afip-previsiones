import React, { useEffect, useState } from "react";
import { AppDispatch, AppStore } from "@src/redux/store";
import {
  DataGrid,
  GridColDef,
  GridRowId,
  GridRowSelectionModel,
  GridToolbarFilterButton,
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarQuickFilter,
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
import {
  Box,
  Button,
  IconButton,
  Checkbox,
  FormControlLabel,
  TextField,
  InputAdornment,
  Typography,
  Paper,
  Stack,
  Divider,
  Alert,
  Chip,
  RadioGroup,
  Radio,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  PlayCircleFilledOutlined,
  Queue,
  Save,
  AttachMoney,
  Percent,
  TrendingUp,
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
  Typography as MuiTypography,
  Stack as MuiStack,
} from "@mui/material";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export type UsersTableProps = {};

const UsersTable: React.FC<UsersTableProps> = () => {
  const [users, setUsers] = useState<User[]>([]);
  const minPageSize = 9;
  const maxPageSize = 12;
  const dispatch = useDispatch<AppDispatch>();
  const stateUsers = useSelector((store: AppStore) => store.users);
  const [open, setOpen] = useState(false);
  const [newUserToAdd, setNewUserToAdd] = useState(false);
  const [dataUser, setDataUser] = useState<User>({
    id: 0,
    username: "",
    password: "",
    is_company: false,
    company_name: "",
    real_name: "",
    cuit_company: "",
  });
  const [showPassword, setShowPassword] = useState<{ [userId: number]: boolean }>({});
  const [loadingPrevisiones, setLoadingPrevisiones] = useState(false);
  const [failedOpen, setFailedOpen] = useState(false);
  const [descriptionModal, setDescriptionModal] = useState("");
  const [jobId, setJobId] = useState(0);
  const [timeExpected, setTimeExpected] = useState(0);
  const [isActiveInterval, setIsActiveInterval] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDialogRedeploy, setOpenDialogRedeploy] = useState(false);
  const [openSalesDialog, setOpenSalesDialog] = useState(false);
  const [salesData, setSalesData] = useState({
    venta: "",
    iva: "",
  });
  const [salesErrors, setSalesErrors] = useState<{ [key: string]: string }>({});
  const [usersToLoadSales, setUsersToLoadSales] = useState<number[]>([]);

  const [externalSalesData, setExternalSalesData] = useState<{
    userId: number,
    venta: string,
    iva: string
  }[]>([]);
  const [externalSalesErrors, setExternalSalesErrors] = useState<{
    [userId: number]: { [field: string]: string }
  }>({});
  const [rowSelection, setRowSelection] = React.useState<GridRowSelectionModel>([]);

  const handleSalesToggle = (rowId: number, checked: boolean) => {
    setUsersToLoadSales(prev => {
      const next = checked ? [...prev, rowId] : prev.filter(id => id !== rowId);

      /* ✔️  Si lo acabo de marcar, selecciono la fila (pero si lo desmarco NO la deselecciono) */
      if (checked && !rowSelection.includes(rowId)) {
        setRowSelection(sel => [...sel, rowId]);
      }

      return next;
    });
  };

  // Función para formatear moneda argentina
  const formatCurrency = (value: string): string => {
    const numericValue = value.replace(/[^\d]/g, "");
    if (numericValue === "") return "";

    const number = parseInt(numericValue, 10);
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(number);
  };

  const toNumberAR = (s = ''): string => {
    const numericValue = s.replace(/[^\d]/g, "");
    if (numericValue === "") return "0";
    return numericValue;
  }

  // Función para formatear porcentaje
  const formatPercentage = (value: string): string => {
    const numericValue = value.replace(/[^\d]/g, "");
    if (numericValue === "") return "";
    return `${numericValue}%`;
  };

  // Función para limpiar formato de moneda
  const cleanCurrencyFormat = (value: string): string => {
    return value.replace(/[^\d]/g, "");
  };

  const handleExternalSalesInputChange = (userId: number, field: string, value: string) => {
    let formattedValue = value;

    if (field === "venta") {
      formattedValue = formatCurrency(value);
    } else if (field === "iva") {
      // Para el dropdown, no necesitamos formatear
      formattedValue = value;
    }

    setExternalSalesData(prev => {
      const existingIndex = prev.findIndex(data => data.userId === userId);

      if (existingIndex >= 0) {
        // Actualizar existente
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          [field]: formattedValue
        };
        return updated;
      } else {
        // Agregar nuevo
        return [...prev, { userId, venta: field === "venta" ? formattedValue : "", iva: field === "iva" ? formattedValue : "" }];
      }
    });

    // Limpiar errores cuando el usuario empieza a escribir
    if (externalSalesErrors[userId]?.[field]) {
      setExternalSalesErrors(prev => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          [field]: ""
        }
      }));
    }
  };

  const validateExternalSalesForm = () => {
    const errors: { [userId: number]: { [field: string]: string } } = {};
    let hasErrors = false;

    usersToLoadSales.forEach((userId) => {
      const userData = externalSalesData.find(data => data.userId === userId) || { venta: "", iva: "" };
      const userErrors: { [field: string]: string } = {};

      if (!userData.venta || cleanCurrencyFormat(userData.venta) === "") {
        userErrors.venta = "La venta es obligatoria";
        hasErrors = true;
      }

      if (Object.keys(userErrors).length > 0) {
        errors[userId] = userErrors;
      }
    });

    setExternalSalesErrors(errors);
    return !hasErrors;
  };

  const handleSalesCancel = () => {
    setOpenSalesDialog(false);
    setExternalSalesErrors({});
  };

  const handleExternalSalesSubmit = async () => {
    if (validateExternalSalesForm()) {
      const addIvaIfNotExists = (userExtra: {
        userId: number;
        venta: string;
        iva: string;
      }) => {
        if (!userExtra.iva) {
          userExtra.iva = "21";
        }
        return userExtra;
      };
      const usersWithIva = externalSalesData.map(addIvaIfNotExists);
      // Aquí procesarías los datos de ventas externas por usuario

      setOpenSalesDialog(false);
      setExternalSalesData([]);
      setExternalSalesErrors({});

      await handleGenerar(usersWithIva);
    }
  };

  const handleGenerar = async (usuariosIva: {
    userId: number;
    venta: string;
    iva: string;
  }[]) => {
    if (rowSelection.length === 0) {
      showErrorToast("Debe seleccionar al menos un usuario", "top-right", 4000);
      return;
    }

    if (usersToLoadSales.length > 0 && !openSalesDialog) {
      setOpenSalesDialog(true);
    } else {
      const filterBySelectedRows = (rowSelection: GridRowId[]) => {
        return users.filter((user) => rowSelection.includes(user.id));
      };
      setLoadingPrevisiones(true);
      showSuccessToast("Generando Previsiones...", "top-right", 4000);

      try {
        const filteredUsers = filterBySelectedRows(rowSelection.map(id => Number(id)));
        const filteredUsersWithIva = filteredUsers.map(user => ({
          ...user,
          iva: usuariosIva.find(iva => iva.userId === user.id)?.iva,
          venta: toNumberAR(usuariosIva.find(iva => iva.userId === user.id)?.venta)
        }));
        console.log("filteredUsers con Iva", filteredUsersWithIva);
        const response = await generatePrevisiones(filteredUsersWithIva);
        console.log(response);
        if (isAxiosError(response)) {
          showErrorToast(
            "Error en la consulta a la API de la Prevision",
            "top-right",
            4000,
          );
        } else {
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

    }
  };

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

  const handleCreateUser = (user: Partial<User>) => {
    try {
      dispatch(addUser(user as User)).then(() =>
        showSuccessToast("Usuario agregado correctamente!", "top-right", 4000),
      );
      dispatch(modifyState(user as User));
    } catch (error) {
      showErrorToast("Error al crear usuario!", "top-right", 4000);
      console.error("Error editing user:", error);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const goToExcel = () => {
    window.open(
      "https://docs.google.com/spreadsheets/d/1kb04CjX9wC7k9Z8VBUydpqSoGnRfD4pnEaouVvrZ6rs/edit?pli=1&gid=281256569#gid=281256569",
      "_blank",
    );
  };

  const CustomToolbar = () => {
    return (
      <GridToolbarContainer>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            p: 1,
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <GridToolbarQuickFilter
              placeholder="Buscar usuarios..."
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: '14px',
                }
              }}
            />
            <GridToolbarFilterButton />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              disabled={rowSelection.length <= 0 || loadingPrevisiones}
              onClick={() => handleGenerar(externalSalesData)}
              variant="contained"
              color="primary"
              startIcon={
                loadingPrevisiones ? (
                  <CircularProgress size={16} />
                ) : (
                  <PlayCircleFilledOutlined />
                )
              }
              sx={{
                minWidth: 'auto',
                px: 2,
                py: 1,
                borderRadius: 2,
                boxShadow: 2,
                '&:hover': {
                  boxShadow: 4,
                }
              }}
            >
              Generar Previsiones
            </Button>

            <Button
              variant="outlined"
              onClick={() => goToExcel()}
              startIcon={<TrendingUp />}
              sx={{
                minWidth: 'auto',
                px: 2,
                py: 1,
                borderRadius: 2,
              }}
            >
              Ir al Excel
            </Button>

            <Button
              variant="outlined"
              color="error"
              onClick={() => setOpenDialog(!openDialog)}
              sx={{
                minWidth: 'auto',
                px: 2,
                py: 1,
                borderRadius: 2,
              }}
            >
              Reiniciar Server
            </Button>

            <Button
              variant="outlined"
              color="error"
              onClick={() => setOpenDialogRedeploy(!openDialogRedeploy)}
              sx={{
                minWidth: 'auto',
                px: 2,
                py: 1,
                borderRadius: 2,
              }}
            >
              Redeploy Server
            </Button>

            <Button
              variant="outlined"
              color="primary"
              onClick={() => handleEditForm(dataUser, true)}
              startIcon={<Queue />}
              sx={{
                minWidth: 'auto',
                px: 2,
                py: 1,
                borderRadius: 2,
              }}
            >
              Agregar
            </Button>
          </Box>
        </Box>
      </GridToolbarContainer>
    );
  };

  const handleClickShowSinglePassword = (userId: number) => {
    setShowPassword(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const columns: GridColDef[] = [
    {
      field: "external_sales",
      headerName: "$ Ventas",
      sortable: false,
      width: 120,
      align: "center",
      headerAlign: "center",
      flex: 0.5,
      renderCell: (params) => (
        <FormControlLabel
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <AttachMoney fontSize="small" color="primary" />
            </Box>
          }
          control={
            <Checkbox
              checked={usersToLoadSales.includes(params.row.id)}
              onChange={(e) => {
                handleSalesToggle(params.row.id, e.target.checked);
                setRowSelection(prev => [...prev, params.row.id]);
              }}
              size="medium"
              color="primary"
              sx={{
                mb: 0.5,
              }}
            />
          }

          sx={{
            m: 0,
            '& .MuiFormControlLabel-label': {
              fontSize: '0.75rem',
            }
          }}
        />
      ),
      filterable: false,
      disableColumnMenu: true,
    },
    {
      field: "username",
      headerName: "CUIT",
      width: 100,
      flex: 0.8,
      sortable: false,
      disableColumnMenu: true,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",   // ⬅️ centra vertical
            justifyContent: "center" // ⬅️ centra horizontal
          }}
        >
          <Typography variant="body2" >
            {formatOutPutCuit(params.row)}
          </Typography>
        </Box>
      ),
    },
    {
      field: "password",
      headerName: "Contraseña",
      sortable: false,
      width: 150,
      flex: 1,
      renderCell: (params) => {
        return (
          <Box sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",   // ⬅️ centra vertical
            justifyContent: "center" // ⬅️ centra horizontal
          }}>
            <Typography
              variant="overline"
              sx={{
                fontFamily: 'monospace',
                mr: 1,
                color: showPassword[params.row.id] ? 'text.primary' : 'text.secondary'
              }}
            >
              {showPassword[params.row.id] ? params.value : "•••••••"}
            </Typography>
            <IconButton
              aria-label="toggle password visibility"
              onClick={(event) => {
                event?.stopPropagation();
                handleClickShowSinglePassword(params.row.id);
              }}
              size="small"
              sx={{ p: 0.5 }}
            >
              {showPassword[params.row.id] ? (
                <VisibilityOff fontSize="small" />
              ) : (
                <Visibility fontSize="small" />
              )}
            </IconButton>
          </Box>
        );
      },
      align: "left",
      disableColumnMenu: true,
    },
    {
      field: "is_company",
      headerName: "Tipo",
      width: 100,
      flex: 0.7,
      renderCell: (params) => (
        <Chip
          label={params.value ? "Empresa" : "Persona"}
          size="small"
          color={params.value ? "success" : "info"}
          variant="filled"
        />
      ),
      align: "center",
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
    },
    {
      field: "company_name",
      headerName: "Nombre Empresa",
      width: 180,
      flex: 1.5,
      disableColumnMenu: true,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",   // ⬅️ centra vertical
          justifyContent: "center" // ⬅️ centra horizontal
        }}>
          <Typography variant="overline" noWrap>
            {params.value || "-"}
          </Typography>
        </Box>
      ),
    },
    {
      field: "real_name",
      headerName: "Persona Física",
      width: 180,
      flex: 1.5,
      disableColumnMenu: true,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",   // ⬅️ centra vertical
          justifyContent: "center" // ⬅️ centra horizontal
        }}>
          <Typography variant="overline" noWrap>
            {params.value || "-"}
          </Typography>
        </Box>
      ),
    },
    {
      field: "cuit_company",
      headerName: "CUIT Empresa",
      width: 140,
      flex: 1,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Box sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",   // ⬅️ centra vertical
          justifyContent: "center" // ⬅️ centra horizontal
        }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {params.value || "-"}
          </Typography>
        </Box>
      ),
    },
    {
      field: "actions",
      headerName: "Acciones",
      sortable: false,
      width: 160,
      align: "center",
      headerAlign: "center",
      flex: 1,
      renderCell: (params) => (
        <Stack direction="column" spacing={0.2}>
          <Button
            variant="outlined"
            size="small"
            onClick={(event) => {
              event?.stopPropagation();
              handleEditForm(params.row);
            }}
            sx={{ minWidth: 'auto', px: 1 }}
          >
            Editar
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={(event) => {
              event?.stopPropagation();
              showConfirmationToast(
                () => handleDelete(params.row),
                () => console.log("Deny"),
              );
            }}
            sx={{ minWidth: 'auto', px: 1 }}
          >
            Borrar
          </Button>
        </Stack>
      ),
      filterable: false,
      disableColumnMenu: true,
    },

  ];

  const showConfirmationToast = (onAccept: () => void, onDeny: () => void) => {
    toast.info(
      ({ closeToast }) => (
        <div>
          <MuiTypography variant="subtitle1" gutterBottom>
            ¿Estás seguro de borrar este usuario?
          </MuiTypography>
          <MuiStack direction="row" spacing={2}>
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
          </MuiStack>
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
    setRowSelection(newSelection);                     // ① sincroniza el grid

    // ② Mantén sólo los que siguen seleccionados:
    setUsersToLoadSales(prev =>
      prev.filter(id => newSelection.includes(id))
    );
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

  const formatOutPutCuit = (user: User) => {
    const finalCuit = user.is_company ? user.cuit_company : user.username;
    if (!finalCuit) return "-";
    return finalCuit.replace(/(\d{2})(\d{8})(\d{1})/, "$1-$2-$3");
  };

  const handleCancel = () => {
    console.log("Cancelled!");
    setOpenDialog(false);
    setOpenDialogRedeploy(false);
  };

  return (
    <>
      <ToastContainer />
      <Paper
        elevation={3}
        sx={{
          height: "calc(100vh - 64px)",
          width: "100%",
          p: 2,
          borderRadius: 2,
          overflow: "hidden"
        }}
      >
        <DataGrid
          rows={users}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: minPageSize },
            },
          }}
          pageSizeOptions={[minPageSize, maxPageSize]}
          checkboxSelection
          localeText={spanishLocaleText}
          density="comfortable"
          rowSelectionModel={rowSelection}
          onRowSelectionModelChange={handleSelectionChange}
          slots={{
            toolbar: CustomToolbar,
          }}
          disableRowSelectionOnClick
          sx={{
            height: "100%",
            width: "100%",
            '& .MuiDataGrid-root': {
              border: 'none',
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #e0e0e0',
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#f5f5f5',
              borderBottom: '2px solid #e0e0e0',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: '#f8f9fa',
            },
            '& .MuiDataGrid-row.Mui-selected': {
              backgroundColor: '#e3f2fd',
            },
            '& .MuiDataGrid-row.Mui-selected:hover': {
              backgroundColor: '#bbdefb',
            },
          }}
        />
      </Paper>

      <EditForm
        open={open}
        handleClose={handleClose}
        dataUser={dataUser}
        handleEditUser={newUserToAdd ? handleCreateUser : (user: Partial<User>) => handleEditUser(user as User)}
        newUser={newUserToAdd}
      />

      <CustomModal
        open={failedOpen}
        onClose={handleCloseModal}
        onAccept={handleAcceptModal}
        title="Previsiones falladas"
        description={descriptionModal}
      />

      {/* Diálogo de Ventas Externas */}
      <Dialog
        open={openSalesDialog}
        onClose={handleSalesCancel}
        maxWidth="md"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: 3,
            minHeight: 500,
            maxHeight: '80vh',
            overflow: 'hidden'
          }
        }}
        disableEscapeKeyDown
      >
        <DialogTitle sx={{
          bgcolor: 'primary.main',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 2
        }}>
          <AttachMoney />
          <Typography variant="subtitle1">
            Cargar Ventas Externas
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ p: 3, pt: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Complete los datos de ventas externas para cada usuario seleccionado
          </Alert>

          <Stack spacing={3}>
            {usersToLoadSales.map((userId) => {
              const user = users.find(u => u.id === userId);
              const userData = externalSalesData.find(data => data.userId === userId) || { userId, venta: "", iva: "" };
              const userErrors = externalSalesErrors[userId] || {};

              if (!user) return null;

              return (
                <Paper key={userId} elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle1" gutterBottom sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    color: 'primary.main',
                    fontWeight: 'bold',
                    mb: 2
                  }}>
                    <Chip
                      label={user.id}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    {user.is_company ? user.company_name : user.real_name} ({formatOutPutCuit(user)})
                  </Typography>

                  <Stack direction="row" spacing={2}>
                    <TextField
                      fullWidth
                      label="Venta a considerar"
                      placeholder="Venta a considerar"
                      value={userData.venta}
                      onChange={(e) => handleExternalSalesInputChange(userId, "venta", e.target.value)}
                      error={!!userErrors.venta}
                      helperText={userErrors.venta}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <AttachMoney color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />

                    <FormControl fullWidth>
                      <InputLabel>IVA</InputLabel>
                      <Select
                        value={userData.iva || "21"}
                        onChange={(e) => handleExternalSalesInputChange(userId, "iva", e.target.value)}
                        label="IVA"
                        error={!!userErrors.iva}

                      >
                        <MenuItem value="21">21%</MenuItem>
                        <MenuItem value="10.5">10.5%</MenuItem>
                        <MenuItem value="27">27%</MenuItem>
                        <MenuItem value="0">0%</MenuItem>
                      </Select>
                      {userErrors.iva && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                          {userErrors.iva}
                        </Typography>
                      )}
                    </FormControl>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1, gap: 2 }}>
          <Button
            onClick={handleSalesCancel}
            variant="outlined"
            color="error"
            size="large"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleExternalSalesSubmit}
            variant="contained"
            color="primary"
            startIcon={<PlayCircleFilledOutlined />}
            size="large"
          >
            Continuar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Reiniciar Server */}
      <Dialog
        open={openDialog}
        onClose={handleCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        disableEscapeKeyDown
      >
        <DialogTitle id="alert-dialog-title">
          Confirmar Acción
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            ¿Seguro que quieres reiniciar el servidor?
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

      {/* Diálogo de Redeploy Server */}
      <Dialog
        open={openDialogRedeploy}
        onClose={handleCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Confirmar Acción
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            ¿Seguro que quieres hacer un redeploy del servidor?
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
    </>
  );
};

export default UsersTable;
