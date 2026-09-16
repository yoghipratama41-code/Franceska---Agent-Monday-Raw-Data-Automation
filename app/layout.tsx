import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Franceska Workflow",
  description: "Run the Franceska data cleaning workflow and sync Google Sheets.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="app-root">
      <body className="app-body">{children}</body>
    </html>
  );
}