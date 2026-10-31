import type { Metadata } from "next";
import "./globals.css";
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
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
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
