import React from "react";
import { Modal, Box, Typography, Button } from "@mui/material";

interface CustomModalProps {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
  title: string;
  description: string;
}

const CustomModal: React.FC<CustomModalProps> = ({
  open,
  onClose,
  onAccept,
  title,
  description,
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <Box
        sx={{
          position: "absolute" as const,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 4,
          borderRadius: 1,
        }}
      >
        <Typography id="modal-title" variant="h6" component="h2">
          {title}
        </Typography>
        <Typography id="modal-description" sx={{ mt: 2 }}>
          {description}
        </Typography>
        <Box sx={{ mt: 3, display: "grid" }}>
          <Button variant="contained" color="primary" onClick={onAccept}>
            Aceptar
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default CustomModal;
