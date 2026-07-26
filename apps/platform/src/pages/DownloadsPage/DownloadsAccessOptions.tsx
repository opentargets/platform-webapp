import { Link, OtBtnGroup, OtCodeBlock, Box, Typography } from "ui";
import { singleBtnGroupObj } from "ui/src/components/OtBtnGroup";

const FTP = "ftp-location";
const GCP = "gcp-location";
const AWS = "aws-location";
// component ids to show when given location url
const DATA_MAP = {
  [FTP]: ["http-location", FTP, "rsync", "wget"],
  [GCP]: [GCP, "gcp"],
  [AWS]: [AWS, "aws"],
};

type DownloadsAccessOptionsProps = {
  data: Record<string, unknown>;
  locationUrl: Record<string, unknown>;
  version: string;
};

function DownloadsAccessOptions({ data, locationUrl, version }: DownloadsAccessOptionsProps) {
  if (!data) return <>access</>;

  const columnId = data["@id"].replace("-fileset", "");

  const containedInArray = Array.isArray(data.containedIn) ? data.containedIn : [data.containedIn];

  const getLink = loc => {
    return `${locationUrl[loc]}${columnId}`;
  };

  const LOCATION_MAP: Record<string, singleBtnGroupObj> = {
    "http-location": {
      title: "Browse (link)",
      component: <HttpLocation link={getLink("ftp-location")} />,
    },
    "ftp-location": {
      title: "FTP location",
      component: <FtpLocation link={getLink("ftp-location")} />,
    },
    "gcp-location": {
      title: "Google Cloud",
      component: <GcpLocation link={getLink("gcp-location")} />,
    },
      "aws-location": {
      title: "AWS",
      component: <AwsLocation link={getLink("aws-location")} />,
    },
  };

  const SCRIPT_MAP: Record<string, singleBtnGroupObj> = {
    rsync: {
      title: "Rsync",
      component: <RsyncScript link={getLink("ftp-location")} version={version} path={columnId} />,
    },
    wget: {
      title: "Wget",
      component: <WgetScript link={getLink("ftp-location")} />,
    },
    gcp: {
      title: "Google Cloud CLI",
      component: <GcpScript link={getLink("gcp-location")} />,
    },
    aws: {
      title: "AWS CLI",
      component: <AwsScript link={getLink("aws-location")} />,
    },
  };

  return (
    <>
      <Box tabIndex={-1} sx={{ wordBreak: "break-all", typography: "subtitle2", mt: 1, mb: 4 }}>
        <Typography mb={1} variant="body1">
          File Location:{" "}
        </Typography>
        <OtBtnGroup btnGroup={getFilteredData({ allDataObj: LOCATION_MAP, containedInArray })} />
      </Box>

      <Box tabIndex={-1} sx={{ wordBreak: "break-all", typography: "subtitle2", mb: 4 }}>
        <Typography mb={1} variant="body1">
          Access Script:{" "}
        </Typography>
        <OtBtnGroup btnGroup={getFilteredData({ allDataObj: SCRIPT_MAP, containedInArray })} />
      </Box>
    </>
  );
}

function HttpLocation({ link }: { link: string }) {
  return (
    <Box sx={{ p: 2 }}>
      <OtCodeBlock textToCopy={link}>
        <Link to={link} external>
          {link}
        </Link>
      </OtCodeBlock>
    </Box>
  );
}

function GcpLocationMemo() {
  return (
    <Typography
      variant="caption"
      sx={{ 
        mb: 1, 
        display: "block",
        fontWeight: "medium",
        borderColor: "#1f5279",
        backgroundColor: "#1f5279",
        color: "white",
        p: 1,
        borderRadius: 1,
        border: "1px solid",
      }}
    >
    You need to specify <b>a billing project</b> when accessing the data from the Google Cloud.
    </Typography>
  )
}

function GcpLocation({ link }: { link: string }) {
  return (
    <Box sx={{ p: 2 }}>
      <OtCodeBlock textToCopy={link}> {link}</OtCodeBlock>
    </Box>
  );
}

function AwsLocation({ link }: { link: string }) {
  return (
    <Box sx={{ p: 2 }}>
      <OtCodeBlock textToCopy={link}> {link}</OtCodeBlock>
    </Box>
  );
}

function FtpLocation({ link }: { link: string }) {
  return (
    <Box sx={{ p: 2 }}>
      <OtCodeBlock textToCopy={link}>{link}</OtCodeBlock>
    </Box>
  );
}

function WgetScript({ link }: { link: string }) {
  const ftpLink = link.replace("http", "ftp");
  const WgetCmd = `wget --recursive --no-parent --no-host-directories --cut-dirs 6 ${ftpLink} .`;

  return (
    <Box sx={{ p: 2 }}>
      <OtCodeBlock textToCopy={WgetCmd}>{WgetCmd}</OtCodeBlock>
    </Box>
  );
}

function RsyncScript({ version, path, link }: { version: string; path: string; link: string }) {
  const rsyncLink = link.replace("http://ftp.ebi.ac.uk/", "");
  const RsyncCmd = `rsync -rpltvz --delete rsync.ebi.ac.uk::${rsyncLink} .`;
  return (
    <Box sx={{ p: 2 }}>
      <OtCodeBlock textToCopy={RsyncCmd}>{RsyncCmd}</OtCodeBlock>
    </Box>
  );
}

function GcpScript({ link }: { link: string }) {
  const cmd = `gcloud storage cp -r --billing-project $\{PROJECT_ID\} ${link}/ .`;
  return (
    <Box sx={{ p: 2 }}>
      <GcpLocationMemo />
      <OtCodeBlock textToCopy={cmd}>{cmd}</OtCodeBlock>
    </Box>
  );
}

function AwsScript({ link }: { link: string }) {
  const cmd = `aws s3 cp --recursive --no-sign-request ${link}/ .`;
  return (
    <Box sx={{ p: 2 }}>
      <OtCodeBlock textToCopy={cmd}>{cmd}</OtCodeBlock>
    </Box>
  );
}

function getFilteredData({
  allDataObj,
  containedInArray,
}: {
  allDataObj: Record<string, singleBtnGroupObj>;
  containedInArray: Array<Record<"@id", string>>;
}) {
  const entriesToShow: Record<string, singleBtnGroupObj> = {};
  containedInArray.map(e => {
    DATA_MAP[e["@id"]].map(i => {
      if (Object.prototype.hasOwnProperty.call(allDataObj, i)) entriesToShow[i] = allDataObj[i];
    });
  });

  return entriesToShow;
}

export default DownloadsAccessOptions;
