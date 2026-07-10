import Body from "@ot/sections/variant/MolecularStructure/Body";

export default function MolecularStructureWidget({ variantId }: { variantId: string }) {
  return <Body id={variantId} entity="variant" />;
}
