import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BON Training | Admin",
  description: "Training sessions, attendance, and people management.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}