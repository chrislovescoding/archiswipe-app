// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/app/context/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: "ArchiSwipe | Find Your Architectural Soulmate",
  description: "Swipe right on stunning architectural styles. Discover your design preferences with ArchiSwipe, the fun way to explore architecture.",
  keywords: "architecture, tinder, swipe, design, styles, building, modern, gothic, brutalist, match",
  // themeColor: "#ec4899", // Example theme color (pink-500)

  // --- UPDATE FAVICON METADATA HERE ---
  icons: {
    icon: '/favicon.png', // Points to your favicon.png in src/app/
    // shortcut: '/favicon.ico', // You can remove this if you're not using a .ico file
    apple: '/favicon.png', // Use favicon.png for Apple touch, or provide a separate /apple-icon.png
    // If you created a specific apple-icon.png (e.g., 180x180px) and placed it in src/app/,
    // you would change the 'apple' line to: apple: '/apple-icon.png',
    // And if your main icon was named icon.png:
    // icon: '/icon.png',
    // apple: '/apple-icon.png', // or just '/icon.png' if reusing
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} font-sans`}>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}