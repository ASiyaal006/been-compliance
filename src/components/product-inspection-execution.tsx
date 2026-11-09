"use client";

import { useState, type ComponentProps } from "react";
import { DefectLogSection } from "@/components/defect-log-section";
import { ProductInspectionWorkspace } from "@/components/product-inspection-workspace";
import { useOutbox, type DefectItem, type SaveItem } from "@/lib/offline/outbox";
import type { DefectSeverity } from "@/lib/types/product-inspection";

type Props = {
  workspace: Omit<ComponentProps<typeof ProductInspectionWorkspace>, "onAddDefect" | "pendingSave" | "draft">;
  defects: Omit<ComponentProps<typeof DefectLogSection>, "dialogOpen" | "onDialogOpenChange" | "pendingDefects">;
};

/** The inspector's working view: checklist, defects and the bottom action bar that links them. */
export function ProductInspectionExecution({ workspace, defects }: Props) {
  const [defectDialogOpen, setDefectDialogOpen] = useState(false);
  const barVisible = workspace.canEdit && !workspace.finished && !workspace.cancelled && Boolean(workspace.start);

  // Work saved on this phone but not uploaded yet.
  const { items } = useOutbox();
  const mine = items?.filter((i) => (i.kind === "save" || i.kind === "defect") && i.orderId === workspace.orderId);
  const pendingSave = mine?.find((i): i is SaveItem => i.kind === "save");
  const pendingDefects = mine?.filter((i): i is DefectItem => i.kind === "defect") ?? [];

  // The page may come from the phone's cache while answers saved offline are newer, so the form starts
  // from those. Decided once, when the phone's copy has been read, so later uploads don't reset the form.
  const [draft, setDraft] = useState<SaveItem | null | undefined>(undefined);
  if (draft === undefined && items !== null) setDraft(pendingSave ?? null);

  const defectCounts: Record<DefectSeverity, number> = { ...workspace.defectCounts };
  for (const d of pendingDefects) {
    const qty = Number(d.input.quantity.trim() || "1");
    if (Number.isInteger(qty) && qty > 0) defectCounts[d.input.severity] += qty;
  }

  return (
    <>
      <ProductInspectionWorkspace
        key={draft ? "phone" : "server"}
        {...workspace}
        defectCounts={defectCounts}
        draft={draft ?? null}
        pendingSave={pendingSave ?? null}
        onAddDefect={defects.canAdd ? () => setDefectDialogOpen(true) : undefined}
      />
      <DefectLogSection
        {...defects}
        pendingDefects={pendingDefects}
        dialogOpen={defectDialogOpen}
        onDialogOpenChange={setDefectDialogOpen}
      />
      {/* Room for the fixed action bar so it never covers the last defect. */}
      {barVisible ? <div className="h-28" aria-hidden /> : null}
    </>
  );
}
