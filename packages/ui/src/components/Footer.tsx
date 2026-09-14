import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { GridLegacy, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useAPIMetadata } from "../providers/APIMetadataProvider";
import { useConfigContext } from "../providers/ConfigurationProvider";
import { EmailLink } from "./EmailLink";
import Link from "./Link";
import PrivateWrapper from "./PrivateWrapper";

const FOOTER_BACKGROUND_COLOR = "#2e2d35";

const iconClassStyle = { marginRight: "10px" };

export type FooterExternalLink = {
  url: string;
  label?: string;
  showOnlyPartner?: boolean;
  icon?: IconProp;
};

const FooterLink = ({ label, url, icon }: FooterExternalLink) => {
  return (
    <GridLegacy item xs={12} sx={{ mb: 1 }}>
      <Typography color="inherit">
        {url.startsWith("mailto") ? (
          <EmailLink href={url} label={label} icon={icon} />
        ) : (
          <Link ariaLabel={`Read more about ${label} on this link`} external footer to={url}>
            {icon && <FontAwesomeIcon style={iconClassStyle} icon={icon} size="lg" />}
            {label}
          </Link>
        )}
      </Typography>
    </GridLegacy>
  );
};

type FooterSectionHeadingProps = {
  children: React.ReactNode;
};
const FooterSectionHeading = ({ children }: FooterSectionHeadingProps) => (
  <GridLegacy item xs={12}>
    <Typography variant="h6" component="div" color="inherit">
      {children}
    </Typography>
  </GridLegacy>
);

const socialIconStyle = { fontSize: "30px", color: "white" };

type FooterSocialProps = {
  social: FooterExternalLink[];
};
const FooterSocial = ({ social }: FooterSocialProps) => {
  const socialsWithIcons = social.filter((s) => s.icon);
  return (
    <>
      <FooterSectionHeading>Follow us</FooterSectionHeading>
      <GridLegacy sx={{ maxWidth: "235px" }} container justifyContent="space-between">
        {socialsWithIcons.map(({ icon, url, label }, i) => (
          <GridLegacy item key={i}>
            <Link external footer to={url} ariaLabel={label}>
              <FontAwesomeIcon style={socialIconStyle} icon={icon!} />
            </Link>
          </GridLegacy>
        ))}
      </GridLegacy>
    </>
  );
};

type FooterSectionProps = {
  heading: React.ReactNode;
  links: FooterExternalLink[];
  social?: FooterExternalLink[];
  children?: React.ReactNode;
};
const FooterSection = ({ heading, links, social, children }: FooterSectionProps) => {
  return (
    <GridLegacy
      item
      xs={12}
      sm={6}
      md={3}
      container
      direction="column"
      justifyContent="space-between"
    >
      <GridLegacy item sx={{ width: "100%" }}>
        <FooterSectionHeading>{heading}</FooterSectionHeading>
        {links.map((link, i) => {
          if (link.showOnlyPartner) {
            return (
              <PrivateWrapper key={i}>
                <FooterLink label={link.label} url={link.url} icon={link.icon} />
              </PrivateWrapper>
            );
          } else {
            return <FooterLink key={i} label={link.label} url={link.url} icon={link.icon} />;
          }
        })}
      </GridLegacy>

      {social ? (
        <GridLegacy item>
          <FooterSocial social={social} />
        </GridLegacy>
      ) : null}
      {children}
    </GridLegacy>
  );
};

// Creative Commons License
const licenseIconStyle = { marginLeft: "3px", verticalAlign: "middle" as const };

const StyledLicenseLink = styled(Link)({
  display: "inline-block",
});

type LicenseCC0Props = {
  link: FooterExternalLink;
};
const LicenseCC0 = ({ link }: LicenseCC0Props) => {
  return (
    <div>
      <Typography color="inherit" variant="caption">
        <StyledLicenseLink
          ariaLabel={`Read more about ${link.label} on this link`}
          to={link.url}
          external
          footer
        >
          {link.label}
        </StyledLicenseLink>{" "}
        is marked with{" "}
        <StyledLicenseLink
          to="http://creativecommons.org/publicdomain/zero/1.0?ref=chooser-v1"
          external
          footer
          ariaLabel={`Read more about creative commons license on this link`}
        >
          CC0 1.0
          <img
            alt="cc0 license image 1"
            aria-label="cc0 license image 1"
            style={licenseIconStyle}
            src="https://mirrors.creativecommons.org/presskit/icons/cc.svg?ref=chooser-v1"
            height="22px"
            width="22px"
          />
          <img
            alt="cc0 license image 2"
            aria-label="cc0 license image 2"
            style={licenseIconStyle}
            src="https://mirrors.creativecommons.org/presskit/icons/zero.svg?ref=chooser-v1"
            height="22px"
            width="22px"
          />
        </StyledLicenseLink>
      </Typography>
    </div>
  );
};

const DeployedVersion = () => {
  const { config } = useConfigContext();
  const {
    version: { apiVersion },
  } = useAPIMetadata();
  return (
    <Typography color="inherit" variant="caption">
      <b>UI: </b>
      {config?.gitVersion}
      <br />
      <b>API: </b>
      {apiVersion.x}.{apiVersion.y}.{apiVersion.z}
    </Typography>
  );
};

export type FooterExternalLinks = {
  about: FooterExternalLink[];
  help: FooterExternalLink[];
  license: FooterExternalLink;
  partners: FooterExternalLink[];
  network: FooterExternalLink[];
  social: FooterExternalLink[];
};
type FooterProps = {
  externalLinks: FooterExternalLinks;
};
const Footer = ({ externalLinks }: FooterProps) => {
  return (
    <GridLegacy
      sx={{
        p: 3,
        backgroundColor: FOOTER_BACKGROUND_COLOR,
        color: "#fff",
        margin: 0,
        width: "100%",
      }}
      container
      justifyContent="center"
      spacing={3}
    >
      <GridLegacy item container xs={12} md={10} spacing={2}>
        <FooterSection heading="About" links={externalLinks.about}>
          <LicenseCC0 link={externalLinks.license} />
          <DeployedVersion />
        </FooterSection>
        <FooterSection heading="Help" links={externalLinks.help} social={externalLinks.social} />
        <FooterSection heading="Partners" links={externalLinks.partners} />
        <FooterSection heading="About Open Targets" links={externalLinks.network} />
      </GridLegacy>
    </GridLegacy>
  );
};

export default Footer;
