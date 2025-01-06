import AccountCircle from "@mui/icons-material/AccountCircle";
import MoreIcon from "@mui/icons-material/MoreVert";
import { Tab, Tabs } from "@mui/material";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { logout } from "@src/redux/states";
import { AppDispatch } from "@src/redux/store";
import * as React from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

export default function PrimarySearchAppBar() {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [mobileMoreAnchorEl, setMobileMoreAnchorEl] =
    React.useState<null | HTMLElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [value, setValue] = React.useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    console.log(newValue);
    // Example: Navigate when tab changes
    switch (newValue) {
      case 0:
        navigate("/home"); // “Home”
        break;
      case 1:
        navigate("/veps"); // “Veps”
        break;
      case 2:
        navigate("/analytics"); // “Analytics”
        break;
      case 3:
        navigate("/reports"); // “Reports”
        break;
      default:
        break;
    }
  };

  React.useEffect(() => {
    if (location.pathname.startsWith("/home")) {
      setValue(0);
    } else if (location.pathname.startsWith("/veps")) {
      setValue(1);
    } else if (location.pathname.startsWith("/analytics")) {
      setValue(2);
    } else if (location.pathname.startsWith("/reports")) {
      setValue(3);
    }
  }, [location.pathname]);

  const isMenuOpen = Boolean(anchorEl);
  const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMoreAnchorEl(null);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    dispatch(logout());
    navigate("/login");
    handleMobileMenuClose();
  };

  const clickeOut = () => {
    setAnchorEl(null);
    handleMobileMenuClose();
  };

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMoreAnchorEl(event.currentTarget);
  };

  const menuId = "primary-search-account-menu";
  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      id={menuId}
      keepMounted
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      open={isMenuOpen}
      onClose={clickeOut}
    >
      <MenuItem onClick={handleMenuClose}>LogOut</MenuItem>
    </Menu>
  );

  const mobileMenuId = "primary-search-account-menu-mobile";
  const renderMobileMenu = (
    <Menu
      anchorEl={mobileMoreAnchorEl}
      anchorOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      id={mobileMenuId}
      keepMounted
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      open={isMobileMenuOpen}
      onClose={handleMobileMenuClose}
    >
      <MenuItem onClick={handleProfileMenuOpen}>
        <IconButton
          size="large"
          aria-label="account of current user"
          aria-controls="primary-search-account-menu"
          aria-haspopup="true"
          color="inherit"
        >
          <AccountCircle />
        </IconButton>
        <p>Profile</p>
      </MenuItem>
    </Menu>
  );

  return (
    <Box sx={{ flexGrow: 1, width: "100vw", margin: 0, padding: 0 }}>
      <AppBar
        position="static"
        sx={{ margin: 0, padding: 0, boxShadow: "none", width: "100%" }}
      >
        <Toolbar sx={{ paddingLeft: 0, paddingRight: 0 }}>
          <Typography
            variant="h5"
            noWrap
            component="div"
            sx={{
              display: { xs: "none", sm: "block" },
              cursor: "pointer",
              hover: "",
            }}
            onClick={() => navigate("/home")}
          >
            Previsiones
          </Typography>
          <Tabs
            value={value}
            onChange={(event, newValue) => handleTabChange(event, newValue)}
            textColor="inherit"
            indicatorColor="secondary"
            sx={{ ml: 20 }} // small left margin
          >
            <Tab label={<Typography variant="body1">Home</Typography>} />
            <Tab label={<Typography variant="body1">Veps</Typography>} />
            <Tab label={<Typography variant="body1">Analytics</Typography>} />
            <Tab label={<Typography variant="body1">Reports</Typography>} />
          </Tabs>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: { xs: "none", md: "flex" } }}>
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls={menuId}
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
          </Box>
          <Box sx={{ display: { xs: "flex", md: "none" } }}>
            <IconButton
              size="large"
              aria-label="show more"
              aria-controls={mobileMenuId}
              aria-haspopup="true"
              onClick={handleMobileMenuOpen}
              color="inherit"
            >
              <MoreIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      {renderMobileMenu}
      {renderMenu}
    </Box>
  );
}
