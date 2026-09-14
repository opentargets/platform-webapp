import { Collapse, GridLegacy, Grow, Skeleton } from "@mui/material";

function GlobalSearchLoadingState() {
  const listItemsToShow = new Array<number>(4).fill(0);
  return (
    <Collapse appear in>
      <div>
        <GridLegacy
          container
          justifyContent="flex-start"
          alignItems="center"
          style={{ padding: 20 }}
        >
          <GridLegacy
            container
            justifyContent="flex-start"
            alignItems="center"
            style={{
              marginBottom: "1rem",
            }}
          >
            <Skeleton animation="wave" variant="circular" width="2rem" height="2rem" />
            <Skeleton variant="text" animation="wave" width="10vw" height="3vh" />
          </GridLegacy>
          {listItemsToShow.map((_item, index) => (
            <GridLegacy
              key={index}
              container
              justifyContent="flex-start"
              alignItems="center"
              style={{
                borderTop: "0.1px solid #60606033",
                padding: "1rem",
              }}
            >
              <GridLegacy container justifyContent="space-between" className="name-container">
                <Skeleton animation="wave" width="20vw" height="2vh" />
                <Skeleton animation="wave" width="6vw" height="1vh" />
              </GridLegacy>
              <GridLegacy className="author-container">
                <Skeleton animation="wave" width="15vw" height="2vh" />
              </GridLegacy>
            </GridLegacy>
          ))}
        </GridLegacy>
      </div>
    </Collapse>
  );
}

export default GlobalSearchLoadingState;
