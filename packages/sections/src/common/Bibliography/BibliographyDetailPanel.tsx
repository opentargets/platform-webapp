import { makeStyles } from "@mui/styles";

const useStyles = makeStyles(theme => ({
  detailPanel: {
    background: `${theme.palette.grey[100]}`,
    marginTop: "10px",
    padding: "20px",
  },
}));

function BibliographyDetailPanel({ children }) {
  const classes = useStyles();
  return <div className={classes.detailPanel}>{children}</div>;
}

export default BibliographyDetailPanel;
