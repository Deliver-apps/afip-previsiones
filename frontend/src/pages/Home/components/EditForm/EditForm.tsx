import React, { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  Paper,
  Stack,
  Box,
  Chip,
  IconButton,
  InputAdornment,
  Alert,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Person,
  Business,
  VpnKey,
  AccountCircle,
} from "@mui/icons-material";
import { User } from "@src/models";
import { addDataUser } from "@src/service/supabase";

interface EditFormProps {
  open: boolean;
  handleClose: () => void;
  handleEditUser: (user: Partial<User>) => void;
  dataUser: User;
  newUser?: boolean;
}

const EditForm: React.FC<EditFormProps> = ({
  open,
  handleClose,
  dataUser,
  handleEditUser,
  newUser,
}) => {
  const [user, setUser] = useState<User>({
    id: 0,
    username: "",
    password: "",
    is_company: false,
    company_name: "",
    real_name: "",
    cuit_company: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isCompany, setIsCompany] = useState<boolean>(dataUser.is_company);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (open) {
      setUser(dataUser);
      setIsCompany(dataUser.is_company);
      setErrors({});
    }
  }, [open, dataUser]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setUser((prevUser) => ({
      ...prevUser,
      [name]: value,
    }));
  };

  const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value === "true";
    setIsCompany(value);
    setUser((prevUser) => ({
      ...prevUser,
      is_company: value,
    }));
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!user.username) {
      newErrors.username = "El CUIT es obligatorio";
    }
    if (!user.password) {
      newErrors.password = "La contraseña es obligatoria";
    }
    if (!user.real_name) {
      newErrors.real_name = "El nombre de la persona física es obligatorio";
    }
    if (isCompany) {
      if (!user.company_name) {
        newErrors.company_name = "El nombre de la empresa es obligatorio";
      }
      if (!user.cuit_company) {
        newErrors.cuit_company = "El CUIT de la empresa es obligatorio";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate() && !newUser) {
      handleEditUser(user);
      handleClose();
    } else if (newUser && validate()) {
      const { id, ...newUserData } = user;
      handleEditUser(newUserData);
      handleClose();
    }
  };

  const formatCuit = (cuit: string) => {
    if (!cuit) return "";
    return cuit.replace(/(\d{2})(\d{8})(\d{1})/, "$1-$2-$3");
  };

  return (
    <Dialog 
      open={open} 
      maxWidth="md"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: 3,
          minHeight: 600,
          maxHeight: '90vh',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{
        bgcolor: 'primary.main',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 2
      }}>
        {newUser ? <Person /> : <AccountCircle />}
        <Typography variant="h6">
          {newUser ? "Crear Usuario" : "Editar Usuario"}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 3, pt: 2 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          Complete todos los campos obligatorios para {newUser ? "crear" : "editar"} el usuario
        </Alert>

        <Stack spacing={3}>
          {/* Tipo de Usuario */}
          <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              color: 'primary.main',
              fontWeight: 'bold'
            }}>
              {isCompany ? <Business /> : <Person />}
              Tipo de Usuario
            </Typography>
            
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend" sx={{ mb: 1 }}>
                ¿Es Empresa?
              </FormLabel>
              <RadioGroup
                row
                aria-label="is-company"
                name="is-company"
                value={isCompany.toString()}
                onChange={handleRadioChange}
              >
                <FormControlLabel 
                  value="true" 
                  control={<Radio color="primary" />} 
                  label="Empresa" 
                />
                <FormControlLabel 
                  value="false" 
                  control={<Radio color="primary" />} 
                  label="Persona Física" 
                />
              </RadioGroup>
            </FormControl>
          </Paper>

          {/* Información Básica */}
          <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              color: 'primary.main',
              fontWeight: 'bold'
            }}>
              <VpnKey />
              Información de Acceso
            </Typography>
            
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="CUIT"
                placeholder="Ej: 20123456789"
                value={user.username}
                onChange={handleInputChange}
                name="username"
                error={!!errors.username}
                helperText={errors.username || formatCuit(user.username)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Chip label="CUIT" size="small" color="primary" variant="outlined" />
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField
                fullWidth
                label="Contraseña"
                placeholder="Ingrese la contraseña"
                type={showPassword ? "text" : "password"}
                value={user.password}
                onChange={handleInputChange}
                name="password"
                error={!!errors.password}
                helperText={errors.password}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <VpnKey color="primary" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>
          </Paper>

          {/* Información Personal/Empresa */}
          <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              color: 'primary.main',
              fontWeight: 'bold'
            }}>
              {isCompany ? <Business /> : <Person />}
              {isCompany ? "Información de Empresa" : "Información Personal"}
            </Typography>
            
            <Stack spacing={2}>
              {isCompany ? (
                <>
                  <TextField
                    fullWidth
                    label="Nombre de la Empresa"
                    placeholder="Nombre de la empresa"
                    value={user.company_name}
                    onChange={handleInputChange}
                    name="company_name"
                    error={!!errors.company_name}
                    helperText={errors.company_name}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Business color="primary" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  
                  <TextField
                    fullWidth
                    label="CUIT de la Empresa"
                    placeholder="Ej: 30712345678"
                    value={user.cuit_company}
                    onChange={handleInputChange}
                    name="cuit_company"
                    error={!!errors.cuit_company}
                    helperText={errors.cuit_company || formatCuit(user.cuit_company ?? "")}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Chip label="CUIT Empresa" size="small" color="primary" variant="outlined" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </>
              ) : (
                <TextField
                  fullWidth
                  label="Nombre Completo"
                  placeholder="Nombre y apellido"
                  value={user.real_name}
                  onChange={handleInputChange}
                  name="real_name"
                  error={!!errors.real_name}
                  helperText={errors.real_name}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            </Stack>
          </Paper>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1, gap: 2 }}>
        <Button 
          onClick={handleClose} 
          variant="outlined"
          color="error"
          size="large"
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          color="primary"
          size="large"
        >
          {newUser ? "Crear" : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditForm;
