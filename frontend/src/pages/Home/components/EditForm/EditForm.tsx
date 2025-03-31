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
} from "@mui/material";
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

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!user.username) {
      newErrors.username = "El nombre es obligatorio";
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
      const { id, ...newUser } = user;
      handleEditUser(newUser);
      handleClose();
    }
  };

  return (
    <Dialog open={open} aria-labelledby="form-dialog-title">
      <DialogTitle id="form-dialog-title">
        {" "}
        {newUser ? "Crear Persona" : "Editar Persona"}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="username"
          name="username"
          label="CUIT"
          type="text"
          value={user.username}
          onChange={handleInputChange}
          fullWidth
          error={!!errors.username}
          helperText={errors.username}
        />
        <TextField
          margin="dense"
          id="password"
          name="password"
          label="Contraseña"
          type={showPassword ? "text" : "password"}
          fullWidth
          value={user.password}
          onChange={handleInputChange}
          onMouseEnter={() => setShowPassword(true)}
          onMouseLeave={() => setShowPassword(false)}
          error={!!errors.password}
          helperText={errors.password}
        />
        <FormControl component="fieldset">
          <FormLabel component="legend">¿Es Empresa?</FormLabel>
          <RadioGroup
            row
            aria-label="is-company"
            name="is-company"
            value={isCompany.toString()}
            onChange={handleRadioChange}
          >
            <FormControlLabel value="true" control={<Radio />} label="Sí" />
            <FormControlLabel value="false" control={<Radio />} label="No" />
          </RadioGroup>
        </FormControl>
        <TextField
          margin="dense"
          id="company_name"
          name="company_name"
          label="Nombre Empresa"
          type="text"
          value={user.company_name}
          onChange={handleInputChange}
          fullWidth
          error={!!errors.company_name}
          helperText={errors.company_name}
          disabled={!isCompany}
        />
        <TextField
          margin="dense"
          id="cuit_company"
          name="cuit_company"
          label="Cuit Empresa"
          type="text"
          value={user.cuit_company}
          onChange={handleInputChange}
          fullWidth
          error={!!errors.cuit_company}
          helperText={errors.cuit_company}
          disabled={!isCompany}
        />
        <TextField
          margin="dense"
          id="real_name"
          name="real_name"
          label="Persona Física"
          type="text"
          value={user.real_name}
          onChange={handleInputChange}
          fullWidth
          error={!!errors.real_name}
          helperText={errors.real_name}
        />
      </DialogContent>
      <DialogActions
        sx={{
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Button onClick={handleClose} color="error">
          Cancelar
        </Button>
        <Button onClick={handleSubmit} color="success">
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditForm;
