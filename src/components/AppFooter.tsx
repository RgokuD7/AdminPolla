import React from "react";
import { Box, Typography } from "@mui/material";

export const APP_VERSION = "0.1.1";
export const APP_AUTHOR = "Richard Bouryssieres";

interface AppFooterProps {
  sx?: object;
}

export const AppFooter: React.FC<AppFooterProps> = ({ sx }) => {
  return (
    <Box sx={{ textAlign: "center", py: 3, ...sx }}>
      <Typography 
        variant="caption" 
        color="text.secondary" 
        sx={{ 
          fontSize: "0.72rem", 
          fontWeight: 600,
          opacity: 0.75,
          letterSpacing: "0.02em"
        }}
      >
        AdminPolla by {APP_AUTHOR} • v{APP_VERSION}
      </Typography>
    </Box>
  );
};

export default AppFooter;
