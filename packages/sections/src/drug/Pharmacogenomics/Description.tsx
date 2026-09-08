import { Link } from "ui";

type Props = { name: string };
function Description({ name }: Props) {
  return (
    <>
      Genetic variants that are associated with the response to <strong>{name}</strong> Source:{" "}
      <Link external to="https://www.pharmgkb.org/">
        ClinPGx
      </Link>
      .
    </>
  );
}

export default Description;
