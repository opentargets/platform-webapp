import { gql, DocumentNode } from "@apollo/client";

type SummaryComponent = {
  fragments?: Record<string, DocumentNode>;
};

type ShortNameDefinition = {
  shortName?: string;
  name: string;
};

export function createSummaryFragment(
  sections: SummaryComponent[],
  entity: string,
  fragmentName?: string
): DocumentNode {
  const sectionFragments: DocumentNode[] = [];
  const sectionFragmentNames: string[] = [];
  const fragmentNameStr = fragmentName || `${entity}ProfileSummaryFragment`;

  sections.forEach(Summary => {
    if (!Summary.fragments) return;

    const sectionFragmentName = Object.keys(Summary.fragments)[0];

    sectionFragmentNames.push(sectionFragmentName);
    sectionFragments.push(Summary.fragments[sectionFragmentName]);
  });

  return gql`
    fragment ${fragmentNameStr} on ${entity} {
      ${
        sectionFragmentNames.length ? sectionFragmentNames.map(sfn => `...${sfn}`).join("\n") : "id"
      }
    }
    ${sectionFragments.reduce(
      (acc, fragment) => gql`
        ${acc}
        ${fragment}
      `,
      ""
    )}
  `;
}

export function createShortName(definition: ShortNameDefinition): string {
  return (
    definition.shortName ||
    definition.name
      .split(" ")
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join("")
  );
}
