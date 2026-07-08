import { useQuery } from "@apollo/client";
import { SectionItem } from "ui";
import { Box, Grid } from "@mui/material";
import Description from "./Description";
import { definition } from ".";
import { getUniprotIds } from "@ot/utils";
import MOLECULAR_STRUCTURE_QUERY from "./MolecularStructure.gql";
import { useState, useEffect } from "react";
import Table from "./Table";
import Viewer from "./Viewer";
import { getSegments, restructureRowProperties } from "./helpers";
import type { TargetBodyProps } from "@ot/constants";

const experimentalResultsStem = "https://rest.uniprot.org/uniprotkb/";
const alphaFoldResultsStem = "https://alphafold.ebi.ac.uk/api/prediction/";

type Props = TargetBodyProps;

function Body({ id: ensemblId, label: symbol, entity }: Props) {
  const [rowResults, setRowResults] = useState(null);
  const [segments, setSegments] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const variables = { ensemblId };
  const request = useQuery(MOLECULAR_STRUCTURE_QUERY, {
    variables,
  });

  const uniprotId = request?.data?.target
    ? getUniprotIds(request?.data?.target?.proteinIds)?.[0]
    : null;

  // fetch alphaFold and experimental results
  useEffect(() => {
    const results = [];
    async function fetchAlphaFoldResults() {
      if (uniprotId) {
        try {
          const response = await fetch(`${alphaFoldResultsStem}${uniprotId}`);
          if (!response.ok) {
            console.error(`Response status (AlphaFold request): ${response.status}`);
          } else {
            const json = await response.json();
            if (json.length > 0) {
              results.unshift({
                id: json[0].entryId,
                database: "AlphaFold",
                properties: {
                  chains: `A=${json[0].uniprotStart}-${json[0].uniprotEnd}`,
                  method: "Prediction",
                  resolution: undefined,
                },
              });
            }
          }
        } catch (error) {
          console.error(error.message);
        }
      }
    }
    async function fetchExperimentalResults() {
      if (uniprotId) {
        try {
          const response = await fetch(`${experimentalResultsStem}${uniprotId}`);
          if (!response.ok) {
            console.error(`Response status (PDB request): ${response.status}`);
          } else {
            const json = await response.json();
            const pdbResults = json?.uniProtKBCrossReferences?.filter(row => row.database === "PDB") ?? [];
            for (const row of pdbResults) restructureRowProperties(row);
            results.push(...pdbResults);
          }
        } catch (error) {
          console.error(error.message);
        }
      }
    }
    async function fetchAllResults() {
      await Promise.allSettled([fetchAlphaFoldResults(), fetchExperimentalResults()]);
      if (results.length) {
        const _segments = {};
        for (const row of results) {
          _segments[row.id] = getSegments(row.properties.chains);
        }
        setSegments(_segments);
        results.sort((a, b) => {
          // sort to match initial sort of table
          return _segments?.[b?.id]?.maxLengthSegment - _segments?.[a?.id]?.maxLengthSegment;
        });
      }
      setRowResults(results);
      setSelectedRow(results[0]);
    }
    fetchAllResults();
    return () => {
      setRowResults(null);
      setSegments(null);
      setSelectedRow(null);
    };
  }, [uniprotId]);

  if (!uniprotId) return null;

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      renderDescription={() => <Description symbol={symbol} />}
      renderBody={() => {
        if (!rowResults) return <NoRows>Fetching structure data for {uniprotId}</NoRows>;

        if (rowResults.length === 0) return <NoRows>No structure available for {uniprotId}</NoRows>;

        return (
          <Grid container columnSpacing={2}>
            <Grid item xs={12} lg={6}>
              <Table
                rows={rowResults}
                segments={segments}
                uniprotId={uniprotId}
                setSelectedRow={setSelectedRow}
                request={request}
                query={MOLECULAR_STRUCTURE_QUERY.loc.source.body}
                variables={variables}
              />
            </Grid>
            <Grid item xs={12} lg={6}>
              {rowResults && (
                <Viewer ensemblId={ensemblId} selectedRow={selectedRow} segments={segments} />
              )}
            </Grid>
          </Grid>
        );
      }}
    />
  );
}

function NoRows({ children }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", fontStyle: "italic" }}>{children}</Box>
  );
}

export default Body;
