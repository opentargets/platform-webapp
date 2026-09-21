import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Box,
  Card,
  CardHeaderContainer,
  StyledCardContent,
  StyledDescription,
  StyledTitle,
} from "ui";
import type { ReactNode } from "react";

type MetricsWidgetProps = {
  icon: IconDefinition;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  id?: string;
};

function MetricsWidget({ icon, title, description, children, id }: MetricsWidgetProps) {
  return (
    <section id={id}>
      <Card elevation={0} variant="outlined">
        <CardHeaderContainer>
          <Box sx={{ color: "primary.main", fontSize: "1.9rem" }}>
            <FontAwesomeIcon icon={icon} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <StyledTitle>{title}</StyledTitle>
            {description && <StyledDescription>{description}</StyledDescription>}
          </Box>
        </CardHeaderContainer>
        <StyledCardContent>{children}</StyledCardContent>
      </Card>
    </section>
  );
}

export default MetricsWidget;
