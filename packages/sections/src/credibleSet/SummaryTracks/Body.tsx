import { useQuery } from "@apollo/client";
import { SectionItem, SectionLoader, useBatchQuery } from "ui";
import { definition } from ".";
import Description from "./Description";
import SUMMARY_TRACKS_QUERY from "./SummaryTracksQuery.gql";
import BodyContent from "./BodyContent";
import { table5HChunkSize } from "@ot/constants";

type BodyProps = {
	id: string;
	entity: string;
};

function Body({ id, entity }: BodyProps) {
  const variables = {
    studyLocusId: id,
    size: table5HChunkSize,
    index: 0,
  };

  const request = useBatchQuery({
    query: SUMMARY_TRACKS_QUERY,
    variables,
    dataPath: "credibleSet.locus",
    size: table5HChunkSize,
  });

  if (request.loading) return <SectionLoader />;

	return (
		<SectionItem
			definition={definition}
			entity={entity}
			request={request}
			showContentLoading
			loadingMessage="Loading data. This may take some time..."
			renderDescription={() => <Description />}
			renderBody={() => <BodyContent data={request.data.credibleSet} />}
		/>
	);
}

export default Body;
