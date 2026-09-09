import { Box, Tabs } from "@mui/material";
import { Children, cloneElement, Suspense } from "react";
import { generatePath, Route, Routes, useMatch, useNavigate } from "react-router";
import { v1 } from "uuid";
import LoadingBackdrop from "../LoadingBackdrop";

function RoutingTabs({ children }) {
  const match = useMatch();
  const history = useNavigate();
  const routes = [];

  const preparedChildren = Children.map(children, (child) => {
    // Prepares routes for the tabs.
    if (child.props.component) {
      routes.push({
        path: child.props.path,
        exact: child.props.exact,
        component: child.props.component,
      });
    }

    // Adds value prop for the tab highlight.
    return cloneElement(child, {
      value: generatePath(child.props.path, match.params),
    });
  });

  return (
    <>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={history.location.pathname}>{preparedChildren}</Tabs>
      </Box>
      <Suspense fallback={<LoadingBackdrop />}>
        <Routes>
          {routes.map((route, index) => (
            <Route
              // First tab will always be the root page.
              exact={index === 0}
              key={v1()}
              path={route.path}
              component={route.component}
            />
          ))}
        </Routes>
      </Suspense>
    </>
  );
}

export default RoutingTabs;
