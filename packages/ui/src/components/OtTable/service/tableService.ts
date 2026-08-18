import type { getTableRowsProps } from "../types/tableTypes";

export async function getTableRows({
  query,
  variables,
  cursor,
  size,
  freeTextQuery,
  client,
}: getTableRowsProps): Promise<[]> {
  const resData = await client.query({
    query,
    variables: {
      ...variables,
      cursor,
      size,
      freeTextQuery,
    },
    fetchPolicy: "no-cache",
  });
  // check and return only rows/count/cursor
  return resData;
}
