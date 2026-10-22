import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Sketch2Design — Agent sahnesi" };

export default function RunLayout({ children }: { children: ReactNode }) {
  return children;
}
