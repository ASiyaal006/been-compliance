import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Been Compliance | Operations Dashboard",
  description:
    "Testing, Inspection, Certification & Compliance platform for TICC professionals.",
  applicationName: "Been Compliance",
  // Lets inspectors add the app to their home screen and open it full screen.
  appleWebApp: { capable: true, title: "Been", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#002147",
  // Lets fixed bars reach the screen edge; padding uses env(safe-area-inset-*) to avoid the notch.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh bg-slate-100 text-slate-900">{children}</body>
    </html>
  );
}
