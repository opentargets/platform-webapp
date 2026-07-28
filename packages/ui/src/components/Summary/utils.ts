import { type DocumentNode, gql } from "@apollo/client";

type SummaryComponent = {
  fragments?: Record<string, DocumentNode>;
};

export function createSummaryFragment(
  sections: SummaryComponent[],
  entity: string,
  fragmentName?: string
): DocumentNode {
  const sectionFragments: DocumentNode[] = [];
  const sectionFragmentNames: string[] = [];
  const fragmentNameStr = fragmentName || `${entity}ProfileSummaryFragment`;

  sections.forEach((Summary) => {
    if (!Summary.fragments) return;

    const sectionFragmentName = Object.keys(Summary.fragments)[0];

    sectionFragmentNames.push(sectionFragmentName);
    sectionFragments.push(Summary.fragments[sectionFragmentName]);
  });

  return gql`
    fragment ${fragmentNameStr} on ${entity} {
      ${
        sectionFragmentNames.length
          ? sectionFragmentNames.map((sfn) => `...${sfn}`).join("\n")
          : "id"
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
