import { useState } from "react";

/**
 * Manages modal and pathway selection state for the enrichment map
 */
export function useEnrichmentMapState() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"node" | "edge" | null>(null);
  const [modalData, setModalData] = useState<Record<string, unknown> | null>(null);

  return {
    // Modal state
    modalOpen,
    setModalOpen,
    modalType,
    setModalType,
    modalData,
    setModalData,
  };
}
