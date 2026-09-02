import { useEffect, useState } from "react";
import { SummaryItem } from "ui";

import { getStats } from "./Api";
import { WidgetDefinition } from "../../types/widget";

type Props = { definition: WidgetDefinition; id: string };

function Summary({ definition, id }: Props) {
  const [request, setRequest] = useState({ loading: true });

  useEffect(() => {
    let isCurrent = true;

    getStats([{ key: id }]).then(
      res => {
        if (isCurrent) {
          setRequest({ loading: false, data: { count: res.hits.total } });
        }
      },
      err => {
        if (isCurrent) {
          setRequest({ loading: false, error: err });
        }
      }
    );

    return () => {
      isCurrent = false;
    };
  }, [id]);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={data => (
        <>
          {data.count.toLocaleString()} publication
          {data.count === 1 ? "" : "s"}
        </>
      )}
    />
  );
}

export default Summary;
