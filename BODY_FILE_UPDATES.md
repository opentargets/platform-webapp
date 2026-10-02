# Detailed Body File Update Instructions

**Total files to update: 40**


====================================================================================================
1. packages/sections/src/common/Literature/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { SectionItem, useApolloClient } from "ui";
```

**NEW IMPORT LINE:**
```
import { SectionItem, useApolloClient, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ definition, name, id, entity, BODY_QUERY }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
```

====================================================================================================
2. packages/sections/src/credibleSet/EnhancerToGenePredictions/Body.tsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { Link, SectionItem, OtTable, Tooltip } from "ui";
```

**NEW IMPORT LINE:**
```
import { Link, SectionItem, OtTable, Tooltip, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id, entity }: BodyProps) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
```

====================================================================================================
3. packages/sections/src/credibleSet/Locus2Gene/Body.tsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { SectionItem, HeatmapTable } from "ui";
```

**NEW IMPORT LINE:**
```
import { SectionItem, HeatmapTable, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id, entity }: BodyProps) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
```

====================================================================================================
4. packages/sections/src/disease/GWASStudies/Body.tsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { Link, SectionItem, Tooltip, PublicationsDrawer, OtTable, useBatchQuery } from "ui";
```

**NEW IMPORT LINE:**
```
import { Link, SectionItem, Tooltip, PublicationsDrawer, OtTable, useBatchQuery, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id: efoId, label: diseaseName }: BodyProps) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
  efoId = reportContext?.entityId || efoId;
  diseaseName = reportContext?.entityLabel || diseaseName;
```

