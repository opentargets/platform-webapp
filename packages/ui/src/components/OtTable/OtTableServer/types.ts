export type ServerPageState<Row> = {
  rows: Row[];
  count: number;
  loading: boolean;
  initialLoading: boolean;
  error: Error | null;
};

/** the `{ count, rows }` object of a response, under whatever field names the API uses */
export type ServerPage<ServerRow> = Partial<Record<string, ServerRow[] | number>>;
