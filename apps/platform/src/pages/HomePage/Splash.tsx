import { styled } from "@mui/material/styles";

import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import { Engine } from "tsparticles-engine";

import { particlesConfig } from "@ot/constants";

const StyledContainer = styled("div")({
  height: "100vh",
});

const StyledParticles = styled(Particles)(({ theme }) => ({
  position: "absolute",
  left: 0,
  top: 0,
  backgroundColor: theme.palette.primary.dark,
  width: "100%",
  height: "100%",
  zIndex: -1,
}));

function Splash(): JSX.Element {
  const particlesInit = async (main: Engine): Promise<void> => {
    await loadFull(main);
  };

  return (
    <StyledContainer>
      <StyledParticles id="tsparticles" init={particlesInit} options={particlesConfig} />
    </StyledContainer>
  );
}

export default Splash;
