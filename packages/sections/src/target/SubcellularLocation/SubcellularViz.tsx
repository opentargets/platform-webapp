import { useState, useMemo } from "react";
import { Typography, List, ListItem, Box, Tabs, Tab } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";

import { Link } from "ui";
import { identifiersOrgLink, getUniprotIds } from "@ot/utils";
import SwissBioVis from "./SwissbioViz";
import membraneCodes from "./membrane-codes";
import { Target } from "@ot/constants";

const sources = [
  {
    id: "HPA_main",
    label: "HPA main location",
  },
  {
    id: "HPA_additional",
    label: "HPA additional location",
  },
  {
    id: "HPA_extracellular_location",
    label: "HPA extracellular location",
  },
  {
    id: "uniprot",
    label: "UniProt",
  },
];

// Remove the 'SL-' from a location termSL (e.g. "SL-0097")
// The sib-swissbiopics component (different from what is documented)
// actually doesn't accept the "SL-" part of the term
const parseLocationTerm = (term: string | undefined): string | undefined => term?.substring(3);

// Parse API response and split locations based on sources. Example:
// { HPA_main: [], uniprot: [], }
const parseLocationData = (subcellularLocations: Target["subcellularLocations"]): Record<string, Target["subcellularLocations"]> => {
  const sourcesLocations: Record<string, Target["subcellularLocations"]> = {};
  subcellularLocations
    .filter(sl => sl.termSL)
    .forEach(sl => {
      if (!sourcesLocations[sl.source]) {
        sourcesLocations[sl.source] = [];
      }
      sourcesLocations[sl.source].push(sl);
    });
  return sourcesLocations;
};

// Filter the sources array to only those with data
const filterSourcesWithData = (sourcesArray: SourceType[], sourcesLocations: Record<string, Target["subcellularLocations"]>) =>
  sourcesArray.filter(s => sourcesLocations[s.id]);

function LocationLink({ sourceId, id }: { sourceId: string; id: string }) {
  return (
    <Link external to={identifiersOrgLink(sourceId === "uniprot" ? "uniprot" : "hpa", id)}>
      {id}
    </Link>
  );
}

/**
 * The text list of locations displayed to the right of the visualiztion
 */
function LocationsList({ sls, hoveredCellPart, setHoveredCellPart }: { sls: Array<Target["subcellularLocations"][number] & { targetModifier?: string | null }>; hoveredCellPart: string | null; setHoveredCellPart: (cellPart: string | null) => void }) {
  const sortedSls = sls.toSorted((a, b): number => {
    return a.location.localeCompare(b.location);
  });

  // Group locations by targetModifier
  const groupedSls = sortedSls.reduce((acc: Record<string, typeof sortedSls>, sl) => {
    const modifier = sl.targetModifier || 'no-modifier';
    if (!acc[modifier]) {
      acc[modifier] = [];
    }
    acc[modifier].push(sl);
    return acc;
  }, {});

  // Create an array to maintain order: items without modifier first, then groups
  const orderedGroups = [];
  if (groupedSls['no-modifier']) {
    orderedGroups.push({ modifier: null, items: groupedSls['no-modifier'] });
  }
  Object.entries(groupedSls).forEach(([modifier, items]) => {
    if (modifier !== 'no-modifier') {
      orderedGroups.push({ modifier, items });
    }
  });

  return (
    <List data-testid="subcellular-locations-list">
      {orderedGroups.map(({ modifier, items }) => (
        <Box key={modifier || 'no-modifier'}>
          {modifier && (
            <Typography variant="body1" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
              {modifier}
            </Typography>
          )}
          {items.map(({ location, termSL }: Target["subcellularLocations"][number]) => {
            const locationCode = termSL ? parseLocationTerm(membraneCodes[termSL as keyof typeof membraneCodes]?.parentCode ?? termSL) ?? null : null;
            return (
              <ListItem
                key={location}
                data-testid="subcellular-location-item"
                sx={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 1,
                  cursor: "default",
                  width: "fit-content",
                  color: (theme) => theme.palette.primary[
                    hoveredCellPart === locationCode ? "dark" : "main"
                  ]
                }}
                onMouseEnter={() => setHoveredCellPart(locationCode)}
                onMouseLeave={() => setHoveredCellPart(null)}
              >
                <span>
                  <FontAwesomeIcon icon={faMapMarkerAlt} size="lg" />
                </span>
                <Typography variant="body2">
                  <strong>{location}</strong>
                </Typography>
              </ListItem>
            );
          })}
        </Box>
      ))}
    </List>
  );
}

interface SourceType {
  id: string;
  label: string;
}

interface SubcellularTabPanelProps {
  target: Target;
  source: SourceType;
  sourcesLocations: Record<string, Target["subcellularLocations"]>;
  uniprotId: string;
  value: number;
  index: number;
}


  
function SubcellularTabPanel({ target, source, sourcesLocations, uniprotId, value, index }: SubcellularTabPanelProps) {
  const [hoveredCellPart, setHoveredCellPart] = useState<string | null>(null);

  const tempSls = useMemo(() => 
    sourcesLocations[source.id],
    [sourcesLocations, source.id]
  );

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`subcellular-tabpanel-${index}`}
      aria-labelledby={`subcellular-tab-${index}`}
      data-testid={`subcellular-tabpanel-${source.id.toLowerCase()}`}
      sx={{ display: "flex", gap: 4 }}
    >{value === index && (
        <>
          <SwissBioVis
            taxonId="9606"
            locationIds={sourcesLocations[source.id].map(l => l.termSL ? parseLocationTerm(l.termSL) : "").filter(Boolean).join()}
            sourceId={source.id.toLowerCase()}
            hoveredCellPart={hoveredCellPart}
            setHoveredCellPart={setHoveredCellPart}
          />
          <Box
            key={source.id}
            sx={{ width: { xs: "55%", sm: "45%" }, flexGrow: 0 }}
          >
            <Typography variant="h6">{source.label}</Typography>
            Location for{" "}
            <LocationLink sourceId={source.id} id={source.id === "uniprot" ? uniprotId : target.id} />
            <LocationsList
              sls={tempSls}
              hoveredCellPart={hoveredCellPart}
              setHoveredCellPart={setHoveredCellPart}
            />
          </Box>
        </>
      )}
    </Box>
  );
}

/**
 * A wrapper for the SwissbioViz component
 * @param {*} data the target object as returned by the API
 */
function SubcellularViz({ data: target }: { data: Target }) {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const onTabChange = (_event: unknown, newTabIndex: number) => {
    setActiveTabIndex(newTabIndex);
  };

  const uniprotId = getUniprotIds(target.proteinIds)[0];
  const sourcesLocations = parseLocationData(target.subcellularLocations);
  const activeSources = filterSourcesWithData(sources, sourcesLocations);

  return (
    <>
      <Tabs data-testid="subcellular-tabs" value={activeTabIndex} onChange={onTabChange} aria-label="Subcellular location sources">
        {activeSources.map((source: SourceType) => (
          <Tab data-testid={`subcellular-tab-${source.id.toLowerCase()}`} label={source.label} key={source.id} />
        ))}
      </Tabs>

      <Box sx={{ mt: 4 }}>
        {activeSources.map((source: SourceType, index: number) => (
          <SubcellularTabPanel
            target={target}
            source={source}
            sourcesLocations={sourcesLocations}
            uniprotId={uniprotId}
            value={activeTabIndex}
            index={index}
            key={source.id}
          />
        ))}
      </Box>
    </>
  );
}

export default SubcellularViz;