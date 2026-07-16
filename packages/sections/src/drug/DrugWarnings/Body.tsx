import { useQuery } from "@apollo/client";
import { Link, SectionItem, Tooltip, TableDrawer, OtTable } from "ui";

import { definition } from ".";
import Description from "./Description";
import DRUG_WARNINGS_QUERY from "./DrugWarningsQuery.gql";
import { naLabel, type DrugBodyProps, type DrugWarning } from "@ot/constants";

const replaceSemicolonWithUnderscore = (id: string) => id.replace(":", "_");

const columns = [
  {
    id: "warningType",
    label: "Warning type",
  },
  {
    id: "efoTerm",
    label: "Adverse event",
    renderCell: ({ efoTerm, efoId, description }: DrugWarning) => {
      if (efoId)
        return (
          <Tooltip title={`Description: ${description}`} showHelpIcon>
            <Link asyncTooltip to={`/disease/${replaceSemicolonWithUnderscore(efoId)}`}>
              {efoTerm || efoId}
            </Link>
          </Tooltip>
        );
      return efoTerm || description || naLabel;
    },
  },
  {
    id: "toxicityClass",
    label: "ChEMBL warning class",
    enableHiding: false,
    renderCell: ({ toxicityClass, efoIdForWarningClass, description }: DrugWarning) => {
      if (efoIdForWarningClass)
        return (
          <Link external to={`/disease/${replaceSemicolonWithUnderscore(efoIdForWarningClass)}`}>
            {toxicityClass || efoIdForWarningClass}
          </Link>
        );
      return toxicityClass || description || naLabel;
    },
  },
  {
    id: "country",
    label: "Country / region",
    renderCell: ({ country }: DrugWarning) => country ?? naLabel,
  },
  { id: "year", label: "Year", renderCell: ({ year }: DrugWarning) => year ?? naLabel },
  {
    id: "references",
    label: "References",
    renderCell: ({ references }: DrugWarning) => {
      const sources = new Set(); // used to collect unique sources
      const refs = [];

      references.forEach(ref => {
        sources.add(ref.source); // add source to set
        refs.push({
          // create new entry object
          name: ref.id,
          url: ref.url,
          group: ref.source,
        });
      });

      const message = Array.from(sources).join(", ");

      return <TableDrawer entries={refs} showSingle={false} message={message} />;
    },
  },
];

type Props = DrugBodyProps;

function Body({ id: chemblId, label: name, entity }: Props) {
  const variables = { chemblId };
  const request = useQuery(DRUG_WARNINGS_QUERY, {
    variables,
  });

  return (
    <SectionItem
      definition={definition}
      request={request}
      entity={entity}
      renderDescription={() => <Description name={name} />}
      renderBody={() => (
        <OtTable
          showGlobalFilter
          dataDownloader
          dataDownloaderFileStem={`${chemblId}-drug-warning`}
          columns={columns}
          rows={request.data?.drug.drugWarnings}
          query={DRUG_WARNINGS_QUERY.loc.source.body}
          variables={variables}
          loading={request.loading}
        />
      )}
    />
  );
}

export default Body;
