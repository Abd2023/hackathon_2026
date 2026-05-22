import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Görsel Asistan",
  description: "Görsel ürün analiziyle alışveriş kararı veren mobil asistan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-surface-dark`}
    >
      <body className="min-h-full flex flex-col items-center">
        <main className="mobile-container w-full">
          {children}
        </main>
      </body>
    </html>
  );
}
