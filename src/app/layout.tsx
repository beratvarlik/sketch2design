import type { Metadata } from "next";
import { Bricolage_Grotesque, Caveat, Geist, Geist_Mono } from "next/font/google";
import "../styles/tokens.css";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "800"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "700"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Sketch2Design",
  description: "Krokini çiz, beş agent tasarıma çevirsin, sonuç Monad'a mühürlensin.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${bricolage.variable} ${caveat.variable} ${geist.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
