import { Link } from "ui";
import { Fragment } from "react";
import { v1 } from "uuid";

function Description({ name, parentMolecule, childMolecules }) {
  const parentMoleculesArray = Array.isArray(parentMolecule) ? parentMolecule : [parentMolecule];
  const childMoleculesArray = Array.isArray(childMolecules) ? childMolecules : [childMolecules];
  const molecules = [...childMoleculesArray, ...parentMoleculesArray];

  return (
    <>
      <strong>{name}</strong>
      {molecules.length > 0 && (
        <>
          , and related molecules{" "}
          {molecules.map(molecule => (
            <Fragment key={v1()}>
              <Link to={`/drug/${molecule.id}`}>{molecule.name}</Link>
              {", "}
            </Fragment>
          ))}
        </>
      )}{" "}
      biochemical interactions to produce intended pharmacological effects. Curated from scientific
      literature and post-marketing package inserts. Source:{" "}
      <Link to="https://www.ebi.ac.uk/chembl/" external>
        ChEMBL
      </Link>
    </>
  );
}

export default Description;
