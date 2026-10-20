# Sketch2Design — sıfırdan kodlama, faz faz promptlar

Her fazı ayrı bir mesaj olarak yapıştır. Claude Code faz bitince durup özet verecek.
Tarayıcıda (`npm run dev` → http://localhost:3000) kontrol et, beğenince sıradakine geç.
Fazlar arasında `/clear` yazarak bağlamı temizleyebilirsin; kurallar CLAUDE.md'de kalıcı.

---

## Faz 0 — Kurulum

```
CLAUDE.md ve design-handoff/HANDOFF.md dosyalarını oku. Faz 0'ı yap:
design-handoff/tokens.css'i src/styles/tokens.css olarak kopyala ve app/layout.tsx'te
global olarak yükle. Fontları next/font/google ile ekle ve tokens.css'teki --display,
--body, --mono, --hand değişkenlerine bağla. create-next-app'in örnek içeriğini
(sayfa, stiller, logolar) temizle; boş bir ana sayfa koyalım. CLAUDE.md'deki klasör
yapısını boş dosyalar olmadan oluşturma, sadece gerektikçe aç. Build al, commit at, dur.
```

## Faz 1 — Karakter bileşeni

```
Faz 1: <Character id state size /> bileşenini yaz. Kaynak: design-handoff/designs/
Scene.dc.html. Oradaki tek SVG şablonunu (gövde, anten, göz, kaş, ağız, 5 aksesuar,
rozetler, parçacıklar), FACES tablosunu ve makeChar() fonksiyonunu birebir taşı;
faces.ts'e koy. Animasyon ve durum CSS'ini (.st-waiting, .st-working, .st-asking,
.st-done, .st-error, .st-portrait) character.module.css'e al. id: reader | designer |
generator | critic | notary. /dev/characters sayfasında 5 karakteri yan yana ve
seçilen karakterin 5 durumunu göster. Build, commit, dur.
```

## Faz 2 — Kroki ve çıktı bileşenleri

```
Faz 2: design-handoff/designs/Sketch.dc.html'den <Sketch w reveal ask answer grid />,
Output.dc.html'den <OutputPreview level /> bileşenlerini çıkar (level 0–7, her
seviyenin görünümü dosyadaki renderVals mantığıyla aynı). /dev/characters sayfasının
altına ikisini birkaç farklı prop ile göster. Build, commit, dur.
```

## Faz 3 — Üst bar ve Açılış

```
Faz 3: Landing.dc.html'i / rotasına çevir. Önce ortak <TopBar /> yaz: el çizimi logo,
Stüdyo · Tasarımlarım · Doğrula (aktif sayfada karalama alt çizgi), cüzdan butonu
(idle → bağlanıyor → bağlı: kısaltılmış adres + "Monad Testnet"; şimdilik sahte,
adres placeholders.ts'ten). Sonra sayfanın tüm bölümleri: hero ("Çiz." Caveat +
mor karalama), kroki → 5 karakter → çıktı akışı, 3 adım, ekip (hover'da çalışma
animasyonu), formatlar, Monad bölümü, kapanış, footer. 1100 ve 820px kırılımları
dahil. Build, commit, dur.
```

## Faz 4 — Stüdyo

```
Faz 4: Studio.dc.html'i /studio rotasına çevir. Bileşenlere böl: Toolbar, Canvas,
SettingsPanel. Canvas çalışır olsun: kalem, kutu, daire, çizgi, metin notu (seçili
kelimeyle), silgi, geri/ileri al, temizle, PNG/JPG yükleme; koordinatlar 0–1000
normalize, pointer events + setPointerCapture. Oran formata göre değişsin (container
query ile). Boş canvas'ta Okuyucu ipucu + "Örnek kroki koy". Panelde format (zorunlu),
palet, açıklama; "Tasarla" koşullar sağlanınca /run'a gitsin ve seçimleri taşısın
(şimdilik sessionStorage yeterli). Build, commit, dur.
```

## Faz 5 — Agent sahnesi (demo modu)

```
Faz 5: Scene.dc.html'i /run rotasına çevir. Senaryo tablolarını (ACTIVE, SCORES, CRIT,
JL, EV, agentState, bubbleFor, specIdx, outLevel) lib/scenario.ts'e, zamanlama
mantığını (script zamanı soru anında durur, gerçek zaman akar, 8 sn sonra otomatik
cevap) lib/useScenario.ts'e taşı. Hook'un dışa verdiği state, ileride gerçek agent
olaylarıyla da beslenebilecek şekilde tasarlansın. Bileşenler: AgentSlot, SpecCard,
LoopArrow, QuestionModal (Buton / Görsel / Atla), JsonDrawer, AgentPanel (agent'a özel
sekmeler dahil), Timeline. Başlat / Sıfırla çalışsın. Build, commit, dur.
```

## Faz 6 — Kontrol turu

```
Faz 6: design-handoff/designs/ içindeki Landing, Studio ve Scene kaynaklarını
uygulamadaki /, /studio ve /run ile tek tek karşılaştır: renkler, fontlar, boşluklar,
el çizimi oklar ve ikonlar, Caveat kullanılan yerler, animasyonlar, 768px görünüm,
klavye odağı. Farkları önce liste halinde göster, onayımdan sonra düzelt. Build,
commit, dur.
```

---

Sonraki adımlar (gerçek agent'lar, Monad sözleşmesi, cüzdan, deploy) bu fazlar
bitince ayrı ayrı yapılacak.
