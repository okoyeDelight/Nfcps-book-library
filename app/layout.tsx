import type { Metadata } from "next";
import "./globals.css";
import "./ebook.css";
import "./enhancements.css";
import "./admin.css";

export const metadata: Metadata = {
  title: "NFCPS BOOK LIBRARY",
  description: "Christ, the Therapy for All. — NFCPS UNIZIK Chapter Book Library"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
