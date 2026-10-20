import { makeChar, type CharacterId, type CharacterState } from "./faces";
import s from "./character.module.css";

interface CharacterProps {
  id: CharacterId;
  state?: CharacterState;
  size?: number;
  /** Açılış akışındaki sıra (0–4): karakter sırayla zıplar. */
  relay?: number;
}

export default function Character({ id, state = "portrait", size = 168, relay }: CharacterProps) {
  const c = makeChar(id, state, size);
  return (
    <svg
      className={`${s.ch} ag-${id}`}
      data-agent={id}
      data-state={state}
      data-relay={relay}
      viewBox="0 0 240 250"
      width={c.w}
      height={c.h}
      role="img"
      aria-label={c.label}
    >
      <ellipse className={s.shadow} cx="120" cy="228" rx="64" ry="8" />
      <g className={s.hop}><g className={s.squash}>
        <g className={s.particles}>
          <circle className={`${s.pt} ${s.p1}`} cx="34" cy="70" r="5" />
          <circle className={`${s.pt} ${s.ptW} ${s.p2}`} cx="210" cy="104" r="3.5" />
          <circle className={`${s.pt} ${s.ptW} ${s.p3}`} cx="24" cy="150" r="3.5" />
          <path className={`${s.pt} ${s.spark} ${s.p4}`} d="M214 140 v12 M208 146 h12" />
        </g>
        <path className={s.antenna} d="M120 46 Q112 30 124 19" />
        <circle className={`${s.tint} ${s.ol}`} cx="127" cy="16" r="8" />
        <path className={`${s.tint} ${s.ol}`} d="M120 40 C146 40 160 72 174 110 C190 152 204 182 199 199 C195 212 178 215 120 215 C62 215 45 212 41 199 C36 182 50 152 66 110 C80 72 94 40 120 40 Z" />
        <path className={s.shade} d="M44 186 C60 200 90 204 120 204 C150 204 180 200 196 186 C201 196 198 204 190 208 C176 213 160 213 120 213 C80 213 64 213 50 208 C42 204 39 196 44 186 Z" />
        <path className={s.shine} d="M80 112 C86 88 96 68 108 56" />
        <g>
          {c.blush && (
            <g className={s.cheeks}>
              <ellipse cx="82" cy="142" rx="10" ry="5.5" />
              <ellipse cx="158" cy="142" rx="10" ry="5.5" />
            </g>
          )}
          {c.eyesOpen && (
            <g>
              <g className={s.eye}>
                <circle className={`${s.white} ${s.ol}`} cx="102" cy="118" r={c.rL} />
                <circle className={s.pupil} cx={c.pLx} cy={c.pLy} r={c.prL} />
                <circle className={s.glint} cx={c.gLx} cy={c.gLy} r={c.grL} />
              </g>
              <g className={s.eye}>
                <circle className={`${s.white} ${s.ol}`} cx="138" cy="118" r={c.rR} />
                <circle className={s.pupil} cx={c.pRx} cy={c.pRy} r={c.prR} />
                <circle className={s.glint} cx={c.gRx} cy={c.gRy} r={c.grR} />
              </g>
              {c.hasLid && (
                <>
                  <path className={`${s.tint} ${s.ol} ${s.lid}`} d={c.lidL} />
                  <path className={`${s.tint} ${s.ol} ${s.lid}`} d={c.lidR} />
                </>
              )}
            </g>
          )}
          {c.happy && (
            <g className={s.happy}>
              <path d="M90 121 Q102 107 114 121" />
              <path d="M126 121 Q138 107 150 121" />
            </g>
          )}
          <path className={s.brow} d={c.browL} />
          <path className={s.brow} d={c.browR} />
          <path className={`${s.mouth} ${c.mouthFilled ? s.mFill : s.mLine}`} d={c.mouth} />
          {c.tongue && <path className={s.tongue} d="M114 153 Q113 168 122 168 Q131 168 129 154 Z" />}
        </g>

        <g className={`${s.acc} ${s.accReader}`}>
          <path d="M198 184 L220 210" stroke="#0B0B0F" strokeWidth="13" strokeLinecap="round" />
          <path d="M198 184 L220 210" stroke="#7A4A26" strokeWidth="6" strokeLinecap="round" />
          <circle cx="184" cy="166" r="23" fill="rgba(210,232,255,0.38)" stroke="#0B0B0F" strokeWidth="6" />
          <circle cx="184" cy="166" r="17.5" fill="none" stroke="#DCE6F5" strokeWidth="3" />
          <path d="M172 158 Q176 150 184 149" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
        </g>
        <g className={`${s.acc} ${s.accQbubble}`}>
          <path d="M170 72 L160 92 L184 78 Z" fill="#fff" stroke="#0B0B0F" strokeWidth="4.5" strokeLinejoin="round" />
          <circle cx="192" cy="52" r="27" fill="#fff" stroke="#0B0B0F" strokeWidth="5" />
          <path d="M182 46 Q182 35 192 35 Q203 35 203 45 Q203 52 193 56 V61" fill="none" stroke="#0B0B0F" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="193" cy="70" r="3.6" fill="#0B0B0F" />
        </g>
        <g className={`${s.acc} ${s.accDesigner}`}>
          <g transform="rotate(-22 44 156)">
            <rect x="33" y="108" width="22" height="96" rx="3" fill="#F2C94C" stroke="#0B0B0F" strokeWidth="4" />
            <path d="M33 122 h8 M33 134 h12 M33 146 h8 M33 158 h12 M33 170 h8 M33 182 h12 M33 194 h8" stroke="#0B0B0F" strokeWidth="2.5" />
          </g>
          <path d="M168 166 C166 146 196 138 212 152 C226 165 218 190 198 190 C188 190 191 179 182 181 C172 183 169 176 168 166 Z" fill="#F3E6D3" stroke="#0B0B0F" strokeWidth="4.5" strokeLinejoin="round" />
          <circle cx="184" cy="160" r="5" fill="#4C8DFF" />
          <circle cx="199" cy="155" r="5" fill="#FFD23F" />
          <circle cx="210" cy="168" r="5" fill="#3DDC84" />
          <circle cx="203" cy="181" r="5" fill="#FF4D5E" />
          <path d="M78 62 C72 42 102 30 126 31 C152 32 168 46 161 60 C150 69 98 70 78 62 Z" fill="#2E3350" stroke="#0B0B0F" strokeWidth="5" strokeLinejoin="round" />
          <path d="M92 55 C110 59 140 59 154 53" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" strokeLinecap="round" />
        </g>
        <g className={`${s.acc} ${s.accGenerator}`}>
          <g className={s.gear}>
            <circle cx="46" cy="94" r="21" fill="none" stroke="#0B0B0F" strokeWidth="14" strokeDasharray="7 6.2" />
            <circle cx="46" cy="94" r="21" fill="none" stroke="#C9CED6" strokeWidth="8" strokeDasharray="7 6.2" />
            <circle cx="46" cy="94" r="17" fill="#C9CED6" stroke="#0B0B0F" strokeWidth="4" />
            <circle cx="46" cy="94" r="6" fill="#0B0B0F" />
          </g>
          <g transform="rotate(38 198 172)">
            <rect x="192" y="160" width="13" height="50" rx="6.5" fill="#C9CED6" stroke="#0B0B0F" strokeWidth="4" />
            <circle cx="198.5" cy="152" r="14" fill="#C9CED6" stroke="#0B0B0F" strokeWidth="4" />
            <rect x="193.5" y="136" width="10" height="13" rx="2" fill="#0B0B0F" />
          </g>
        </g>
        <g className={`${s.acc} ${s.accCritic}`}>
          <circle cx="102" cy="118" r="18.5" fill="rgba(255,255,255,0.10)" stroke="#0B0B0F" strokeWidth="5" />
          <circle cx="138" cy="118" r="18.5" fill="rgba(255,255,255,0.10)" stroke="#0B0B0F" strokeWidth="5" />
          <path d="M116 111 Q120 106 124 111 M83.5 114 L70 107 M156.5 114 L170 107" fill="none" stroke="#0B0B0F" strokeWidth="4.5" strokeLinecap="round" />
          <g transform="rotate(12 198 178)">
            <rect x="176" y="150" width="44" height="56" rx="6" fill="#F4F1EA" stroke="#0B0B0F" strokeWidth="4.5" />
            <rect x="188" y="143" width="20" height="12" rx="3" fill="#9AA3AE" stroke="#0B0B0F" strokeWidth="3.5" />
            <path d="M183 167 l4 4 l8 -9 M183 182 l4 4 l8 -9" fill="none" stroke="#1F9D55" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M184 194 l7 7 M191 194 l-7 7" stroke="#E5484D" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M200 167 h13 M200 182 h13 M200 197 h10" stroke="#8A919C" strokeWidth="3" strokeLinecap="round" />
          </g>
        </g>
        <g className={`${s.acc} ${s.accNotary}`}>
          <path d="M72 146 Q120 200 168 146" fill="none" stroke="#0B0B0F" strokeWidth="8" strokeLinecap="round" />
          <path d="M72 146 Q120 200 168 146" fill="none" stroke="#F2C94C" strokeWidth="4" strokeDasharray="7 4" strokeLinecap="round" />
          <circle cx="120" cy="180" r="16" fill="#F2C94C" stroke="#0B0B0F" strokeWidth="4.5" />
          <path d="M120 172 L126.9 176 L126.9 184 L120 188 L113.1 184 L113.1 176 Z" fill="none" stroke="#0B0B0F" strokeWidth="2.8" strokeLinejoin="round" />
        </g>
      </g></g>
      <g className={`${s.badge} ${s.badgeDone}`}>
        <circle cx="44" cy="42" r="18" fill="#3FBF6E" stroke="#0B0B0F" strokeWidth="4.5" />
        <path d="M35 42 l6 6 l11 -12" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g className={`${s.badge} ${s.badgeRetry}`}>
        <circle cx="44" cy="42" r="18" fill="#E8A21A" stroke="#0B0B0F" strokeWidth="4.5" />
        <path d="M51 39 A8 8 0 1 0 50 48" fill="none" stroke="#0B0B0F" strokeWidth="3.6" strokeLinecap="round" />
        <path d="M46 33 L52 39 L45 41" fill="none" stroke="#0B0B0F" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
