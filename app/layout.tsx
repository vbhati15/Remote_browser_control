import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Remote Browser Control",
  description: "A local Docker-powered remote browser control system."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
