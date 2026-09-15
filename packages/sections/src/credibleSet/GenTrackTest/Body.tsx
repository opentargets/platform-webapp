import { useQuery } from "@apollo/client";
import { SectionItem } from "ui";
import { definition } from ".";
import Description from "./Description";
import GEN_TRACK_TEST_QUERY from "./GenTrackTestQuery.gql";
import BodyContent from "./BodyContent";

type BodyProps = {
	id: string;
	entity: string;
};

function Body({ id, entity }: BodyProps) {
  const variables = {
    studyLocusId: id,
  };

  const request = useQuery(GEN_TRACK_TEST_QUERY, {
    variables,
  });
 
	return (
		<SectionItem
			definition={definition}
			entity={entity}
			request={request}
			showContentLoading
			loadingMessage="Loading data. This may take some time..."
			renderDescription={() => <Description />}
			renderBody={() => <BodyContent />}
		/>
	);
}

export default Body;
