import { useQuery } from "@apollo/client";
import { Box } from "@mui/material";
import type {
  DrugBodyProps,
  MechanismsOfActionSectionQuery,
  MechanismsOfActionSectionQueryVariables,
} from "@ot/constants";
import { epmcUrl } from "@ot/utils";
import { Fragment } from "react";
import {
  Link,
  OtTable,
  type OtTableColumn,
  PublicationsDrawer,
  SectionItem,
  TableDrawer,
} from "ui";
import { v1 } from "uuid";
import { typedDocument } from "../../utils/typedDocument";
import { definition } from ".";
import Description from "./Description";
import MECHANISMS_OF_ACTION_QUERY_DOCUMENT from "./MechanismsOfActionQuery.gql";

const MECHANISMS_OF_ACTION_QUERY = typedDocument<
  MechanismsOfActionSectionQuery,
  MechanismsOfActionSectionQueryVariables
>(MECHANISMS_OF_ACTION_QUERY_DOCUMENT);

type MechanismOfActionRow = NonNullable<
  NonNullable<MechanismsOfActionSectionQuery["drug"]>["mechanismsOfAction"]
>["rows"][number];

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const columns: OtTableColumn<MechanismOfActionRow>[] = [
  {
    id: "mechanismOfAction",
    label: "Mechanism of Action",
    enableHiding: false,
  },
  {
    id: "targetName",
    label: "Target Name",
  },
  {
    id: "targets",
    label: "Human targets",
    filterValue: (row) => row.targets.map((target) => target.approvedSymbol).join(" "),
    exportValue: (row) => row.targets.map((target) => target.approvedSymbol).join(),
    renderCell: ({ targets }) => {
      if (targets.length === 0) return "non-human";

      const targetList = targets.map((target) => ({
        name: target.approvedSymbol,
        url: `/target/${target.id}`,
        group: "Human targets",
      }));

      return <TableDrawer entries={targetList} />;
    },
  },
  {
    id: "curation",
    label: "Curation",
    filterValue: (row) => capitalise(row.curation),
    exportValue: (row) => capitalise(row.curation),
    renderCell: (row) => capitalise(row.curation),
  },
  {
    id: "references",
    label: "References",
    filterValue: (row) => row.references.map((r) => r.source).join(" "),
    exportValue: (row) =>
      row.references
        .map((r) => (r.source === "PubMed" ? `${r.source} (${r.ids.join("; ")})` : r.source))
        .join(),
    renderCell: ({ references }) => {
      if (references.length === 0) return "n/a";

      const publications = references
        .filter((r) => r.source === "PubMed")
        .flatMap((r) => r.ids.map((id, j) => ({ name: id, url: r.urls[j] ?? epmcUrl(id) })));
      const others = references.filter((r) => r.source !== "PubMed");

      return (
        <Box component="span" sx={{ display: "inline-flex", alignItems: "baseline", flexWrap: "wrap" }}>
          {publications.length > 0 && <PublicationsDrawer entries={publications} />}
          {others.map((r, i) => (
            <Fragment key={v1()}>
              {publications.length > 0 || i > 0 ? ",\u00a0" : null}
              {r.urls.length > 0 ? (
                <Link external to={r.urls[0]}>
                  {r.source}
                </Link>
              ) : (
                r.source
              )}
            </Fragment>
          ))}
        </Box>
      );
    },
  },
];

type Props = DrugBodyProps;

function Body({ id: chemblId, label: name, entity }: Props) {
  const variables = { chemblId };
  const request = useQuery(MECHANISMS_OF_ACTION_QUERY, {
    variables,
  });

  return (
    <SectionItem
      definition={definition}
      request={request}
      entity={entity}
      renderDescription={() => (
        <Description
          name={name}
          parentMolecule={request.data?.drug?.parentMolecule ?? []}
          childMolecules={request.data?.drug?.childMolecules ?? []}
        />
      )}
      renderBody={() => {
        return (
          <OtTable
            showGlobalFilter
            columns={columns}
            rows={request.data?.drug?.mechanismsOfAction?.rows ?? []}
            dataDownloader
            dataDownloaderFileStem={`${chemblId}-mechanisms-of-action`}
            query={MECHANISMS_OF_ACTION_QUERY.loc?.source.body}
            variables={variables}
            loading={request.loading}
          />
        );
      }}
    />
  );
}

export default Body;
