import { useQuery } from "@apollo/client";
import {
  type DrugBodyProps,
  type DrugWarningsQuery,
  type DrugWarningsQueryVariables,
  naLabel,
} from "@ot/constants";
import { Link, type OtTableColumn, OtTableServer, SectionItem, TableDrawer, Tooltip } from "ui";
import { typedDocument } from "../../utils/typedDocument";
import { definition } from ".";
import Description from "./Description";
import DRUG_WARNINGS_QUERY_DOCUMENT from "./DrugWarningsQuery.gql";

const DRUG_WARNINGS_QUERY = typedDocument<DrugWarningsQuery, DrugWarningsQueryVariables>(
  DRUG_WARNINGS_QUERY_DOCUMENT
);

type DrugWarningRow = NonNullable<DrugWarningsQuery["drug"]>["drugWarnings"]["rows"][number];

const PAGE_SIZE = 10;

const replaceSemicolonWithUnderscore = (id: string) => id.replace(":", "_");

const columns: OtTableColumn<DrugWarningRow>[] = [
  {
    id: "warningType",
    label: "Warning type",
  },
  {
    id: "efoTerm",
    label: "Adverse event",
    renderCell: ({ efoTerm, efoId, description }) => {
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
    renderCell: ({ toxicityClass, efoIdForWarningClass, description }) => {
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
    renderCell: ({ country }) => country ?? naLabel,
  },
  { id: "year", label: "Year", renderCell: ({ year }) => year ?? naLabel },
  {
    id: "references",
    label: "References",
    renderCell: ({ references }) => {
      const sources = new Set(references.map((ref) => ref.source)); // unique sources
      const refs = references.map((ref) => ({
        name: ref.id,
        url: ref.url,
        group: ref.source,
      }));

      const message = Array.from(sources).join(", ");

      return <TableDrawer entries={refs} showSingle={false} message={message} />;
    },
  },
];

type Props = DrugBodyProps;

function Body({ id: chemblId, label: name, entity }: Props) {
  const variables = { chemblId };
  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(DRUG_WARNINGS_QUERY, {
    variables: { ...variables, index: 0, size: PAGE_SIZE },
  });

  return (
    <SectionItem
      definition={definition}
      request={request}
      entity={entity}
      renderDescription={() => <Description name={name} />}
      renderBody={() => (
        <OtTableServer<DrugWarningRow>
          columns={columns}
          query={DRUG_WARNINGS_QUERY}
          variables={variables}
          dataPath="drug.drugWarnings"
          pageSize={PAGE_SIZE}
          dataDownloader
          dataDownloaderFileStem={`${chemblId}-drug-warning`}
        />
      )}
    />
  );
}

export default Body;
