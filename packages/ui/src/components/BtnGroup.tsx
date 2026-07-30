import { Box, Divider } from "@mui/material";
import { type ReactNode, useState } from "react";
import { v1 } from "uuid";

export type singleBtnGroupObj = {
  title: string;
  component: ReactNode;
};

type BtnGroupPropType = {
  btnGroup: Record<string, singleBtnGroupObj>;
  defaultActiveId?: string;
};

function BtnGroup({ btnGroup, defaultActiveId }: BtnGroupPropType) {
  const defaultId = defaultActiveId || Object.keys(btnGroup)[0];
  const [activeId, setActiveId] = useState(defaultId);

  function setActiveTab(e) {
    setActiveId(e);
  }

  return (
    <Box sx={{ border: (theme) => `1px solid ${theme.palette.grey[400]}`, borderRadius: 3 }}>
      <Box sx={{ paddingX: 1 }}>
        {Object.keys(btnGroup).map((e) => (
          <Box
            component="button"
            sx={{
              background: "none",
              border: "none",
              borderBottom: "2px solid transparent",
              cursor: "pointer",
              paddingTop: 1,
              paddingBottom: 1,
              marginX: 1,
              typography: "subtitle2",
              transition: "all ease 200ms",
              color: (theme) => `${theme.palette.grey[700]}`,
              "&:hover": {
                borderBottom: (theme) => `2px solid ${theme.palette.grey[500]}`,
              },
              ...(activeId === e && {
                borderBottom: (theme) => `2px solid ${theme.palette.primary.dark}`,
                color: (theme) => `${theme.palette.primary.dark}`,
              }),
            }}
            onClick={() => setActiveTab(e)}
            key={v1()}
          >
            {btnGroup[e].title}
          </Box>
        ))}
      </Box>
      <Divider />
      <Box>{btnGroup[activeId].component}</Box>
    </Box>
  );
}
export default BtnGroup;
