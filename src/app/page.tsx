import Link from "next/link";
import Character from "@/components/character/Character";
import { CHARACTER_IDS, CHARACTER_NAMES, type CharacterId } from "@/components/character/faces";
import TeamMember from "@/components/landing/TeamMember";
import TopBar from "@/components/layout/TopBar";
import OutputPreview from "@/components/output/OutputPreview";
import Sketch from "@/components/sketch/Sketch";
import s from "./page.module.css";

const TEAM: Record<CharacterId, { role: string; quote: string }> = {
  reader: { role: "krokini okur", quote: "Ne çizdiysen okurum. Emin değilsem sorarım." },
  designer: { role: "grid, renk, font", quote: "Grid’i, rengi, fontu bana bırak." },
  generator: { role: "tasarımı yapar", quote: "Spec’i ver, gerisini ben hallederim." },
  critic: { role: "krokiyle kıyaslar", quote: "Krokiye benzemiyorsa geri yollarım. Kusura bakma." },
  notary: { role: "zincire mühürler", quote: "Kim çizdi, ne çıktı, hepsi zincirde." },
};

const FORMATS = [
  { name: "Afiş", ratio: "3:4", w: 84, h: 112 },
  { name: "Sunum", ratio: "16:9", w: 160, h: 90 },
  { name: "Sosyal medya postu", ratio: "1:1", w: 100, h: 100 },
  { name: "Web sitesi", ratio: "masaüstü", w: 150, h: 94 },
  { name: "Mobil uygulama", ratio: "9:19.5", w: 56, h: 121 },
];

