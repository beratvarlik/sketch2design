# Sketch2Design — proje kuralları

Elle çizilen krokiyi 5 yapay zeka agent'ıyla tasarıma çeviren, sonucu Monad zincirine
mühürleyen web uygulaması. Monad Blitz hackathon projesi. Arayüz dili Türkçe.

## Tek doğruluk kaynağı
- Tasarım: `design-handoff/` klasörü. Önce `design-handoff/HANDOFF.md` oku.
- Görsel karar gerekirse `design-handoff/designs/*.dc.html` kaynağına bak; tahmin etme.
- Renk, boşluk, radius, font: yalnızca `src/styles/tokens.css` değişkenleri. Sabit hex yazma
  (karakter SVG'lerinin içi hariç).

## Teknik yığın
- Next.js (App Router) + TypeScript, `src/` klasörü.
- Stil: CSS Modules + global `tokens.css`. Tailwind kullanma.
- Fontlar `next/font/google`: Bricolage Grotesque, Caveat, Geist, Geist Mono.
- Yeni paket eklemeden önce sor.

## Klasör yapısı
```
src/
  app/                 rotalar: / , /studio , /run , /dev/characters
  components/
    character/         Character.tsx, faces.ts, character.module.css
    sketch/            Sketch.tsx
    output/            OutputPreview.tsx
    layout/            TopBar.tsx
    studio/            Toolbar, Canvas, SettingsPanel
    scene/             AgentSlot, SpecCard, LoopArrow, QuestionModal, JsonDrawer, AgentPanel, Timeline
  lib/
    scenario.ts        demo senaryo tabloları (Scene.dc.html script'inden)
    useScenario.ts     senaryo hook'u
    placeholders.ts    sahte hash, adres, explorer linki — hepsi burada
  styles/tokens.css
```

## Çalışma kuralları
- Bir seferde tek faz. Fazı bitirince: `npm run build` hatasız geçmeli, sonra commit at
  (mesaj: `faz N: kısa açıklama`). Sonra bana ne yaptığını 3–5 maddede özetle ve dur.
- İstenmeyen dosyaya dokunma, istenmeyen özellik ekleme.
- Türkçe metinleri ve karakterlerin cümlelerini tasarımdaki gibi bırak.
- Erişilebilirlik: gerçek `<button>`/`<a>`/`<label>`, görünür odak, ikon butonlarda
  `aria-label`, `prefers-reduced-motion` desteği.
- Kırılımlar: 1440px masaüstü, 768px tablet.
