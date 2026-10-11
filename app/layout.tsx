import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BankSim — Blue-Team AI Firewall",
  description:
    "A deterministic firewall between an AI banking assistant and its financial tools: blocks prompt injection, jailbreaks, roleplay attacks and memo injections.",
};

export const viewport: Viewport = { themeColor: "#0b1020" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
