import { Link } from "ui";

type Props = { symbol: string; name: string };
function Description({ symbol, name }: Props) {
  return (
    <>
      Supporting diagnostic evidence associating <strong>{symbol}</strong> with{" "}
      <strong>{name}</strong>. Source:{" "}
      <Link to="https://www.ebi.ac.uk/gene2phenotype" external>
        Gene2Phenotype
      </Link>
    </>
  );
}

export default Description;
