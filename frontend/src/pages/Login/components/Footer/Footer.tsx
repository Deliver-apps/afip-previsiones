import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";

const Footer = () => {
  return (
    <footer>
      <Box
        sx={{
          textAlign: "center",
          mt: 4,
          display: "flex",
          alignItems: "end",
          justifyContent: "center",
          fontWeight: "light",
        }}
      >
        <Typography variant="body2" component="strong">
          Powered by{" "}
          <Link
            href="https://dinasoft.tech/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Dinasoft
          </Link>
        </Typography>
      </Box>
    </footer>
  );
};

export default Footer;
