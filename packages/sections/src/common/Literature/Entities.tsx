import { styled } from "@mui/material/styles";
import { useLiterature, useLiteratureDispatch } from "./LiteratureContext";
import { fetchSimilarEntities, literatureStateFromResponse, similarEntityLabel } from "./requests";
import { useApolloClient, Grow, Chip } from "ui";
import type { SimilarEntity } from "./types";

const StyledChipRow = styled("div")(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  "& > *": {
    margin: `${theme.spacing(0.5)} !important`,
  },
}));

function EntitiesToSelect({ id }: { id: string }) {
  const literature = useLiterature();
  const { entities, selectedEntities: selectedChips, loadingEntities } = literature;
  const literatureDispatch = useLiteratureDispatch();
  const client = useApolloClient();

  const handleSelectChip = async (e: SimilarEntity & { object: NonNullable<SimilarEntity["object"]> }) => {
    const {
      query,
      id: bibliographyId,
      category,
      globalEntity,
      pageSize,
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
          name: similarEntityLabel(e.object),
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
      pageSize,
      endYear,
      endMonth,
      startYear,
      startMonth,
    });
    literatureDispatch({
      type: "stateUpdate",
      value: { ...literatureStateFromResponse(request.data[globalEntity ?? ""]), loadingEntities: false },
    });
  };

  const isSelectable = (entity: SimilarEntity & { object: NonNullable<SimilarEntity["object"]> }) =>
    id !== entity.object.id && !selectedChips.some(s => s.object.id === entity.object.id);

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
            size="medium"
          />
        </Grow>
      );
    const object = e.object;
    const selectable = { ...e, object };
    return isSelectable(selectable) ? (
      <Grow in key={object.id}>
        <Chip
          style={{ opacity: loadingEntities ? 0.5 : 1 }}
          label={similarEntityLabel(object)}
          disabled={loadingEntities}
          clickable
          onClick={() => {
            handleSelectChip(selectable);
          }}
          title={`Score: ${e.score} ID: ${object.id}`}
          color="primary"
          variant="outlined"
          size="medium"
        />
      </Grow>
    ) : null;
  });
}

export default function Entities({ name, id }: { name: string; id: string }) {
  const literature = useLiterature();
  const { selectedEntities: selectedChips, loadingEntities } = literature;
  const literatureDispatch = useLiteratureDispatch();
  const client = useApolloClient();

  const handleDeleteChip = async (index: number) => {
    const {
      query,
      id: bibliographyId,
      category,
      globalEntity,
      pageSize,
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
      pageSize,
      endYear,
      endMonth,
      startYear,
      startMonth,
    });
    literatureDispatch({
      type: "stateUpdate",
      value: { ...literatureStateFromResponse(request.data[globalEntity ?? ""]), loadingEntities: false },
    });
  };

  return (
    <div>
      <StyledChipRow>
        <Chip label={name} title={`ID: ${id}`} color="primary" variant="filled" size="medium" />
        {selectedChips.map((e, i) => (
          <Grow in key={e.object.id}>
            <Chip
              label={e.object.name}
              title={`Score: ${e.score} ID: ${e.object.id}`}
              color="primary"
              variant="filled"
              size="medium"
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
      </StyledChipRow>
      <StyledChipRow>
        <EntitiesToSelect id={id} />
      </StyledChipRow>
    </div>
  );
}
