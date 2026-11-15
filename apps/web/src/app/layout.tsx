import type { Metadata, Viewport } from "next";
import { PolicyLinks } from "@/components/policy-links";
import { PwaControls } from "@/components/pwa-controls";
import "./globals.css";
import "./phone.css";

export const metadata: Metadata = {
  title: "JOJOBUILDS | Your portfolio, in focus",
  description: "A calm, connected workspace for properties, tenants and rent reconciliation.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "JOJOBUILDS", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#132535",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        {children}
        <footer className="site-footer">
          <PolicyLinks />
          <PwaControls />
        </footer>
      </body>
    </html>
  );
}
