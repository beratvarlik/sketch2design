import type { FoundElement } from "@/lib/events";
import Sketch, { type SketchAsk } from "./Sketch";
import SketchImage from "./SketchImage";

interface SketchPreviewProps {
  w?: number;
  reveal?: number;
  ask?: SketchAsk;
  answer?: string;
  grid?: boolean;
  /** Gerçek koşuda kullanıcının krokisi; yoksa demo krokisi çizilir */
  image?: string | null;
  elements?: FoundElement[];
}

// Demo krokisi (<Sketch />) ya da kullanıcının gerçek krokisi (<SketchImage />) arasında seçer.
export default function SketchPreview({ image, elements, ...demo }: SketchPreviewProps) {
  if (image) return <SketchImage src={image} w={demo.w} elements={demo.reveal === 0 ? [] : elements} />;
  return <Sketch {...demo} />;
}