====================================================================================================
5. packages/sections/src/drug/AdverseEvents/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { Link, SectionItem, PaginationActionsComplete, Table, useBatchDownloader } from "ui";
```

**NEW IMPORT LINE:**
```
import { Link, SectionItem, PaginationActionsComplete, Table, useBatchDownloader, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id: chemblId, label: name, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
  chemblId = reportContext?.entityId || chemblId;
  name = reportContext?.entityLabel || name;
```

====================================================================================================
6. packages/sections/src/drug/DrugWarnings/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { Link, SectionItem, Tooltip, TableDrawer, OtTable } from "ui";
```

**NEW IMPORT LINE:**
```
import { Link, SectionItem, Tooltip, TableDrawer, OtTable, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id: chemblId, label: name, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
  chemblId = reportContext?.entityId || chemblId;
  name = reportContext?.entityLabel || name;
```

====================================================================================================
7. packages/sections/src/evidence/CRISPR/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { SectionItem, TableDrawer, OtTable, Link } from "ui";
```

**NEW IMPORT LINE:**
```
import { SectionItem, TableDrawer, OtTable, Link, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id, label, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
```

====================================================================================================
8. packages/sections/src/evidence/CRISPRScreen/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { Tooltip, SectionItem, TooltipStyledLabel, OtTable, PublicationsDrawer, Link } from "ui";
```

**NEW IMPORT LINE:**
```
import { Tooltip, SectionItem, TooltipStyledLabel, OtTable, PublicationsDrawer, Link, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id, label, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
```

====================================================================================================
9. packages/sections/src/evidence/CancerBiomarkers/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { Link, Tooltip, SectionItem, PublicationsDrawer, OtTable, TableDrawer } from "ui";
```

**NEW IMPORT LINE:**
```
import { Link, Tooltip, SectionItem, PublicationsDrawer, OtTable, TableDrawer, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id, label, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
```

====================================================================================================
10. packages/sections/src/evidence/CancerGeneCensus/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { ChipList, Link, SectionItem, PublicationsDrawer, OtTable } from "ui";
```

**NEW IMPORT LINE:**
```
import { ChipList, Link, SectionItem, PublicationsDrawer, OtTable, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id, label, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
```

====================================================================================================
11. packages/sections/src/evidence/ClinGen/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { Link, Tooltip, SectionItem, OtTable } from "ui";
```

**NEW IMPORT LINE:**
```
import { Link, Tooltip, SectionItem, OtTable, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id, label, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
```

====================================================================================================
12. packages/sections/src/evidence/EuropePmc/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { SectionItem, Link, getPage, Table } from "ui";
```

**NEW IMPORT LINE:**
```
import { SectionItem, Link, getPage, Table, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id, label, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
```

====================================================================================================
13. packages/sections/src/evidence/ExpressionAtlas/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { SectionItem, Tooltip, Link, ScientificNotation, OtTable } from "ui";
```

**NEW IMPORT LINE:**
```
import { SectionItem, Tooltip, Link, ScientificNotation, OtTable, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id, label, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
```

====================================================================================================
14. packages/sections/src/evidence/GenomicsEngland/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { Tooltip, SectionItem, Link, PublicationsDrawer, OtTable } from "ui";
```

**NEW IMPORT LINE:**
```
import { Tooltip, SectionItem, Link, PublicationsDrawer, OtTable, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id, label, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
```

====================================================================================================
15. packages/sections/src/evidence/IntOgen/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { ChipList, Link, SectionItem, Tooltip, ScientificNotation, OtTable } from "ui";
```

**NEW IMPORT LINE:**
```
import { ChipList, Link, SectionItem, Tooltip, ScientificNotation, OtTable, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id, label, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
```

====================================================================================================
16. packages/sections/src/evidence/OTCRISPR/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { SectionItem, Link, Tooltip, OtTable, TooltipStyledLabel } from "ui";
```

**NEW IMPORT LINE:**
```
import { SectionItem, Link, Tooltip, OtTable, TooltipStyledLabel, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id, label, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
```

====================================================================================================
17. packages/sections/src/evidence/OTValidation/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { Link, SectionItem, ChipList, OtTable, Tooltip } from "ui";
```

**NEW IMPORT LINE:**
```
import { Link, SectionItem, ChipList, OtTable, Tooltip, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id, label, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
```

====================================================================================================
18. packages/sections/src/evidence/UniProtLiterature/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { Link, SectionItem, Tooltip, PublicationsDrawer, OtTable } from "ui";
```

**NEW IMPORT LINE:**
```
import { Link, SectionItem, Tooltip, PublicationsDrawer, OtTable, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id, label, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
```

====================================================================================================
19. packages/sections/src/study/SharedTraitStudies/Body.tsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { Link, SectionItem, Tooltip, PublicationsDrawer, OtTable, useBatchQuery } from "ui";
```

**NEW IMPORT LINE:**
```
import { Link, SectionItem, Tooltip, PublicationsDrawer, OtTable, useBatchQuery, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ studyId, diseaseIds }: BodyProps) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
  studyId = reportContext?.entityId || studyId;
```

====================================================================================================
20. packages/sections/src/target/BaselineExpression/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { SectionItem, useApolloClient } from "ui";
```

**NEW IMPORT LINE:**
```
import { SectionItem, useApolloClient, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Section({ id: ensgId, label: symbol, entity, viewMode }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
  ensgId = reportContext?.entityId || ensgId;
  symbol = reportContext?.entityLabel || symbol;
```

====================================================================================================
21. packages/sections/src/target/CancerHallmarks/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { ChipList, SectionItem, PublicationsDrawer, OtTable } from "ui";
```

**NEW IMPORT LINE:**
```
import { ChipList, SectionItem, PublicationsDrawer, OtTable, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Section({ id, label: symbol, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
  symbol = reportContext?.entityLabel || symbol;
```

====================================================================================================
22. packages/sections/src/target/ChemicalProbes/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { Link, SectionItem, Tooltip, ClinvarStars, OtTable } from "ui";
```

**NEW IMPORT LINE:**
```
import { Link, SectionItem, Tooltip, ClinvarStars, OtTable, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id, label: symbol, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
  symbol = reportContext?.entityLabel || symbol;
```

====================================================================================================
23. packages/sections/src/target/ComparativeGenomics/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { SectionItem, Link, Tooltip, OtTable } from "ui";
```

**NEW IMPORT LINE:**
```
import { SectionItem, Link, Tooltip, OtTable, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id: ensemblId, label: symbol, entity, viewMode = VIEW_MODES.default }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
  ensemblId = reportContext?.entityId || ensemblId;
  symbol = reportContext?.entityLabel || symbol;
```

====================================================================================================
24. packages/sections/src/target/DepMap/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { SectionItem } from "ui";
```

**NEW IMPORT LINE:**
```
import { SectionItem, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Section({ id, label: symbol, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
  symbol = reportContext?.entityLabel || symbol;
```

====================================================================================================
25. packages/sections/src/target/Expression/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { SectionItem, useApolloClient, Link } from "ui";
```

**NEW IMPORT LINE:**
```
import { SectionItem, useApolloClient, Link, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Section({ id: ensgId, label: symbol, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
  ensgId = reportContext?.entityId || ensgId;
  symbol = reportContext?.entityLabel || symbol;
```

====================================================================================================
26. packages/sections/src/target/GeneOntology/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { Link, Tooltip, SectionItem, PublicationsDrawer, OtTable } from "ui";
```

**NEW IMPORT LINE:**
```
import { Link, Tooltip, SectionItem, PublicationsDrawer, OtTable, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Section({ id, label: symbol, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
  symbol = reportContext?.entityLabel || symbol;
```

====================================================================================================
27. packages/sections/src/target/GeneticConstraint/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { SectionItem, Link, Tooltip, OtTable } from "ui";
```

**NEW IMPORT LINE:**
```
import { SectionItem, Link, Tooltip, OtTable, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id: ensemblId, label: symbol, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
  ensemblId = reportContext?.entityId || ensemblId;
  symbol = reportContext?.entityLabel || symbol;
```

====================================================================================================
28. packages/sections/src/target/MolecularInteractions/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { SectionItem, useApolloClient, usePlatformApi } from "ui";
```

**NEW IMPORT LINE:**
```
import { SectionItem, useApolloClient, usePlatformApi, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ label: symbol, id, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
  symbol = reportContext?.entityLabel || symbol;
```

====================================================================================================
29. packages/sections/src/target/MolecularStructure/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { SectionItem } from "ui";
```

**NEW IMPORT LINE:**
```
import { SectionItem, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id: ensemblId, label: symbol, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
  ensemblId = reportContext?.entityId || ensemblId;
  symbol = reportContext?.entityLabel || symbol;
```

====================================================================================================
30. packages/sections/src/target/MousePhenotypes/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { Link, TableDrawer, OtTable, SectionItem } from "ui";
```

**NEW IMPORT LINE:**
```
import { Link, TableDrawer, OtTable, SectionItem, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id, label: symbol, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
  symbol = reportContext?.entityLabel || symbol;
```

====================================================================================================
31. packages/sections/src/target/Pathways/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { SectionItem, Link, OtTable } from "ui";
```

**NEW IMPORT LINE:**
```
import { SectionItem, Link, OtTable, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id: ensemblId, label: symbol, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
  ensemblId = reportContext?.entityId || ensemblId;
  symbol = reportContext?.entityLabel || symbol;
```

====================================================================================================
32. packages/sections/src/target/Safety/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { SectionItem, Link, Tooltip, PublicationsDrawer, TableDrawer, OtTable } from "ui";
```

**NEW IMPORT LINE:**
```
import { SectionItem, Link, Tooltip, PublicationsDrawer, TableDrawer, OtTable, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id: ensemblId, label: symbol, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
  ensemblId = reportContext?.entityId || ensemblId;
  symbol = reportContext?.entityLabel || symbol;
```

====================================================================================================
33. packages/sections/src/target/SubcellularLocation/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { SectionItem } from "ui";
```

**NEW IMPORT LINE:**
```
import { SectionItem, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id: ensemblId, label: symbol, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
  ensemblId = reportContext?.entityId || ensemblId;
  symbol = reportContext?.entityLabel || symbol;
```

====================================================================================================
34. packages/sections/src/target/Tractability/Body.jsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { SectionItem, EllsWrapper } from "ui";
```

**NEW IMPORT LINE:**
```
import { SectionItem, EllsWrapper, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ label: symbol, id: ensemblId, entity }) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
  ensemblId = reportContext?.entityId || ensemblId;
  symbol = reportContext?.entityLabel || symbol;
```

====================================================================================================
35. packages/sections/src/variant/EVA/Body.tsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { Link, Tooltip, SectionItem, PublicationsDrawer, ClinvarStars, OtTable } from "ui";
```

**NEW IMPORT LINE:**
```
import { Link, Tooltip, SectionItem, PublicationsDrawer, ClinvarStars, OtTable, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id, entity }: BodyProps) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
```

====================================================================================================
36. packages/sections/src/variant/MolecularStructure/Body.tsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { SectionItem, ViewerProvider, ViewerInteractionProvider} from "ui";
```

**NEW IMPORT LINE:**
```
import { SectionItem, ViewerProvider, ViewerInteractionProvider, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id, entity }: BodyProps) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
```

====================================================================================================
37. packages/sections/src/variant/Pharmacogenomics/Body.tsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { Link, Tooltip, PublicationsDrawer, OtTable, SectionItem, DirectionalityDrawer } from "ui";
```

**NEW IMPORT LINE:**
```
import { Link, Tooltip, PublicationsDrawer, OtTable, SectionItem, DirectionalityDrawer, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id, entity }: BodyProps) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
```

====================================================================================================
38. packages/sections/src/variant/UniProtVariants/Body.tsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { Link, SectionItem, Tooltip, PublicationsDrawer, OtTable } from "ui";
```

**NEW IMPORT LINE:**
```
import { Link, SectionItem, Tooltip, PublicationsDrawer, OtTable, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id, entity }: BodyProps) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
```

====================================================================================================
39. packages/sections/src/variant/VariantEffect/Body.tsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { SectionItem, Tooltip, OtTable, Link } from "ui";
```

**NEW IMPORT LINE:**
```
import { SectionItem, Tooltip, OtTable, Link, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id, entity }: BodyProps) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
```

====================================================================================================
40. packages/sections/src/variant/VariantEffectPredictor/Body.tsx
====================================================================================================

**OLD IMPORT LINE:**
```
import { Link, SectionItem, Tooltip, OtTable } from "ui";
```

**NEW IMPORT LINE:**
```
import { Link, SectionItem, Tooltip, OtTable, useReportSectionContext } from "ui";
```

**FUNCTION SIGNATURE:**
```
function Body({ id, entity }: BodyProps) {
```

**INSERT AFTER OPENING BRACE:**
```
  const reportContext = useReportSectionContext();
```
