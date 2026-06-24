import { ReactElement, useEffect, useState } from "react";
import { Slider } from "@mui/material";
import { styled } from "@mui/material/styles";

const OTSlider = styled(Slider)({
  root: {
    padding: "0 10px !important",
  },
  mark: {
    backgroundColor: "#b8b8b8",
    width: 10,
    height: 1,
    marginLeft: -4,
  },
  valueLabel: {
    zIndex: "9999",
  },
});

type SliderControlPorps = {
  id: string;
  handleChangeSliderCommitted: (newValue: number | number[], id: string) => void;
  value: number;
};

function SliderControll({
  id,
  handleChangeSliderCommitted,
  value,
}: SliderControlPorps): ReactElement {
  const [displayValue, setDisplayValue] = useState<number | number[]>(value);

  const handleChange = (_: Event, newValue: number | number[]) => {
    setDisplayValue(newValue);
  };

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  return (
    <OTSlider
      data-testid={`weight-slider-${id}`}
      size="small"
      orientation="vertical"
      value={displayValue}
      aria-labelledby="vertical-slider"
      min={0}
      max={1.0}
      step={0.1}
      onChange={handleChange}
      onChangeCommitted={(_, newValue) => handleChangeSliderCommitted(newValue, id)}
      marks={[{ value }]}
      valueLabelDisplay="auto"
    />
  );
}

export default SliderControll;
