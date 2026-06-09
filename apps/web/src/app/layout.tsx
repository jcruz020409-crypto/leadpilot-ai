import type { Metadata } from "next";
import { LEADPILOT_MARK_PATH } from "../lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadPilot AI",
  description: "Multi-Agent AI Sales Autopilot powered by Qwen Cloud",
  icons: {
    icon: LEADPILOT_MARK_PATH
  },
  other: {
    google: "notranslate"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className="notranslate" lang="en" translate="no">
      <body className="notranslate" translate="no">
        {children}
      </body>
    </html>
  );
}
