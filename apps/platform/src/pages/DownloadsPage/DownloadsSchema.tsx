import { OtCodeBlock, Box } from "ui";
import DownloadsSchemaBuilder from "./DownloadsSchemaBuilder";

function DownloadsSchema({ data }: { data: Record<string, unknown> }) {
  if (!data) return <>schema</>;
  return (
    <Box tabIndex={-1} sx={{ typography: "subtitle2" }}>
      <OtCodeBlock>
        <DownloadsSchemaBuilder data={data} />
      </OtCodeBlock>
    </Box>
  );
}
export default DownloadsSchema;
