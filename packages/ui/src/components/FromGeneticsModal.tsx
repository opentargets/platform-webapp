import { Modal, Box, Typography, Button, styled } from "@mui/material";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Link } from "ui";

const StyledButton = styled(Button)(({ theme }) => ({
  background: theme.palette.secondary.main,
  color: "#fff",
  "&:hover": {
    background: theme.palette.primary.main,
    color: "#fff",
  },
}));

const FromGeneticsModal = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("from") === "genetics") {
      setOpen(true);
    }
  }, [searchParams]);

  const onClose = () => {
    setOpen(false);
    setSearchParams({});
  };

  return (
    <Modal open={open} onClose={onClose} disableAutoFocus>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          maxWidth: 700,
          py: 4,
          px: 4,
          borderRadius: 2,
          backgroundColor: "#fff",
        }}
      >
        <Typography
          variant="h4"
          component="h2"
          gutterBottom
          mb={3}
          color="secondary.main"
          fontWeight={500}
        >
          Welcome to the merged Open Targets Platform!
        </Typography>
        <Typography variant="body2">
          Open Targets Genetics has been integrated into the Open Targets Platform to create a
          unified resource for human genetic and target discovery information.
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">What&apos;s new:</Typography>
          <Typography variant="body2">
            <ul style={{ listStyleType: "disc", paddingLeft: 20 }}>
              <li>
                Updated genetic analyses with improved quality control and ancestry-specific fine
                mapping
              </li>
              <li>
                Enhanced Locus-to-Gene model with better performance and feature interpretation
              </li>
              <li>Comprehensive variant annotation and state-of-the-art statistical analyses</li>
            </ul>
          </Typography>
        </Box>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2">
            <b>Please note:</b> We have made some changes to the way we process and present our
            genetic analyses.
          </Typography>
        </Box>
        <Box sx={{ mt: 4, mb: 2 }}>
          <Typography variant="body2">
            Need help? Check our{" "}
            <Link newTab external to="https://platform-docs.opentargets.org/">
              documentation
            </Link>{" "}
            or visit the{" "}
            <Link newTab external to="https://community.opentargets.org">
              Open Targets Community
            </Link>{" "}
            for support.
          </Typography>
        </Box>
        <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end" }}>
          <StyledButton onClick={onClose}>Continue to the Open Targets Platform</StyledButton>
        </Box>
      </Box>
    </Modal>
  );
};

export default FromGeneticsModal;
