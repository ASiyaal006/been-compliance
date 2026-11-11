import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/site/site-chrome";
import { getMarketingOrigin } from "@/lib/marketing";

export const metadata: Metadata = {
  metadataBase: new URL(getMarketingOrigin()),
  title: {
    default: "Been Compliance | Product inspections and LOLER examinations",
    template: "%s | Been Compliance",
  },
  description:
    "Pre-shipment product inspections for UK importers and online sellers, and LOLER and PUWER thorough examinations for garages, care homes, fleets and warehouses.",
  openGraph: { siteName: "Been Compliance", type: "website", locale: "en_GB" },
};

/** Public marketing website: own header and footer, no login needed. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
