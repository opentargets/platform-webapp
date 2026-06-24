import { ChangeEvent, ReactElement, useEffect, useState } from "react";
import { Checkbox } from "@mui/material";
import { styled } from "@mui/material/styles";

const OTCheckbox = styled(Checkbox)`
  padding: 0;
`;

type RequiredControlProps = {
  id: string;
  handleChangeRequire: (newValue: boolean, id: string) => void;
  checkedValue: boolean;
};

function RequiredControl({
  id,
  handleChangeRequire,
  checkedValue,
}: RequiredControlProps): ReactElement {
  const [displayValue, setDisplayValue] = useState<boolean>(checkedValue);

  const handleChange = (_: ChangeEvent<HTMLInputElement>, newValue: boolean) => {
    setDisplayValue(newValue);
    handleChangeRequire(newValue, id);
  };

  useEffect(() => {
    setDisplayValue(checkedValue);
  }, [checkedValue]);

  return (
    <OTCheckbox 
      data-testid={`required-checkbox-${id}`}
      checked={displayValue} 
      color="primary" 
      onChange={handleChange} 
      name={id} 
    />
  );
}

export default RequiredControl;
