// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ScrollRestorationProvider } from "@/context/ScrollRestorationContext";
import Header from "@/components/navigation/Header";

// Initialize Inter with the subsets and weights we need
const inter = Inter({
  subsets: ['latin'],
  // Including a variety of weights for different UI needs
  weight: ['400', '500', '600', '700'],
  // This helps with font performance
  display: 'swap',
  // Adding variable support for more precise typography
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "News App",
  description: "Created with Next.js and NewsAPI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <ScrollRestorationProvider>
          {children}
        </ScrollRestorationProvider>
      </body>
    </html>
  );
}