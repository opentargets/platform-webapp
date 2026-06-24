type Entity = "disease" | "drug" | "target" | "variant" | "study";

export type Suggestion = {
  type: string;
  entity: Entity;
  name: string;
  id: string;
};

export type SearchSuggestions = {
  targets: Suggestion[];
  diseases: Suggestion[];
  drugs: Suggestion[];
  variants: Suggestion[];
  studies: Suggestion[];
};

export const searchSuggestions: SearchSuggestions = {
  targets: [
    { type: "suggestion", entity: "target", name: "PCSK9", id: "ENSG00000169174" },
    { type: "suggestion", entity: "target", name: "WRN", id: "ENSG00000165392" },
    { type: "suggestion", entity: "target", name: "KRAS", id: "ENSG00000133703" },
    { type: "suggestion", entity: "target", name: "WDR7", id: "ENSG00000091157" },
    { type: "suggestion", entity: "target", name: "PAK2", id: "ENSG00000180370" },
    { type: "suggestion", entity: "target", name: "APOB", id: "ENSG00000084674" },
    { type: "suggestion", entity: "target", name: "CFTR", id: "ENSG00000001626" },
    { type: "suggestion", entity: "target", name: "NOD2", id: "ENSG00000167207" },
    { type: "suggestion", entity: "target", name: "TYK2", id: "ENSG00000105397" },
  ],
  diseases: [
    { type: "suggestion", entity: "disease", name: "Atopic Eczema", id: "MONDO_0004980" },
    { type: "suggestion", entity: "disease", name: "Psoriasis", id: "MONDO_0005083" },
    { type: "suggestion", entity: "disease", name: "Alzheimer Disease", id: "MONDO_0004975" },
    { type: "suggestion", entity: "disease", name: "Parkinson Disease", id: "MONDO_0005180" },
    { type: "suggestion", entity: "disease", name: "Colorectal Neoplasm", id: "MONDO_0005335" },
    { type: "suggestion", entity: "disease", name: "Asthma", id: "MONDO_0004979" },
    { type: "suggestion", entity: "disease", name: "Rheumatoid arthritis", id: "MONDO_0008383" },
    { type: "suggestion", entity: "disease", name: "Brugada syndrome", id: "MONDO_0015263" },
    { type: "suggestion", entity: "disease", name: "Cystic fibrosis", id: "MONDO_0009061" },
    { type: "suggestion", entity: "disease", name: "Hypercholesterolemia", id: "HP_0003124" },
    {
      type: "suggestion",
      entity: "disease",
      name: "Inflammatory bowel disease",
      id: "MONDO_0005265",
    },
  ],
  drugs: [
    { type: "suggestion", entity: "drug", name: "ROFECOXIB", id: "CHEMBL122" },
    { type: "suggestion", entity: "drug", name: "REGRELOR", id: "CHEMBL1162175" },
    { type: "suggestion", entity: "drug", name: "METFORMIN", id: "CHEMBL1431" },
    { type: "suggestion", entity: "drug", name: "ACETAMINOPHEN", id: "CHEMBL112" },
    { type: "suggestion", entity: "drug", name: "THALIDOMIDE", id: "CHEMBL468" },
    { type: "suggestion", entity: "drug", name: "HUMIRA", id: "CHEMBL1201580" },
    { type: "suggestion", entity: "drug", name: "VIAGRA", id: "CHEMBL192" },
    { type: "suggestion", entity: "drug", name: "TAGRISSO", id: "CHEMBL3353410" },
    { type: "suggestion", entity: "drug", name: "IVACAFTOR", id: "CHEMBL2010601" },
    { type: "suggestion", entity: "drug", name: "LYRICA", id: "CHEMBL1059" },
  ],
  variants: [
    { type: "suggestion", entity: "variant", name: "rs7412", id: "19_44908822_C_T" },
    { type: "suggestion", entity: "variant", name: "rs4129267", id: "1_154453788_C_T" },
    { type: "suggestion", entity: "variant", name: "4_1804392_G_A", id: "4_1804392_G_A" },
    { type: "suggestion", entity: "variant", name: "11_64600382_G_A", id: "11_64600382_G_A" },
    { type: "suggestion", entity: "variant", name: "12_6333477_C_T", id: "12_6333477_C_T" },
    { type: "suggestion", entity: "variant", name: "17_43093010_G_A", id: "17_43093010_G_A" },
  ],
  studies: [
    { type: "suggestion", entity: "study", name: "GCST90012877", id: "GCST90012877" },
    { type: "suggestion", entity: "study", name: "GCST90308590", id: "GCST90308590" },
    { type: "suggestion", entity: "study", name: "GCST004131", id: "GCST004131" },
    { type: "suggestion", entity: "study", name: "GCST90295916", id: "GCST90295916" },
    { type: "suggestion", entity: "study", name: "GCST90018784", id: "GCST90018784" },
    { type: "suggestion", entity: "study", name: "GCST90204201", id: "GCST90204201" },
    { type: "suggestion", entity: "study", name: "GCST90239655", id: "GCST90239655" },
  ],
};
