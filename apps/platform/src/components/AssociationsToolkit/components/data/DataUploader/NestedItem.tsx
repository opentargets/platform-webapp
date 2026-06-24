import { ReactNode, useState } from "react";
import { List, FormControlLabel, Checkbox, Box } from "@mui/material";

interface Hit {
  id: string;
  name?: string;
  checked: boolean;
}

function LABEL_ELEMENT(children: ReactNode) {
  return (
    <Box sx={{ typography: "body2", fontWeight: "bold" }} display="inline">
      {children}
    </Box>
  );
}

interface NestedItemProps {
  children: ReactNode;
  hits: Hit[];
  term: string;
  handleParentChange: (term: string) => void;
  handleChangeChildCheckbox: (id: string) => void;
}

const NestedItem = ({
  children,
  hits,
  term,
  handleParentChange,
  handleChangeChildCheckbox,
}: NestedItemProps) => {
  const [childrenCheckbox, setChildrenCheckbox] = useState<Hit[]>(hits);
  return (
    <List sx={{ mx: 1.5 }}>
      {childrenCheckbox.length === 1 && (
        <>
          {childrenCheckbox.map(hit => (
            <Box key={hit.id}>
              <FormControlLabel
                label={
                  <>
                    {" "}
                    {LABEL_ELEMENT(children)} - {hit.name || hit.id}{" "}
                  </>
                }
                control={
                  <Checkbox
                    checked={hit.checked}
                    onChange={() => handleChangeChildCheckbox(hit.id)}
                  />
                }
              />
            </Box>
          ))}
        </>
      )}

      {childrenCheckbox.length > 1 && (
        <>
          <FormControlLabel
            label={LABEL_ELEMENT(children)}
            control={
              <Checkbox
                indeterminate={
                  childrenCheckbox.some(el => el.checked) &&
                  !childrenCheckbox.every(el => el.checked)
                }
                checked={childrenCheckbox.every(el => el.checked)}
                onChange={() => handleParentChange(term)}
              />
            }
          />
          {childrenCheckbox.map(hit => (
            <Box sx={{ ml: theme => theme.spacing(4) }} key={hit.id}>
              <FormControlLabel
                label={hit.name || hit.id}
                control={
                  <Checkbox
                    checked={hit.checked}
                    onChange={() => handleChangeChildCheckbox(hit.id)}
                  />
                }
              />
            </Box>
          ))}
        </>
      )}
      {childrenCheckbox.length <= 0 && (
        <>
          <FormControlLabel
            label={LABEL_ELEMENT(children)}
            control={<Checkbox checked={false} disabled />}
          />
        </>
      )}
    </List>
  );
};

export default NestedItem;
