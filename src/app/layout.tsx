// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import dynamic from "next/dynamic";

const Providers = dynamic(() => import("./providers"), { ssr: false });
const Topbar = dynamic(() => import("@/components/Topbar"), { ssr: false });

export const metadata: Metadata = {
  title: "Superlee AI Agent - Advanced IP Registration",
  description: "Advanced IP registration assistant with AI detection and smart license recommendations on Story Protocol",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f1a" },
  ],
  other: { "color-scheme": "light dark" },
};

// Inline script untuk set class "dark" SEBELUM hydrate (anti kedip)
const themeScript = `(function(){
  try {
    var theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch {}
})()`;

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-gradient-to-br from-ai-bg via-ai-bg to-slate-900 text-white selection:bg-ai-primary/30">
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Topbar />
            <main className="flex-1">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
