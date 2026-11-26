import { faDna } from "@fortawesome/free-solid-svg-icons";

import { ExternalLink, Header as HeaderBase, XRefLinks } from "ui";

type HeaderMetaArgs = {
  ensgId: string;
  uniprotIds: string[];
  rnacentralIds?: string[];
  symbol: string;
  name: string;
};

export function buildHeaderMeta({
  ensgId,
  uniprotIds,
  rnacentralIds = [],
  symbol,
  name,
}: HeaderMetaArgs) {
  const ensemblUrl = `https://identifiers.org/ensembl:${ensgId}`;
  const genecardsUrl = `https://www.genecards.org/card/${symbol}`;
  const hgncUrl = `https://identifiers.org/hgnc.symbol:${symbol}`;

  return {
    title: symbol,
    subtitle: name,
    Icon: faDna,
    externalLinks: (
      <>
        <ExternalLink title="Ensembl" id={ensgId} url={ensemblUrl} />
        {uniprotIds.length > 0 && (
          <XRefLinks
            label="UniProt"
            urlStem="https://identifiers.org/uniprot:"
            ids={uniprotIds}
            limit={3}
          />
        )}
        {rnacentralIds.length > 0 && (
          <XRefLinks
            label="RNAcentral"
            urlStem="https://identifiers.org/rnacentral:"
            ids={rnacentralIds}
            limit={1}
          />
        )}
        <ExternalLink title="GeneCards" id={symbol} url={genecardsUrl} />
        <ExternalLink title="HGNC" id={symbol} url={hgncUrl} />
      </>
    ),
  };
}

type HeaderProps = HeaderMetaArgs & {
  loading: boolean;
  crisprId?: string;
};

function Header({ loading, ensgId, uniprotIds, rnacentralIds, symbol, name }: HeaderProps) {
  const { title, subtitle, Icon, externalLinks } = buildHeaderMeta({
    ensgId,
    uniprotIds,
    rnacentralIds,
    symbol,
    name,
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
