import { useLocation, useNavigate } from "react-router";
import { scroller } from "react-scroll";
import CategoryAvatar from "../CategoryAvatar";
import PartnerLockIcon from "../PartnerLockIcon";
import { SCROLL_OFFSET } from "../Section/scrollOffset";
import { StyledChip, StyledLabel } from "./SummaryItem.styles";

function SummaryItem<T>({
  definition,
  request,
  subText,
}: {
  definition: any;
  request: { loading: boolean; error?: any; data: T };
  subText?: React.ReactNode;
}) {
  const { loading, error, data } = request;
  const hasData = !loading && !error && data && definition.hasData(data);
  const navigate = useNavigate();
  const location = useLocation();

  const handleClickSection = () => {
    scroller.scrollTo(definition.id, {
      duration: 500,
      delay: 100,
      smooth: true,
      offset: SCROLL_OFFSET,
    });
    // Preserve the existing search params (e.g. ?category=) - navigate()
    // with only `hash` set would otherwise drop them.
    navigate(
      { hash: `#${definition.id}`, search: location.search },
      { replace: true, preventScrollReset: true }
    );
  };

  return (
    <StyledChip
      data-testid={`summary-${definition.id.toLowerCase().replace(/_/g, "")}`}
      hasData={hasData}
      error={!!error}
      onClick={handleClickSection}
      sx={{ opacity: loading ? 0.6 : 1 }}
    >
      <CategoryAvatar
        className="summaryChipIcon"
        definition={definition}
        hasData={hasData}
        error={!!error}
        size={38}
        shape="square"
        filled={false}
      />
      <StyledLabel className="summaryChipLabel" hasData={hasData} error={!!error}>
        {definition.name}
      </StyledLabel>
      {definition.isPrivate && <PartnerLockIcon />}
    </StyledChip>
  );
}

export default SummaryItem;
