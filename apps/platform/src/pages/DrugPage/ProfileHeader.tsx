import {
  usePlatformApi,
  Link,
  ProfileChipList,
  ProfileDescription,
  Field,
  ProfileHeader as BaseProfileHeader,
  Paper,
  Modal,
  Button,
  Skeleton,
} from "ui";
import { Fragment, useState } from "react";
import { parseDrugLabels } from "@ot/utils";
import { clinicalStageCategories } from "@ot/constants";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlassPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { grey } from "@mui/material/colors";

import DRUG_PROFILE_HEADER_FRAGMENT from "./ProfileHeader.gql";

const STRUCTURE_SIZE = 240;
const STRUCTURE_ZOOM_SIZE = 440;

function getStructureUrl(chemblId: string): string {
  return `https://www.ebi.ac.uk/chembl/api/data/image/${chemblId}.svg`;
}

type ImgState = "loading" | "loaded" | "error";

// Rendered with `key={chemblId}` by the parent so that the load state and the
// <img> element are recreated for every drug. Without that, navigating from one
// drug page to another keeps the previous structure on screen until the new SVG
// arrives, and the state stays "loaded" for an image that has not loaded yet.
function DrugStructure({ chemblId }: { chemblId: string }) {
  const [imgState, setImgState] = useState<ImgState>("loading");
  const [isOpen, setIsOpen] = useState(false);
  const src = getStructureUrl(chemblId);

  // ChEMBL has no structure image for this molecule (e.g. biologics): drop the box.
  if (imgState === "error") return null;

  const toggleModal = (): void => {
    setIsOpen(!isOpen);
  };

  const loaded = imgState === "loaded";

  return (
    <>
      <Paper
        component={Button}
        variant="outlined"
        elevation={0}
        disabled={!loaded}
        aria-label="Enlarge chemical structure"
        sx={{
          position: "relative",
          width: STRUCTURE_SIZE,
          height: STRUCTURE_SIZE,
          marginLeft: "auto",
          display: "block",
          overflow: "hidden",
          cursor: loaded ? "zoom-in" : "default",
          bgcolor: "#fff",
          "&.Mui-disabled": {
            bgcolor: "#fff",
          },
          "&:hover": {
            bgcolor: "#fff",
            borderColor: grey[400],
          },
          "& .magnify-icon": {
            color: grey[400],
          },
          "&:hover .magnify-icon": {
            color: grey[700],
          },
        }}
        onClick={toggleModal}
      >
        {!loaded && (
          <Skeleton
            variant="rectangular"
            animation="wave"
            sx={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          />
        )}
        {/* The image is absolutely positioned so it never affects layout while
            it loads; it is kept in the DOM (opacity 0) so onLoad can fire. */}
        <img
          src={src}
          alt={`Chemical structure of ${chemblId}`}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: loaded ? 1 : 0,
            transition: "opacity 150ms ease-in",
          }}
          onLoad={() => setImgState("loaded")}
          onError={() => setImgState("error")}
        />
        {loaded && (
          <FontAwesomeIcon
            icon={faMagnifyingGlassPlus}
            className="magnify-icon"
            style={{ position: "absolute", bottom: 8, right: 8 }}
          />
        )}
      </Paper>

      {loaded && (
        <Modal
          open={isOpen}
          onClose={toggleModal}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Paper
            variant="outlined"
            elevation={0}
            sx={{
              position: "relative",
              width: STRUCTURE_ZOOM_SIZE,
              height: STRUCTURE_ZOOM_SIZE,
            }}
          >
            <img
              src={src}
              alt={`Chemical structure of ${chemblId}`}
              style={{ width: "100%", height: "100%" }}
            />
            <Button
              aria-label="Close"
              sx={{
                position: "absolute",
                top: 0,
                right: 0,
                zIndex: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                bgcolor: "transparent",
                border: "none",
                p: 0,
                "&:hover": {
                  bgcolor: grey[200],
                },
              }}
              onClick={toggleModal}
            >
              <FontAwesomeIcon icon={faXmark} />
            </Button>
          </Paper>
        </Modal>
      )}
    </>
  );
}

function ProfileHeader({ chemblId }: { chemblId: string }) {
  const { loading, error, data } = usePlatformApi();

  // TODO: Errors!
  if (error) return null;

  const {
    description,
    parentMolecule,
    childMolecules = [],
    synonyms = [],
    tradeNames = [],
    drugType,
    maximumClinicalStage,
  } = data?.drug || {};

  const maxStage = clinicalStageCategories[maximumClinicalStage]
    ? clinicalStageCategories[maximumClinicalStage].label
    : "N/A";

  return (
    <BaseProfileHeader>
      <>
        <ProfileDescription loading={loading}>{description}</ProfileDescription>
        <Field loading={loading} title="Molecule type">
          {drugType}
        </Field>
        <Field loading={loading} title="Max stage">
          {maxStage}
        </Field>
        <Field loading={loading} title="Parent molecule">
          {parentMolecule ? (
            <Link to={`/drug/${parentMolecule.id}`}>{parentMolecule.name}</Link>
          ) : null}
        </Field>
        <Field loading={loading} title="Child molecules">
          {childMolecules.map(({ id, name }, i) => (
            <Fragment key={id}>
              <Link to={`/drug/${id}`}>{name}</Link>
              {i < childMolecules.length - 1 ? ", " : null}
            </Fragment>
          ))}
        </Field>
        <ProfileChipList title="Synonyms" inline loading={loading}>
          {parseDrugLabels(synonyms)}
        </ProfileChipList>
        <ProfileChipList title="Known trade names" inline loading={loading}>
          {parseDrugLabels(tradeNames)}
        </ProfileChipList>
      </>
      <DrugStructure key={chemblId} chemblId={chemblId} />
    </BaseProfileHeader>
  );
}

ProfileHeader.fragments = {
  profileHeader: DRUG_PROFILE_HEADER_FRAGMENT,
};

export default ProfileHeader;
