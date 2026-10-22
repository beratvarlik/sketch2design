import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Sketch2Design — Stüdyo" };

export default function StudioLayout({ children }: { children: ReactNode }) {
  return children;
}
