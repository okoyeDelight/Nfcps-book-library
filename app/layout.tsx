import type { Metadata } from "next";
import "./globals.css";
import "./ebook.css";
import "./enhancements.css";
import "./pageflip.css";
import "./admin.css";
import "./admin-upload.css";
import "./branding.css";

export const metadata: Metadata = {
  title: "NFCPS BOOK LIBRARY",
  description: "Christ the Therapy for All — NFCPS UNIZIK Chapter Book Library",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/nfcps-logo.png",
    apple: "/nfcps-logo.png"
  },
  themeColor: "#07101f"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
