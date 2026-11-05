import type { Metadata } from "next";
import "./globals.css";
import "./ticket-experience.css";
import "./live-discovery.css";
import "./genre-discovery.css";
import "./auth-experience.css";
import "./account-studio.css";
import "./personal-lounge.css";
import "@fontsource/bebas-neue/400.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";

export const metadata: Metadata = {
  title: "MovieVerse — Your universe. Your movie. Your seat.",
  description:
    "Discover your next great movie. Explore an immersive 3D cinema and find your perfect seat. A complete demonstration booking experience.",
  icons: {
    icon: [
      { url: "/favicon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon-64.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
