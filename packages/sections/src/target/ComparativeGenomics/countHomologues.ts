export default function countHomologues(homologues) {
  let orthologueCount = 0;
  let paralogueCount = 0;
  homologues.forEach(({ homologyType }) => {
    if (
      homologyType === "ortholog_one2one" ||
      homologyType === "ortholog_one2many" ||
      homologyType === "ortholog_many2many"
    ) {
      orthologueCount += 1;
    }

    if (homologyType === "within_species_paralog" || homologyType === "other_paralog") {
      paralogueCount += 1;
    }
  });
  return { orthologueCount, paralogueCount };
}
