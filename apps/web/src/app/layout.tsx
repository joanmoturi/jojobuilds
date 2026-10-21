import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JOJOBUILDS | Your portfolio, in focus",
  description: "A calm, connected workspace for properties, tenants and rent reconciliation.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
