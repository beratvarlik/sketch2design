# Sketch2Design — Tasarım teslim dosyası

Bu klasör, Claude Design tuvalinde yapılan Sketch2Design ekranlarının kaynağını ve
Claude Code'da gerçek frontend'e çevirmek için gereken her şeyi içerir.

```
sketch2design-handoff/
├─ HANDOFF.md            ← bu dosya (spec)
├─ CLAUDE.md            ← proje kökü için kalıcı kurallar
├─ FAZ_PROMPTLARI.md    ← faz faz Claude Code promptları
├─ tokens.css            ← tüm renk / boşluk / radius / font tokenları
└─ designs/              ← tasarımların birebir kaynağı (.dc.html)
   ├─ Landing.dc.html    Açılış sayfası (1440 masaüstü, 768 tablet)
   ├─ Studio.dc.html     Stüdyo / çizim ekranı (çalışan canvas mantığı dahil)
   ├─ Scene.dc.html      Agent sahnesi (1920×1080, ~40 sn simülasyon)
   ├─ Sketch.dc.html     Bileşen: kroki görseli + Okuyucu tespit kutuları
   ├─ Output.dc.html     Bileşen: çıkış tasarımı, 0–7 arası olgunluk seviyesi
   ├─ Main.dc.html       Karakter sayfası (5 karakter × 5 durum) — eski stil, referans
   └─ canvas.json        Tuval düzeni (gerekmez, sadece referans)
```

## .dc.html dosyalarını okuma

