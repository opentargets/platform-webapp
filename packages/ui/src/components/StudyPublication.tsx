import type { ReactNode } from "react";

type StudyPublicationProps = {
  publicationFirstAuthor: string;
  publicationJournal: string;
  publicationDate: string;
};

function StudyPublication({
  publicationFirstAuthor,
  publicationJournal,
  publicationDate,
}: StudyPublicationProps): ReactNode {
  if (!publicationFirstAuthor) return "";
  return (
    <>
      {publicationFirstAuthor && (
        <>
          {publicationFirstAuthor} <i>et al.</i> {publicationJournal} (
          {publicationDate?.slice(0, 4)})
        </>
      )}
    </>
  );
}
export default StudyPublication;
