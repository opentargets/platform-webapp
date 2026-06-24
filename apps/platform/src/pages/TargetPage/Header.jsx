import { faDna } from "@fortawesome/free-solid-svg-icons";

import { ExternalLink, TepLink, XRefLinks, Header as HeaderBase } from "ui";

function Header({ loading, ensgId, uniprotIds, symbol, name, crisprId }) {
  const ensemblUrl = `https://identifiers.org/ensembl:${ensgId}`;
  const genecardsUrl = `https://identifiers.org/genecards:${symbol}`;
  const hgncUrl = `https://identifiers.org/hgnc.symbol:${symbol}`;

  return (
    <HeaderBase
      loading={loading}
      title={symbol}
      subtitle={name}
      Icon={faDna}
      externalLinks={
        <>
          <ExternalLink title="Ensembl" id={ensgId} url={ensemblUrl} />
          <XRefLinks
            label="UniProt"
            urlStem="https://identifiers.org/uniprot:"
            ids={uniprotIds}
            limit="3"
          />
          <ExternalLink title="GeneCards" id={symbol} url={genecardsUrl} />
          <ExternalLink title="HGNC" id={symbol} url={hgncUrl} />
          <TepLink ensgId={ensgId} symbol={symbol} />
        </>
      }
    />
  );
}

export default Header;
