import { Link } from "ui";

type Props = { symbol: string; name: string };
function Description({ symbol, name }: Props) {
  return (
    <>
      Integrative analysis of large-scale mutation data pinpointing <strong>{symbol}</strong> as
      driver gene in <strong>{name}</strong>. Source:{" "}
      <Link to="https://www.intogen.org/search" external>
        IntOGen
      </Link>
    </>
  );
}

export default Description;
