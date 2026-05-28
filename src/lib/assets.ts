export type AssetStatus = "Compliant" | "Defect";

export type AssetSummary = {
  id: string;
  type: string;
  site: string;
  status: AssetStatus;
  due: string;
};

export type InspectionTimelineEntry = {
  date: string;
  outcome: string;
  reference: string;
};

export type AssetDetail = AssetSummary & {
  client: string;
  serialNo: string;
  swl: string;
  lastTestDate: string;
  fileRef: string;
  inspectionDate: string;
  /** Most recent first — statutory inspection history for this asset. */
  timeline: [InspectionTimelineEntry, InspectionTimelineEntry, InspectionTimelineEntry];
};

/** Mock register used by the dashboard table and asset detail pages. */
const assetDetails: AssetDetail[] = [
  {
    id: "CDW-1042",
    type: "Hookloader",
    site: "Bermondsey MRF",
    status: "Compliant",
    due: "12 Jun 2026",
    client: "CD Waste Ltd",
    serialNo: "HL-UK-2019-88421",
    swl: "26,000 kg",
    lastTestDate: "14 Mar 2026",
    fileRef: "BC-INS-2026-0091",
    inspectionDate: "14 Mar 2026",
    timeline: [
      { date: "14 Mar 2026", outcome: "Compliant", reference: "BC-INS-2026-0091" },
      { date: "09 Sep 2025", outcome: "Compliant", reference: "BC-INS-2025-0602" },
      { date: "14 Mar 2025", outcome: "Compliant", reference: "BC-INS-2025-0220" },
    ],
  },
  {
    id: "CDW-1043",
    type: "RoRo Skip Lorry",
    site: "Charlton Depot",
    status: "Defect",
    due: "08 May 2026",
    client: "CD Waste Ltd",
    serialNo: "RR-UK-2020-77102",
    swl: "32,000 kg (gross)",
    lastTestDate: "18 Apr 2026",
    fileRef: "BC-INS-2026-0104",
    inspectionDate: "18 Apr 2026",
    timeline: [
      { date: "18 Apr 2026", outcome: "Defect", reference: "BC-INS-2026-0104" },
      { date: "10 Oct 2025", outcome: "Compliant", reference: "BC-INS-2025-0911" },
      { date: "04 Apr 2025", outcome: "Compliant", reference: "BC-INS-2025-0312" },
    ],
  },
  {
    id: "CDW-1044",
    type: "Front-End Loader",
    site: "Greenwich Yard",
    status: "Compliant",
    due: "21 Jul 2026",
    client: "CD Waste Ltd",
    serialNo: "FEL-NI-2018-55031",
    swl: "18,500 kg bucket SWL",
    lastTestDate: "02 Feb 2026",
    fileRef: "BC-INS-2026-0078",
    inspectionDate: "02 Feb 2026",
    timeline: [
      { date: "02 Feb 2026", outcome: "Compliant", reference: "BC-INS-2026-0078" },
      { date: "05 Aug 2025", outcome: "Compliant", reference: "BC-INS-2025-0514" },
      { date: "01 Feb 2025", outcome: "Compliant", reference: "BC-INS-2025-0089" },
    ],
  },
  {
    id: "CDW-1045",
    type: "Compactor (RCV)",
    site: "Bermondsey MRF",
    status: "Compliant",
    due: "03 Sep 2026",
    client: "CD Waste Ltd",
    serialNo: "RCV-UK-2021-44009",
    swl: "26,000 kg",
    lastTestDate: "11 Jan 2026",
    fileRef: "BC-INS-2026-0062",
    inspectionDate: "11 Jan 2026",
    timeline: [
      { date: "11 Jan 2026", outcome: "Compliant", reference: "BC-INS-2026-0062" },
      { date: "18 Jul 2025", outcome: "Compliant", reference: "BC-INS-2025-0440" },
      { date: "09 Jan 2025", outcome: "Compliant", reference: "BC-INS-2025-0012" },
    ],
  },
  {
    id: "CDW-1046",
    type: "Hookloader",
    site: "Dartford Transfer",
    status: "Defect",
    due: "15 May 2026",
    client: "CD Waste Ltd",
    serialNo: "HL-UK-2017-99144",
    swl: "26,000 kg",
    lastTestDate: "22 Mar 2026",
    fileRef: "BC-INS-2026-0098",
    inspectionDate: "22 Mar 2026",
    timeline: [
      { date: "22 Mar 2026", outcome: "Defect", reference: "BC-INS-2026-0098" },
      { date: "14 Sep 2025", outcome: "Compliant", reference: "BC-INS-2025-0722" },
      { date: "18 Mar 2025", outcome: "Compliant", reference: "BC-INS-2025-0198" },
    ],
  },
  {
    id: "CDW-1047",
    type: "Trommel Screen",
    site: "Greenwich Yard",
    status: "Compliant",
    due: "29 Aug 2026",
    client: "CD Waste Ltd",
    serialNo: "TRM-DE-2019-22015",
    swl: "N/A (static plant)",
    lastTestDate: "05 Dec 2025",
    fileRef: "BC-INS-2025-1188",
    inspectionDate: "05 Dec 2025",
    timeline: [
      { date: "05 Dec 2025", outcome: "Compliant", reference: "BC-INS-2025-1188" },
      { date: "28 May 2025", outcome: "Compliant", reference: "BC-INS-2025-0391" },
      { date: "02 Dec 2024", outcome: "Compliant", reference: "BC-INS-2024-1102" },
    ],
  },
];

const byId = new Map(assetDetails.map((a) => [a.id, a]));

export function getInspectionSummaries(): AssetSummary[] {
  return assetDetails.map(({ id, type, site, status, due }) => ({
    id,
    type,
    site,
    status,
    due,
  }));
}

export function getAssetById(id: string): AssetDetail | undefined {
  return byId.get(id);
}

export function decodeAssetIdParam(param: string): string {
  try {
    return decodeURIComponent(param);
  } catch {
    return param;
  }
}
