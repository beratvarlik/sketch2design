import { Suspense } from "react";
import RunScene from "./RunScene";

export default function RunPage() {
  return (
    <Suspense fallback={null}>
      <RunScene />
    </Suspense>
  );
}
