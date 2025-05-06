// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Ensure Inter is imported
import "./globals.css";
import { AuthProvider } from "@/app/context/AuthContext";

// Configure Inter font
const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap', // Improves font loading performance
  variable: '--font-inter' // Optional: if you want to use it as a CSS variable
});

export const metadata: Metadata = {
  title: "ArchiSwipe | Find Your Architectural Soulmate", // Slightly more descriptive title
  description: "Swipe right on stunning architectural styles. Discover your design preferences with ArchiSwipe, the fun way to explore architecture.",
  // Add more metadata for SEO:
  keywords: "architecture, tinder, swipe, design, styles, building, modern, gothic, brutalist, match",
  // themeColor: "#ec4899", // Example theme color (pink-500)
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} font-sans`}> {/* Apply Inter font variable and a base font-sans */}
      <body className={`${inter.className} antialiased`}> {/* Apply Inter classname and antialiasing */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}