Bu dosyalar Claude Design'ın bileşen formatı; doğrudan tarayıcıda çalışmaz
(`support.js` runtime'ı gerekir) ama yapı birebir React'e çevrilebilir:

| .dc.html                               | React karşılığı                         |
|----------------------------------------|-----------------------------------------|
| `<x-dc>…</x-dc>` içindeki markup        | bileşenin JSX'i                          |
| `{{ x.y }}`                            | `{x.y}`                                  |
| `<sc-for list="{{items}}" as="it">`    | `items.map(it => …)`                     |
| `<sc-if value="{{cond}}">`             | `{cond && …}`                            |
| `<dc-import name="Sketch" w="296">`    | `<Sketch w={296} />`                     |
| `<helmet><style>`                      | global CSS / CSS modülü                  |
| `class Component extends DCLogic`      | state + hook'lar (`useState`, `useEffect`) |
| `renderVals()`                         | render öncesi türetilen değerler (`useMemo`) |
| `data-props` (tweak'ler)               | bileşen props'ları                        |

Tüm JS mantığı (zamanlama senaryosu, çizim aracı, karakter ifadeleri) dosyaların
en altındaki `<script type="text/x-dc">` bloğunda; doğrudan taşınabilir.

## Sanat yönetimi

- **Konsept:** Soldan sağa krokiden tasarıma. Sol bölge el çizimi (kareli kağıt,
  kurşun kalem, titrek oklar, bant), sağa doğru çizgiler netleşir, arayüz dijitalleşir.
  Agent'lar arası oklar soldan sağa giderek düzleşir.
- **Zemin:** sıcak koyu `#14120F`, metin kırık beyaz `#F1ECE2`.
- **Renk kuralı:** Agent renkleri **yalnızca** karakterlerde ve zaman çizelgesinde.
  Arayüzün geri kalanı nötr + tek vurgu (Monad moru `#6E54FF`). Başarı/hata yeşili-kırmızısı
  sadece işlevsel durumlarda.
- **Glow:** yalnızca "çalışıyor" durumundaki agent'ın altında (bulanık renk lekesi).
- **Kutular:** her şeyi saran eşit kartlar yok; bölümler boşluk ve ince çizgiyle ayrılır.
- **Tipografi:**
  - Başlıklar: Bricolage Grotesque 800, sıkı (`letter-spacing: -0.04em`), büyük.
  - Gövde/sistem çıktısı: Geist. Kod, hash, JSON: Geist Mono.
  - Kullanıcıya ve krokiye ait her şey (notlar, ok etiketleri, karakter baloncukları): **Caveat**.
- **İkonlar:** hazır set yok; 24px viewBox, 2.4–2.6 kalın, yuvarlak uçlu, hafif titrek
  path'ler (Studio ve Scene içinde inline SVG olarak hepsi var).
- **Ses tonu:** Karakterler birinci ağızdan, kısa, esprili konuşur
  (Eleştirmen: "Başlık krokidekinden küçük kalmış, bir tur daha.").

Tokenların tamamı `tokens.css` içinde.

## Karakter sistemi

Tek SVG şablonu (viewBox `0 0 240 250`), katmanlar sınıfla yönetilir:

```
<svg class="ch-svg ag-{id} st-{durum}">
  <ellipse class="shadow"/>                 gölge (gövdeyle zıplamaz)
  <g class="hop"><g class="squash">         zıplama + squash & stretch
    .particles                              sadece st-working
    .antenna + gövde path (.tint .ol)       SABİT silüet
    .face  → göz, göz kapağı, kaş, ağız     ifade katmanı
    .acc-{id}                               aksesuar katmanı
  </g></g>
  .badge-done / .badge-retry                durum rozeti
</svg>
```

- Renk: `.ag-{id}` sınıfı `--agent-color` değişkenini set eder; gövde `fill: var(--fill)`.
- Durumlar: `portrait` (tanıtım), `waiting`, `working`, `asking`, `done`, `error`.
  Animasyonlar CSS keyframe (`breathe`, `hopY`, `hopSquash`, `wobble`, `spin`, `floatUp`).
- İfadeler: `FACES` tablosu + `makeChar(id, state, size)` fonksiyonu (Scene.dc.html script'i)
  göz yarıçapı, göz bebeği kayması, kaş/ağız path'lerini üretir. Bunu olduğu gibi
  `useCharacter()` / `<Character id state size />` bileşenine taşıyın.
- `prefers-reduced-motion` desteği var.

| id | Ad | Renk | Aksesuar | İfade |
|----|----|------|----------|-------|
| reader | Okuyucu | `#4C8DFF` | büyüteç (+ soruda ? baloncuğu) | iri meraklı gözler, "o" ağız |
| designer | Tasarımcı | `#FF8A3D` | bere, palet, cetvel | kısık gözlü keyifli gülümseme |
| generator | Üretici | `#9B6BFF` | dişli, anahtar | enerjik, dil dışarıda |
| critic | Eleştirmen | `#FF4D5E` | gözlük, kontrol listesi | tek kaş kalkık, şüpheci |
| notary | Noter | `#2DD4CF` | zincir + mühür kolye | gururlu, yarı kapalı gözler |

## Ekranlar

### Açılış (Landing.dc.html)
Hero ("Prompt yazma. **Çiz.**" — "Çiz." Caveat + mor karalama alt çizgi), kroki → 5 karakter
→ çıktı akışı, "Çiz. Bekle. Mühürle." 3 adım, "Masada beş kişi var." ekip (hover'da çalışma
animasyonu), formatlar, "Kanıtı zincirde." (Monad), Noter'li kapanış, footer.
Kırılım noktaları: 1100px ve 820px.

### Stüdyo (Studio.dc.html)
3 kolon: el çizimi ikonlu araç çubuğu | kareli kağıt canvas | ayar paneli.
- Canvas gerçekten çalışır: kalem, dikdörtgen, daire, çizgi, metin notu, silgi,
  geri/ileri al, temizle, PNG/JPG yükleme (`URL.createObjectURL`). Koordinatlar 0–1000
  normalize, `vector-effect: non-scaling-stroke`.
- Oran formata göre değişir (afiş 3:4, post 1:1, sunum 16:9, web 1.6, mobil 9:19.5) —
  `container-type: size` + `width: min(100cqw, 100cqh * var(--r))`.
- Boş canvas'ta Okuyucu + ipucu baloncuğu + "Örnek kroki koy" / "Kağıt fotoğrafı yükle".
- Panel: format (zorunlu), palet (6 hazır + otomatik + özel renk), açıklama (80 karakter),
  "Tasarla" (format + içerik yoksa pasif, nedenini yazar).

### Agent sahnesi (Scene.dc.html)
- Kroki (sol, kağıt) → 5 agent (orta, büyük) → çıktı (sağ, dijital). Ekranın ~%70'i.
- `design-spec` kartı agent'lar arasında el değiştirir; Üretici ⇄ Eleştirmen arasında
  geri dönüş oku, skor 0.61 → 0.78 → 0.87, eşik 0.85.
- Okuyucu soru sorunca ortada modal: "Buton" / "Görsel" / "Atla"; 8 sn içinde otomatik "Buton".
- JSON: sağ kenardan açılan çekmece (`spec.json` sekmesi). Günlük: kenarlıksız son 3 satır.
- Agent'a tıklayınca sağdan detay paneli (rol, durum, süre, girdi/çıktı, gerekçe +
  agent'a özel içerik: tespit kutuları, Yerleşim/Stil/İçerik sekmeleri, taslaklar,
  kriter puanları, hash'ler).
- **Senaryo:** script içindeki `ACTIVE`, `agentState()`, `bubbleFor()`, `JL` (JSON satırları),
  `EV` (günlük) tabloları. "Script zamanı" `s` soru anında durur, gerçek zaman `T` akar.
  Gerçek backend bağlanınca bu tablo yerine agent olayları (SSE/WebSocket) aynı state'i besler.

## Yer tutucular (gerçeğiyle değiştirilmeli)

- Cüzdan adresi `0x3f8A…9a2C`, hash'ler `0x9f3a…c21e`, `0x41d7…8b02`, tx `0x7c2e…a913`.
- Monad explorer linki `href="#"`.
- Menüdeki "Tasarımlarım" ve "Doğrula" henüz tasarlanmadı (`href="#"`).
- Çıkış tasarımındaki örnek metinler ("Fikrini çiz, tasarımı al." vb.).
- Süreler, skorlar ve kriter puanları demo verisi.

## Henüz yapılmayanlar

Sonuç ekranı, Tasarımlarım, Doğrula, NFT mint modal'ı, bileşen sayfası, boş/yükleme/hata
durumlarının tamamı. Ekran 1 karakter sayfası ve Output bileşeni eski (soğuk) paletle kaldı.

## Erişilebilirlik

Gerçek `<button>`, `<a>`, `<label>`; görünür odak halkası (`--focus`); ikon butonlarda
`aria-label`; radyo gruplarında `role="radiogroup"` + `aria-checked`; modal `aria-modal`;
gövde metni ≥16px; kontrast WCAG AA hedefli.
