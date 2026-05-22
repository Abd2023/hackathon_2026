# Görsel Asistan

Görsel Asistan, ürün fotoğrafından alışveriş kararı vermeye yardımcı olan mobil uyumlu bir Next.js web uygulamasıdır. Kullanıcı ürünün fotoğrafını yükler veya çeker; uygulama Gemini ile ürünü tanımlar, Türkiye’deki pazaryeri sonuçlarını karşılaştırır ve fiyat, satıcı güveni, yorum sinyalleri, iade/kargo bilgileri ve kullanıcının özel şartına göre en mantıklı seçeneği önerir.

Bu proje Hackathon 2026 için geliştirilmiştir. Yarışma gereği Gemini ana yapay zeka bileşenidir.

## Temel Özellikler

- **Görsel ürün tanıma:** Gemini, yüklenen fotoğraftan ürün adı, marka, model, kategori, arama sorguları, görsel güven puanı ve belirsizlik notları üretir.
- **Pazaryeri karşılaştırması:** Amazon.com.tr, Hepsiburada ve Trendyol için canlı scraping altyapısı ve demo/fixture fallback sistemi vardır.
- **Özel şart analizi:** Kullanıcı “tekerleği çabuk bozulmasın” gibi bir deal-breaker yazabilir. Sistem yorum sinyallerine göre bu şartı değerlendirir.
- **Deterministik puanlama:** Fiyat, satıcı puanı, ürün puanı, yorum sayısı, iade/kargo sinyalleri ve özel şart sonucu birlikte puanlanır.
- **Demo güvenliği:** Gemini kota sorunlarını azaltmak için `gemini-2.5-flash-lite`, tek deneme, model cooldown, image hash cache ve request coalescing kullanılır.
- **Mobil öncelikli arayüz:** Kullanıcıya güven veren, sıcak ve anlaşılır bir alışveriş asistanı deneyimi hedeflenir.

## Çalışma Akışı

1. Kullanıcı ürün görselini yükler.
2. Görsel, tarayıcıda küçültülerek API’ye gönderilir.
3. `Vision Agent`, Gemini ile ürünü yapılandırılmış JSON olarak tanımlar.
4. `HybridProvider`, ürün için pazaryeri sonuçlarını canlı scraping veya fixture veriyle toplar.
5. Özel şart varsa `Deal Breaker Agent` yorum kanıtlarını değerlendirir.
6. `Recommendation Agent`, demo modda deterministik puanlama ile en iyi ilanı ve alternatif öneriyi seçer.
7. Sonuç ekranı “Önerilen”, “En Ucuz”, “Güvenli Satıcı”, artılar, eksikler ve alternatif öneriyi gösterir.

## Teknoloji

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Google Gemini API (`@google/genai`)
- Playwright ve Cheerio tabanlı scraping
- Zod şemaları

## Proje Yapısı

- `src/app`: Next.js sayfaları, layout ve `/api/analyze` route handler’ı.
- `src/components`: Header, yükleme ekranı ve sonuç arayüzü.
- `src/lib/agents`: Gemini ve karar ajanları.
- `src/lib/gemini`: Gemini client ve prompt dosyaları.
- `src/lib/marketplaces`: Fixture/canlı veri sağlayıcı katmanı.
- `src/lib/scraping`: Amazon TR, Hepsiburada ve Trendyol scraper’ları.
- `src/lib/scoring`: Deterministik ilan puanlama sistemi.
- `src/lib/schemas`: Product, marketplace ve analiz Zod şemaları.
- `e2e`: Playwright uçtan uca testleri.

## Kurulum

```bash
npm install
```

`.env.example` dosyasını `.env.local` olarak kopyalayın:

```bash
cp .env.example .env.local
```

Gemini API anahtarınızı ekleyin:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Geliştirme sunucusunu çalıştırın:

```bash
npm run dev
```

Uygulama varsayılan olarak şu adreste açılır:

```text
http://localhost:3000
```

## Önemli Ortam Değişkenleri

```env
GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_FALLBACK_MODELS=
GEMINI_MAX_ATTEMPTS=1
GEMINI_MODEL_COOLDOWN_MS=60000
GEMINI_RECOMMENDATION_ENABLED=false
ANALYSIS_CACHE_TTL_MS=1800000
ANALYSIS_CACHE_MAX_ENTRIES=50
DATA_MODE=fixture
```

- `GEMINI_MODEL`: Demo için önerilen ana model `gemini-2.5-flash-lite`.
- `GEMINI_RECOMMENDATION_ENABLED=false`: Final öneride ek Gemini çağrısı yapılmaz; kota tasarrufu için deterministik puanlama kullanılır.
- `DATA_MODE=fixture`: Güvenli demo verisi kullanır.
- `DATA_MODE=hybrid` veya canlı mod: Amazon, Hepsiburada ve Trendyol scraper’larını dener; başarısız olursa fixture fallback’e döner.
- `ANALYSIS_CACHE_TTL_MS`: Aynı görsel ve özel şart için sonuçları geçici olarak cache’ler.

## Komutlar

```bash
npm run dev
npm run build
npm run lint
npx playwright test
```

## Demo Notları

Gemini free-tier kota limitleri canlı demo sırasında risklidir. En güvenli yarışma çözümü küçük bütçeli paid-tier/prepaid kullanım, `gemini-2.5-flash-lite`, cache, request coalescing ve harcama limiti/kill-switch yaklaşımıdır. Tek bir free-tier proje ile demo yapılacaksa aynı görseli tekrar tekrar analiz etmekten kaçınmak, görselleri küçültmek ve final Gemini öneri çağrısını kapalı tutmak gerekir.

## Kanıt Kaynakları

Uygulama artılar, eksikler ve öneri cümlelerini şu verilerden üretir:

- Gemini görsel tanıma sonucu
- İlan fiyatı
- Satıcı puanı
- Ürün puanı
- Yorum sayısı
- Yorum alıntıları
- Kargo ve iade metinleri
- Kullanıcının özel şartı için yorum kanıtı

Kesin yüzdelik yorum iddiaları üretmek için daha geniş yorum toplama ve sentiment sınıflandırma katmanı gerekir. Mevcut sürüm güvenli tarafta kalır ve yalnızca eldeki kanıtlara dayalı açıklama yapar.
