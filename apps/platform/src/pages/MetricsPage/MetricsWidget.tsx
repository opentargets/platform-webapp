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
    <section id={id} data-testid={id && `metrics-widget-${id}`}>
      <Card elevation={0} variant="outlined">
        <CardHeaderContainer>
          <Box sx={{ color: "secondary.main", fontSize: "1.9rem" }}>
            <FontAwesomeIcon icon={icon} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <StyledTitle data-testid={id && `metrics-widget-${id}-title`}>{title}</StyledTitle>
            {description && (
              <StyledDescription component="div" data-testid={id && `metrics-widget-${id}-description`}>
                {description}
              </StyledDescription>
            )}
          </Box>
        </CardHeaderContainer>
        <StyledCardContent data-testid={id && `metrics-widget-${id}-content`}>{children}</StyledCardContent>
      </Card>
    </section>
  );
}

export default MetricsWidget;