const ICON = {
  width: 40,
  height: 40,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export default function Home() {
  return (
    <div className={s.app}>
      <div className={s.gridpaper} aria-hidden="true" />
      <TopBar />

      <main>
        <section className={s.hero}>
          <div className="container">
            <h1 className={s.h1}>
              Prompt yazma.
              <br />
              <span className={s.hw}>
                Çiz.
                <svg viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M4 12 C40 4 90 18 130 8 S186 6 196 10" />
                </svg>
              </span>
            </h1>
            <p className={s.lead}>
              Krokini çiz, 5 yapay zeka agent&apos;ı onu gerçek bir tasarıma çevirsin, sonuç Monad&apos;da mühürlensin.
            </p>
            <div className={s.ctas}>
              <Link className={`${s.btn} ${s.btnPrimary} ${s.btnLg}`} href="/studio">
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 19.6 L5.6 15.2 L16.2 4.6 Q17.6 3.4 19 4.8 Q20.4 6.2 19.2 7.6 L8.6 18.3 Z" />
                  <path d="M14.2 6.6 L17.3 9.7" />
                </svg>
                Çizmeye Başla
              </Link>
              <Link className={s.linkArrow} href="/run">
                <span>Demoyu izle</span>
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.6 12.3 Q11 11.6 18.6 12.1 M13.8 7 Q16.6 9.6 19 12.1 Q16.4 14.6 13.9 17.2" />
                </svg>
              </Link>
            </div>

            <div className={s.flow}>
              <div className={s.flowSketch}>
                <span className={s.noteHand} style={{ position: "absolute", left: 8, top: -46, transform: "rotate(-4deg)" }}>
                  bunu çizdin
                </span>
                <span className={s.tape} aria-hidden="true" style={{ left: -14, top: -8, transform: "rotate(-24deg)" }} />
                <span className={s.tape} aria-hidden="true" style={{ right: -16, top: -4, transform: "rotate(18deg)" }} />
                <div className={s.sketchFrame}>
                  <Sketch w={230} reveal={0} ask="answered" answer="Buton" />
                </div>
              </div>

              <div className={s.flowAgents}>
                <svg className={s.flowArrows} aria-hidden="true" viewBox="0 0 700 220" preserveAspectRatio="none">
                  <path className={s.a1} d="M118 120 C124 112 130 128 137 116 S146 120 152 114" />
                  <path className={s.a2} d="M258 118 C266 113 272 123 280 116 S290 117 294 115" />
                  <path className={s.a3} d="M400 116 C410 114 418 118 436 115" />
                  <path className={s.a4} d="M542 115 L578 115" />
                </svg>
                {CHARACTER_IDS.map((id, i) => (
                  <div key={id} className={`${s.flowAgent} ag-${id}`}>
                    <Character id={id} state="portrait" size={104} relay={i} />
                    <span>{CHARACTER_NAMES[id]}</span>
                  </div>
                ))}
              </div>

              <div className={s.flowOut}>
                <div className={s.outFrame}>
                  <div className={s.outScale}>
                    <OutputPreview level={7} />
                  </div>
                </div>
                <span className={s.flowCap}>bunu aldın · Eleştirmen skoru 0.87</span>
              </div>
            </div>
          </div>
        </section>

        <section className={s.sec}>
          <div className="container">
            <h2 className={s.h2}>
              Çiz. Bekle.
              <br />
              Mühürle.
            </h2>
            <p className={s.sub}>Tasarım bilgisi gerekmez. Ne istediğini kutularla göster, gerisini ekip halletsin.</p>
            <div className={s.steps3}>
              <article className={s.step}>
                <span className={s.stepNo}>
                  1
                  <svg viewBox="0 0 84 84" aria-hidden="true">
                    <path className={s.ring1} d="M44 6 C66 4 80 22 78 44 C76 66 58 80 38 78 C16 76 4 58 7 38 C9 20 24 6 48 9" />
                  </svg>
                </span>
                <h3 className={s.h3}>Kutular çiz</h3>
                <p className={s.p}>Ekrana ya da kağıda. İçine &quot;buton&quot;, &quot;başlık&quot; diye not düş. Kağıt fotoğrafı da olur, Okuyucu el yazına alışık.</p>
              </article>
              <article className={s.step}>
                <span className={s.stepNo}>
                  2
                  <svg viewBox="0 0 84 84" aria-hidden="true">
                    <path className={s.ring2} d="M40 7 C62 5 79 20 77 42 C75 64 60 78 40 77 C19 76 6 60 7 40 C8 21 22 8 44 9" />
                  </svg>
                </span>
                <h3 className={s.h3}>Ekip çalışsın</h3>
                <p className={s.p}>Okuyucu anlar, Tasarımcı kurar, Üretici yapar, Eleştirmen beğenmezse geri yollar. Yaklaşık 40 saniye.</p>
              </article>
              <article className={s.step}>
                <span className={s.stepNo}>
                  3
                  <svg viewBox="0 0 84 84" aria-hidden="true">
                    <circle className={s.ring3} cx="42" cy="42" r="36" />
                  </svg>
                </span>
                <h3 className={s.h3}>Mühürle, indir</h3>
                <p className={s.p}>Noter kroki ve spec&apos;in hash&apos;ini Monad&apos;a yazar. Tasarımı PNG, PDF, SVG ya da HTML olarak al.</p>
              </article>
            </div>
          </div>
        </section>

        <section className={s.sec}>
          <div className="container">
            <h2 className={s.h2}>Masada beş kişi var.</h2>
            <p className={s.sub}>Her birinin tek işi var. Üstlerine gel, işe koyulsunlar.</p>
            <div className={s.team}>
              <svg className={s.ground} aria-hidden="true" viewBox="0 0 1000 14" preserveAspectRatio="none">
                <path d="M0 7 C120 4 220 10 360 6 S620 9 760 6 S920 8 1000 6" />
              </svg>
              {CHARACTER_IDS.map((id) => (
                <TeamMember key={id} id={id} name={CHARACTER_NAMES[id]} role={TEAM[id].role} quote={TEAM[id].quote} />
              ))}
            </div>
          </div>
        </section>

        <section className={s.sec}>
          <div className="container">
            <h2 className={s.h2}>
              Afişten mobil
              <br />
              uygulamaya.
            </h2>
            <div className={s.formats}>
              {FORMATS.map((f) => (
                <div key={f.name} className={s.fmt}>
                  <svg width={f.w} height={f.h} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <path className={s.fmtShape} d="M3 4 Q30 2 60 3.5 T97 3 Q98.5 30 97.5 60 T97 97 Q70 98.5 40 97.2 T3.5 97 Q2 70 3 40 T3 4 Z" />
                  </svg>
                  <span className={s.fmtName}>{f.name}</span>
                  <span className={s.fmtRatio}>{f.ratio}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={s.sec}>
          <div className="container">
            <h2 className={s.h2}>Kanıtı zincirde.</h2>
            <p className={s.sub}>&quot;Bunu yapay zeka mı yaptı, kim çizdi?&quot; diye sorulduğunda cevabın hazır olsun.</p>
            <div className={s.why3}>
              <article className={s.why}>
                <svg {...ICON}>
                  <path d="M12 2.6 Q16.2 4.8 20.3 7.4 Q20.6 12 20.1 16.8 Q16 19.2 11.9 21.4 Q7.8 19.3 3.8 16.7 Q3.4 12 3.9 7.3 Q8 4.7 12 2.6 Z" />
                  <path d="M8.2 12.4 Q9.8 13.8 11.1 15.2 Q13.6 11.6 16.2 8.9" />
                </svg>
                <h3 className={s.h3}>Kaynak kanıtı</h3>
                <p className={s.p}>Kroki ve spec&apos;in hash&apos;i zincire yazılır. Tasarımın hangi krokiden çıktığını herkes doğrulayabilir.</p>
              </article>
              <article className={s.why}>
                <svg {...ICON}>
                  <path d="M12.2 3.4 C17.4 3.2 20.8 7 20.6 12.2 C20.4 17.2 16.8 20.8 11.8 20.6 C6.8 20.4 3.2 16.8 3.4 11.8 C3.6 7 7 3.6 12.8 3.6" />
                  <path d="M9 9.4 Q12 9 15 9.3 M9 14.6 Q12 14.3 15.2 14.7 M12 7 Q11.8 12 12.1 17" />
                </svg>
                <h3 className={s.h3}>NFT olarak sahiplik</h3>
                <p className={s.p}>Beğendiğin tasarımı tek tıkla mint et. Sahipliği cüzdanında durur, istediğinde gösterirsin.</p>
              </article>
              <article className={s.why}>
                <svg {...ICON}>
                  <path d="M13.4 2.6 Q8.6 8.4 4.6 13.8 Q8 13.9 11.2 14 Q10.6 18 10.2 21.4 Q15 15.6 19.4 9.8 Q16 9.9 12.6 10 Q13 6.2 13.4 2.6 Z" />
                </svg>
                <h3 className={s.h3}>Ucuz ve hızlı</h3>
                <p className={s.p}>Monad&apos;ın hızlı, düşük ücretli ağında her tasarımı mühürlemek pratik. Kimse işlem için beklemez.</p>
              </article>
            </div>

            <div className={s.closing}>
              <div className={s.closingChar}>
                <div className={s.quote}>
                  <span className={s.bubble} style={{ fontSize: 28 }}>
                    Mühür hazır.
                    <br />
                    Sen çiz yeter.
                  </span>
                </div>
                <Character id="notary" state="done" size={150} />
              </div>
              <div className={s.closingText}>
                <h2 className={s.h2} style={{ fontSize: "clamp(44px, 5vw, 72px)" }}>
                  İlk krokin
                  <br />
                  beş dakikanı almaz.
                </h2>
                <div>
                  <Link className={`${s.btn} ${s.btnPrimary} ${s.btnLg}`} href="/studio">
                    Çizmeye Başla
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={s.foot}>
        <div className={`container ${s.footIn}`}>
          <span>
            <span className={s.footBrand}>Sketch2Design</span>Monad Blitz için yapıldı
          </span>
          <nav aria-label="Alt menü" className={s.footNav}>
            <Link href="/studio">Stüdyo</Link>
            <a href="#">Tasarımlarım</a>
            <a href="#">Doğrula</a>
            <Link href="/run">Demo</Link>
          </nav>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
