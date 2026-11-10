import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductInspectionReport } from "@/components/product-inspection-report";
import { looksLikeUuid } from "@/lib/data/asset-queries";
import { fetchDefectPhotoUrls, fetchProductOrder } from "@/lib/data/product-inspection-queries";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Inspection report · Been Compliance" };

export default async function PortalReportPage({ params }: Props) {
  const { id } = await params;
  if (!looksLikeUuid(id)) notFound();

  // RLS only returns bookings for the customer's own company; drafts stay hidden.
  const [{ order }, photoUrls] = await Promise.all([fetchProductOrder(id.trim()), fetchDefectPhotoUrls(id.trim())]);
  if (!order || order.status !== "Report issued") notFound();

  return <ProductInspectionReport order={order} photoUrls={photoUrls} back={{ href: "/portal", label: "Back to your certificates" }} />;
}
