import {
  usePlatformApi,
  Link,
  ProfileChipList,
  ProfileDescription,
  Field,
  ProfileHeader as BaseProfileHeader,
} from "ui";
import { Button, Paper, Modal } from "@mui/material";
import { Fragment, useState } from "react";
import { parseDrugLabels } from "@ot/utils";
import { clinicalStageCategories } from "@ot/constants";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlassPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import {grey} from "@mui/material/colors";

import DRUG_PROFILE_HEADER_FRAGMENT from "./ProfileHeader.gql";

function ProfileHeader({ chemblId }: { chemblId: string }) {
  const { loading, error, data } = usePlatformApi();
  const [imgState, setImgState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [isOpen, setIsOpen] = useState(false);

  // TODO: Errors!
  if (error) return null;

  const toggleModal = (): void => {
    setIsOpen(!isOpen);
  };

  const {
    description,
    parentMolecule,
    childMolecules = [],
    synonyms = [],
    tradeNames = [],
    drugType,
    maximumClinicalStage
  } = data?.drug || {};

  const maxStage = clinicalStageCategories[maximumClinicalStage] ? clinicalStageCategories[maximumClinicalStage].label : "N/A";

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
      <Paper
        component={Button}
        variant="outlined"
        elevation={0}
        sx={{
          position: 'relative',
          width: '240px',
          height: '240px',
          marginLeft: 'auto',
          visibility: imgState === 'loaded' ? 'visible' : 'hidden',
          display: imgState === 'error' ? 'none' : 'block',
          cursor: "zoom-in",
          bgcolor: "#fff",
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
        <img 
          src={`https://www.ebi.ac.uk/chembl/api/data/image/${chemblId}.svg`}
          style={{width: "100%", height: "100%" }}
          onLoad={() => setImgState('loaded')}
          onError={() => setImgState('error')}
        />
          <FontAwesomeIcon
            icon={faMagnifyingGlassPlus}
            className="magnify-icon"
            style={{ position: 'absolute', bottom: 8, right: 8 }}
          />
      </Paper>

      <Modal
        open={isOpen}
        onClose={toggleModal}
        keepMounted
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          variant="outlined"
          elevation={0}
          sx={{
            position: 'relative',
            width: '440px',
            height: '440px',
          }}
        >
          <img 
            src={`https://www.ebi.ac.uk/chembl/api/data/image/${chemblId}.svg`}
            style={{width: "100%", height: "100%" }}
          />
          <Button
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
    </BaseProfileHeader>
  );
}

ProfileHeader.fragments = {
  profileHeader: DRUG_PROFILE_HEADER_FRAGMENT,
};

export default ProfileHeader;

