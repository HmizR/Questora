import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Questora",
  description: "A gamified LMS with RPG-style learning quests."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-parchment text-ink antialiased">{children}</body>
    </html>
  );
}
