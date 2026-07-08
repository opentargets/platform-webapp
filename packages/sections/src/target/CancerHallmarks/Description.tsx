import { Link } from "ui";

type Props = { symbol: string };
function Description({ symbol }: Props) {
  return (
    <>
      Role of <strong>{symbol}</strong> in essential alterations in cell physiology that dictate
      malignant growth. Source:{" "}
      <Link external to="https://cancer.sanger.ac.uk/cosmic">
        COSMIC
      </Link>
      .
    </>
  );
}

export default Description;
