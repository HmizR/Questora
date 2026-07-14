import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

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
    <html lang="en" suppressHydrationWarning>
      <body className="bg-parchment text-ink antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('questora-theme');document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.dataset.theme=t||'light'}catch(e){}"
          }}
        />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
