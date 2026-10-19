import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeBerry — AI Client Acquisition Engine",
  description: "B2B client discovery, evidence-based auditing, and founder-approved outreach engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
