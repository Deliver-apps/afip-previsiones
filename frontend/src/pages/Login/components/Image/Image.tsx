import React from "react";
import Box from "@mui/material/Box";

interface ImageProps {
  imageSrc: string;
  cover?: boolean;
  contain?: boolean;
}

const Image: React.FC<ImageProps> = ({
  imageSrc,
  cover = false,
  contain = false,
}) => {
  return (
    <Box
      component="img"
      src={imageSrc}
      sx={{
        objectFit: cover ? "cover" : contain ? "contain" : "none",
        width: "50%",
        height: "50%",
      }}
    />
  );
};

export default Image;
