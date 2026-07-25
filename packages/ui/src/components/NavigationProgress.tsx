import { LinearProgress } from "@mui/material";
import { useNavigation } from "react-router";

function NavigationProgress() {
  const navigation = useNavigation();

  if (navigation.state === "idle") return null;

  return (
    <LinearProgress
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: theme => theme.zIndex.appBar + 1,
        pointerEvents: "none",
      }}
    />
  );
}

export default NavigationProgress;
