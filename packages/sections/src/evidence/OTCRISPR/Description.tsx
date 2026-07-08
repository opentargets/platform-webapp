import { Fragment } from "react";
import { Link } from "ui";

function Description({ symbol, name, data }) {
  const uniqueProjectIds = data
    ? [...new Set(data.disease.OtCrisprSummary.rows.map(({ projectId }) => projectId))]
    : null;
  return (
    <>
      Prepublication CRISPR knockout screens from Open Targets (OTAR) experimental projects,
      associating <strong>{symbol}</strong> and <strong>{name}</strong>. Source: Open Targets{" "}
      {uniqueProjectIds && (
        uniqueProjectIds.reduce((acc, projectId, index) => {
          acc.push(
            <Fragment key={projectId}>
              {index === 0 ? "" : (index === uniqueProjectIds.length - 1) ? " and " : ", "}
              <Link
                external
                to={`http://home.opentargets.org/ppp-documentation-${projectId}`}
              >
                {projectId}
              </Link>
            </Fragment>
          );
          return acc;
        }, [])
      )}
      .
    </>
  );
}

export default Description;