"use client";

import { useState, type ComponentProps } from "react";
import { DefectLogSection } from "@/components/defect-log-section";
import { OfflineBadge } from "@/components/offline-badge";
import { ProductInspectionWorkspace } from "@/components/product-inspection-workspace";

type Props = {
  workspace: Omit<ComponentProps<typeof ProductInspectionWorkspace>, "onAddDefect">;
  defects: Omit<ComponentProps<typeof DefectLogSection>, "dialogOpen" | "onDialogOpenChange">;
};

/** The inspector's working view: checklist, defects and the bottom action bar that links them. */
export function ProductInspectionExecution({ workspace, defects }: Props) {
  const [defectDialogOpen, setDefectDialogOpen] = useState(false);
  const barVisible = workspace.canEdit && !workspace.finished && !workspace.cancelled && Boolean(workspace.start);

  return (
    <>
      <OfflineBadge />
      <ProductInspectionWorkspace
        {...workspace}
        onAddDefect={defects.canAdd ? () => setDefectDialogOpen(true) : undefined}
      />
      <DefectLogSection {...defects} dialogOpen={defectDialogOpen} onDialogOpenChange={setDefectDialogOpen} />
      {/* Room for the fixed action bar so it never covers the last defect. */}
      {barVisible ? <div className="h-28" aria-hidden /> : null}
    </>
  );
}
