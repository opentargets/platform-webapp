/**
 * Shared prop types for section Body components.
 * Import from "@ot/constants" in all section Body files.
 */

export type EvidenceId = { ensgId: string; efoId: string };
export type EvidenceLabel = { symbol: string; name: string };

export type EvidenceBodyProps = {
  id: EvidenceId;
  label: EvidenceLabel;
  entity: string;
};

export type TargetBodyProps = {
  id: string;
  label: string;
  entity: string;
};

export type DiseaseBodyProps = {
  id: string;
  label: string;
  entity: string;
};

export type DrugBodyProps = {
  id: string;
  label: string;
  entity: string;
};
