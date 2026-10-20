export type CharacterId = "reader" | "designer" | "generator" | "critic" | "notary";
export type CharacterState = "portrait" | "waiting" | "working" | "asking" | "done" | "error";

export const CHARACTER_IDS: CharacterId[] = ["reader", "designer", "generator", "critic", "notary"];
export const CHARACTER_STATES: CharacterState[] = ["portrait", "waiting", "working", "asking", "done", "error"];

export const CHARACTER_NAMES: Record<CharacterId, string> = {
  reader: "Okuyucu",
  designer: "Tasarımcı",
  generator: "Üretici",
  critic: "Eleştirmen",
  notary: "Noter",
};

export const STATE_NAMES: Record<CharacterState, string> = {
  portrait: "hazır",
  waiting: "sırada",
  working: "çalışıyor",
  asking: "soru soruyor",
  done: "bitti",
  error: "tekrar",
};

interface Face {
  rL: number;
  rR: number;
  pr: number;
  prL?: number;
  prR?: number;
  dx: number;
  dy: number;
  lid: number | null;
  eyes: "open" | "happy";
  mFill: boolean;
  tongue: boolean;
  blush: boolean;
  browL: string;
  browR: string;
  mouth: string;
}

const O_MOUTH = "M114 151 a6 7 0 1 0 12 0 a6 7 0 1 0 -12 0";

const FACES: Record<CharacterId, Partial<Face> & Pick<Face, "rL" | "rR" | "pr" | "browL" | "browR" | "mouth">> = {
  reader: { rL: 18, rR: 18, pr: 8, dy: -1, browL: "M86 92 Q100 84 113 91", browR: "M127 91 Q140 84 154 92", mouth: O_MOUTH, mFill: true },
  designer: { rL: 15, rR: 15, pr: 7, eyes: "happy", blush: true, browL: "M90 98 Q101 94 112 98", browR: "M128 98 Q139 94 150 98", mouth: "M103 145 Q120 163 137 145" },
  generator: { rL: 16, rR: 16, pr: 8.5, browL: "M87 93 L112 88", browR: "M128 88 L153 93", mouth: "M103 144 Q120 168 137 144 Z", mFill: true, tongue: true },
  critic: { rL: 15, rR: 15, pr: 7, dx: 4, browL: "M87 100 L113 100", browR: "M127 89 Q140 80 153 87", mouth: "M107 153 Q118 151 133 145" },
  notary: { rL: 15, rR: 15, pr: 7, dy: -3, lid: 0.25, browL: "M89 95 Q101 91 112 94", browR: "M128 94 Q139 91 151 95", mouth: "M108 148 Q120 157 132 148" },
};

export interface CharProps {
  w: number;
  h: number;
  label: string;
  rL: number;
  rR: number;
  prL: number;
  prR: number;
  pLx: number;
  pLy: number;
  pRx: number;
  pRy: number;
  gLx: number;
  gLy: number;
  grL: number;
  gRx: number;
  gRy: number;
  grR: number;
  eyesOpen: boolean;
  happy: boolean;
  hasLid: boolean;
  lidL: string;
  lidR: string;
  browL: string;
  browR: string;
  mouth: string;
  mouthFilled: boolean;
  tongue: boolean;
  blush: boolean;
}

function r1(n: number) {
  return Math.round(n * 10) / 10;
}

function lidPath(cx: number, cy: number, r: number, frac: number) {
  const R = r + 2.5;
  const h = frac * r;
  const y = cy - h;
  const dx = Math.sqrt(Math.max(R * R - h * h, 0));
  return `M${r1(cx - dx)} ${r1(y)} A${R} ${R} 0 0 1 ${r1(cx + dx)} ${r1(y)} Z`;
}

export function makeChar(id: CharacterId, state: CharacterState, size: number): CharProps {
  const f: Face = { dx: 0, dy: 0, lid: null, eyes: "open", mFill: false, tongue: false, blush: false, ...FACES[id] };
  if (state === "waiting") {
    Object.assign(f, { eyes: "open", lid: 0, dy: 1, mouth: "M112 151 Q120 153 128 151", mFill: false, tongue: false, blush: false });
  } else if (state === "asking") {
    Object.assign(f, { eyes: "open", lid: null, dx: 0, dy: -3, browL: "M85 87 Q99 77 113 86", browR: "M127 86 Q141 77 155 87", mouth: O_MOUTH, mFill: true, tongue: false });
  } else if (state === "done") {
    Object.assign(f, { eyes: "happy", lid: null, browL: "M90 94 Q101 89 112 94", browR: "M128 94 Q139 89 150 94", mouth: "M101 144 Q120 172 139 144 Z", mFill: true, tongue: false, blush: true });
  } else if (state === "error") {
    Object.assign(f, { eyes: "open", lid: null, dx: 0, dy: 1, browL: "M88 92 L113 102", browR: "M127 102 L152 92", mouth: "M108 157 Q120 146 132 157", mFill: false, tongue: false, blush: false });
  }
  const { rL, rR } = f;
  const prL = f.prL || f.pr;
  const prR = f.prR || f.pr;
  const pLx = r1(102 + (f.dx * rL) / 15);
  const pLy = r1(118 + (f.dy * rL) / 15);
  const pRx = r1(138 + (f.dx * rR) / 15);
  const pRy = r1(118 + (f.dy * rR) / 15);
  const hasLid = f.lid !== null;
  return {
    w: size,
    h: Math.round((size * 250) / 240),
    label: `${CHARACTER_NAMES[id]}, ${STATE_NAMES[state]}`,
    rL, rR, prL, prR, pLx, pLy, pRx, pRy,
    gLx: r1(pLx + prL * 0.38),
    gLy: r1(pLy - prL * 0.42),
    grL: r1(Math.max(prL * 0.32, 2)),
    gRx: r1(pRx + prR * 0.38),
    gRy: r1(pRy - prR * 0.42),
    grR: r1(Math.max(prR * 0.32, 2)),
    eyesOpen: f.eyes === "open",
    happy: f.eyes === "happy",
    hasLid,
    lidL: hasLid ? lidPath(102, 118, rL, f.lid as number) : "M0 0",
    lidR: hasLid ? lidPath(138, 118, rR, f.lid as number) : "M0 0",
    browL: f.browL,
    browR: f.browR,
    mouth: f.mouth,
    mouthFilled: f.mFill,
    tongue: f.tongue,
    blush: f.blush,
  };
}
