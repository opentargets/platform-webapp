import { Link } from "ui";

type Props = { symbol: string; name: string };
function Description({ symbol, name }: Props) {
  return (
    <>
      Crowdsourced expert knowledge establishing consensus causation evidence associating{" "}
      <strong>{symbol}</strong> with <strong>{name}</strong>. Source:{" "}
      <Link to="https://panelapp.genomicsengland.co.uk" external>
        Genomics England PanelApp
      </Link>
    </>
  );
}

export default Description;
