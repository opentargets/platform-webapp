import { Chip, Grow } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { useLiterature, useLiteratureDispatch } from "./LiteratureContext";
import { fetchSimilarEntities } from "./requests";
import { useApolloClient } from "ui";

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
    "& > *": {
      margin: `${theme.spacing(0.5)} !important`,
    },
  },
  loadingContainer: {
    display: "flex",
    margin: "10px",
  },
}));

function EntitiesToSelect({ id }) {
  const literature = useLiterature();
  const { entities, selectedEntities: selectedChips, loadingEntities } = literature;
  const literatureDispatch = useLiteratureDispatch();
  const client = useApolloClient();

  const handleSelectChip = async e => {
    const {
      query,
      id: bibliographyId,
      category,
      globalEntity,
      endYear,
      endMonth,
      startYear,
      startMonth,
    } = literature;
    const newChips = [
      ...selectedChips,
      {
        score: e.score,
        object: {
          name: e.object.name || e.object.approvedSymbol,
          id: e.object.id,
        },
      },
    ];
    literatureDispatch({ type: "selectedEntities", value: newChips });
    literatureDispatch({ type: "loadingEntities", value: true });
    const request = await fetchSimilarEntities({
      client,
      query,
      id: bibliographyId,
      category,
      entities: newChips,
      endYear,
      endMonth,
      startYear,
      startMonth,
    });
    const data = request.data[globalEntity];
    const update = {
      entities: data.similarEntities,
      litsIds: data.literatureOcurrences?.rows?.map(({ pmid }) => pmid),
      litsCount: data.literatureOcurrences?.filteredCount,
      earliestPubYear: data.literatureOcurrences?.earliestPubYear,
      cursor: data.literatureOcurrences?.cursor,
      loadingEntities: false,
      page: 0,
    };
    literatureDispatch({ type: "stateUpdate", value: update });
  };

  const validateEntity = entity => {
    if (id === entity.object?.id) return null;
    if (selectedChips.find(s => s.object.id === entity.object.id)) return null;
    return entity;
  };

  return entities.map(e => {
    if (!e.object)
      return (
        <Grow in key={`empty-entity-${e.id}`}>
          <Chip
            style={{ opacity: loadingEntities ? 0.5 : 1 }}
            label={e.id}
            disabled
            title="Missing object entity"
            color="secondary"
            variant="outlined"
          />
        </Grow>
      );
    return validateEntity(e) ? (
      <Grow in key={e.object.id}>
        <Chip
          style={{ opacity: loadingEntities ? 0.5 : 1 }}
          label={e.object.name || e.object.approvedSymbol}
          disabled={loadingEntities}
          clickable
          onClick={() => {
            handleSelectChip(e);
          }}
          title={`Score: ${e.score} ID: ${e.object.id}`}
          color="primary"
          variant="outlined"
        />
      </Grow>
    ) : null;
  });
}

export default function Entities({ name, id }) {
  const classes = useStyles();
  const literature = useLiterature();
  const { selectedEntities: selectedChips, loadingEntities } = literature;
  const literatureDispatch = useLiteratureDispatch();
  const client = useApolloClient();

  const handleDeleteChip = async index => {
    const {
      query,
      id: bibliographyId,
      category,
      globalEntity,
      endYear,
      endMonth,
      startYear,
      startMonth,
    } = literature;
    const newChips = [...selectedChips.slice(0, index), ...selectedChips.slice(index + 1)];
    literatureDispatch({ type: "selectedEntities", value: newChips });
    literatureDispatch({ type: "loadingEntities", value: true });
    const request = await fetchSimilarEntities({
      client,
      query,
      id: bibliographyId,
      category,
      entities: newChips,
      endYear,
      endMonth,
      startYear,
      startMonth,
    });
    const data = request.data[globalEntity];
    const update = {
      entities: data.similarEntities,
      litsIds: data.literatureOcurrences?.rows?.map(({ pmid }) => pmid),
      litsCount: data.literatureOcurrences?.filteredCount,
      earliestPubYear: data.literatureOcurrences?.earliestPubYear,
      cursor: data.literatureOcurrences?.cursor,
      loadingEntities: false,
      page: 0,
    };
    literatureDispatch({ type: "stateUpdate", value: update });
  };

  return (
    <div>
      <div className={classes.root}>
        <Chip label={name} title={`ID: ${id}`} color="primary" />
        {selectedChips.map((e, i) => (
          <Grow in key={e.object.id}>
            <Chip
              label={e.object.name}
              title={`Score: ${e.score} ID: ${e.object.id}`}
              color="primary"
              clickable
              disabled={loadingEntities}
              onClick={() => {
                handleDeleteChip(i);
              }}
              onDelete={() => {
                handleDeleteChip(i);
              }}
            />
          </Grow>
        ))}
      </div>
      <div className={classes.root}>
        <EntitiesToSelect id={id} />
      </div>
    </div>
  );
}
