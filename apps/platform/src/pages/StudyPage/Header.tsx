import { faChartBar } from "@fortawesome/free-solid-svg-icons";
import { Header as HeaderBase, ExternalLink, XRefLinks } from "ui";

type HeaderProps = {
  loading: boolean;
  studyId: string;
  backgroundTraits: {
    id: string;
    name: string;
  }[];
  targetId: string;
  diseases: {
    id: string;
    name: string;
  }[];
  studyCategory: string;
  testId?: string;
};

export function buildHeaderMeta({ studyId, backgroundTraits, targetId, diseases, projectId }) {
  let traitLinks, sourceLink;
  if (projectId === "GCST") {
    if (diseases?.length) {
      traitLinks = (
        <XRefLinks
          label="Disease or phenotype"
          urlStem="../disease/"
          ids={diseases.map(d => d.id)}
          names={diseases.map(d => d.name)}
        />
      );
    }
    sourceLink = {
      id: "GWAS Catalog",
      url: `https://www.ebi.ac.uk/gwas/studies/${studyId}`,
    };
  } else if (projectId?.startsWith("FINNGEN")) {
    if (diseases?.length) {
      traitLinks = (
        <XRefLinks
          label="Trait"
          urlStem="../disease/"
          ids={diseases.map(d => d.id)}
          names={diseases.map(d => d.name)}
        />
      );
    }
    sourceLink = {
      id: "FinnGen",
      url: `https://r12.finngen.fi/pheno/${studyId.slice(12)}`, // remove FINNGEN_R12_ from start
    };
  } else if (projectId === "UKB_PPP_EUR") {
    if (diseases?.length) {
      traitLinks = (
        <XRefLinks
          label="Trait"
          urlStem="../disease/"
          ids={diseases.map(d => d.id)}
          names={diseases.map(d => d.name)}
        />
      );
    }
    sourceLink = {
      id: "UKB-PPP",
      url: "https://www.synapse.org/Synapse:syn51364943/wiki/622119",
    };
  } else {
    // QTL
    if (targetId) {
      traitLinks = (
        <ExternalLink title="Affected gene" id={targetId} url={`../target/${targetId}`} />
      );
    }
    sourceLink = {
      id: "eQTL Catalog",
      url: "https://www.ebi.ac.uk/eqtl/Studies/",
    };
  }

  return {
    title: studyId,
    subtitle: null,
    Icon: faChartBar,
    externalLinks: (
      <>
        {traitLinks}
        {projectId === "GWAS" && backgroundTraits?.length > 0 && (
          <XRefLinks
            label="Background traits"
            urlStem="../disease/"
            ids={backgroundTraits.map(t => t.id)}
            names={backgroundTraits.map(t => t.name)}
          />
        )}
        <ExternalLink title="Source" id={sourceLink.id} url={sourceLink.url} />
      </>
    ),
  };
}

function Header({
  loading,
  studyId,
  backgroundTraits,
  targetId,
  diseases,
  projectId,
  testId,
}: HeaderProps) {
  const { title, subtitle, Icon, externalLinks } = buildHeaderMeta({
    studyId,
    backgroundTraits,
    targetId,
    diseases,
    projectId,
  });

  return (
    <HeaderBase
      loading={loading}
      title={title}
      subtitle={subtitle}
      Icon={Icon}
      externalLinks={externalLinks}
    />
  );
}

export default Header;
