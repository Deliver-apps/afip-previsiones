import { useState, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { AppDispatch } from "@src/redux/store";
import { Image, Footer } from "./components";
import { login } from "@src/redux/states";
import imageLogin from "@src/assets/logo.png";

interface FormField {
  id: number;
  label: string;
  required: boolean;
  model: string;
  type?: string;
}

const Login: React.FC = () => {
  const [status, setStatus] = useState<{ valid: boolean }>({ valid: true });
  const [formFields, setFormFields] = useState<FormField[]>([
    { id: 1, label: "Usuario", required: true, model: "" },
    { id: 2, label: "Contraseña", required: true, model: "", type: "password" },
  ]);
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [disabled, setDisabled] = useState(false);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    id: number
  ) => {
    setFormFields(
      formFields.map((field) =>
        field.id === id ? { ...field, model: e.target.value } : field
      )
    );
  };

  const loginHandler = async () => {
    setStatus({ valid: true });
    setDisabled(true);
    const resultAction = await dispatch(login(formFields));

    if (login.fulfilled.match(resultAction)) {
      navigate("/home");
    } else {
      setStatus({ valid: false });
    }
    setDisabled(false);
  };

  return (
    <Container maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Image imageSrc={imageLogin} cover={true} />
        <Box component="form" onSubmit={loginHandler} noValidate sx={{ mt: 1 }}>
          {formFields.map((field) => (
            <TextField
              key={field.id}
              margin="normal"
              fullWidth
              label={field.label}
              type={field.type ?? "text"}
              value={field.model}
              InputLabelProps={{ shrink: true }}
              onChange={(e) => handleInputChange(e, field.id)}
              error={!status.valid && field.required && !field.model}
              helperText={
                !status.valid && field.required && !field.model
                  ? "Este campo es requerido"
                  : ""
              }
            />
          ))}
          {!status.valid && (
            <Typography variant="body2" color="error" align="center">
              Usuario o contraseña incorrectos
            </Typography>
          )}
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={loginHandler}
            sx={{ mt: 3, mb: 2 }}
            disabled={disabled}
          >
            Iniciar sesión
          </Button>
        </Box>
      </Box>
      <Footer />
    </Container>
  );
};

export default Login;
