import { ProductIdentification } from "../schemas/product";
import { MarketplaceListing } from "../schemas/marketplace";
import { FIXTURE_MARKETPLACE_RESULTS } from "../fixtures/marketplace-results";

export interface MarketplaceProvider {
  id: string;
  search(input: ProductIdentification): Promise<MarketplaceListing[]>;
}

function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");
}

function classifyFixtureKey(input: ProductIdentification) {
  const haystack = normalizeSearchText([
    input.productName,
    input.brand,
    input.model,
    input.category,
    ...input.searchQueries,
  ].filter(Boolean).join(" "));

  if (/(klavye|keyboard|keychron|razer|ornata|mekanik|membran|chroma)/.test(haystack)) {
    return "keyboard";
  }

  if (/(mouse|fare|logitech|mx master|superlight|g pro)/.test(haystack)) {
    return "mouse";
  }

  if (/(kulaklik|headphone|sony|wh-1000|xm5|airpods|jbl)/.test(haystack)) {
    return "headphones";
  }

  if (/(telefon|smartphone|samsung|galaxy|iphone|xiaomi|pixel)/.test(haystack)) {
    return "smartphone";
  }

  if (/(supurge|vacuum|roborock|robot temizleyici|robot supurge)/.test(haystack)) {
    return "vacuum";
  }

  return undefined;
}

function createProductAwareFallback(input: ProductIdentification): MarketplaceListing[] {
  const safeName = input.productName || input.searchQueries[0] || "Tespit edilen ürün";
  const query = encodeURIComponent(input.searchQueries[0] || safeName);

  return [
    {
      source: "amazon_tr",
      title: `${safeName} - Amazon TR arama sonucu`,
      url: `https://www.amazon.com.tr/s?k=${query}`,
      priceTRY: 1999,
      sellerName: "Amazon.com.tr",
      sellerRating: 4.6,
      productRating: 4.2,
      reviewCount: 120,
      shippingSummary: "Canlı veri alınamadı; arama bağlantısı hazırlandı.",
      returnPolicySummary: "Pazaryeri iade koşulları kontrol edilmeli.",
      reviewSnippets: [],
      sourceStatus: "fixture",
    },
    {
      source: "trendyol",
      title: `${safeName} - Trendyol arama sonucu`,
      url: `https://www.trendyol.com/sr?q=${query}`,
      priceTRY: 2149,
      sellerName: "Pazaryeri satıcısı",
      sellerRating: 4.3,
      productRating: 4.1,
      reviewCount: 75,
      shippingSummary: "Canlı veri alınamadı; arama bağlantısı hazırlandı.",
      returnPolicySummary: "Satıcı bazlı iade koşulları kontrol edilmeli.",
      reviewSnippets: [],
      sourceStatus: "fixture",
    },
    {
      source: "hepsiburada",
      title: `${safeName} - Hepsiburada arama sonucu`,
      url: `https://www.hepsiburada.com/ara?q=${query}`,
      priceTRY: 2099,
      sellerName: "Pazaryeri satıcısı",
      sellerRating: 4.2,
      productRating: 4.0,
      reviewCount: 60,
      shippingSummary: "Canlı veri alınamadı; arama bağlantısı hazırlandı.",
      returnPolicySummary: "Satıcı bazlı iade koşulları kontrol edilmeli.",
      reviewSnippets: [],
      sourceStatus: "fixture",
    },
  ];
}

export class FixtureProvider implements MarketplaceProvider {
  id = "fixture";

  async search(input: ProductIdentification): Promise<MarketplaceListing[]> {
    const fixtureKey = classifyFixtureKey(input);
    const fixtures = fixtureKey ? FIXTURE_MARKETPLACE_RESULTS[fixtureKey] : undefined;

    await new Promise((resolve) => setTimeout(resolve, 300));

    if (fixtures && fixtures.length > 0) {
      return fixtures;
    }

    return createProductAwareFallback(input);
  }
}

export class HybridProvider implements MarketplaceProvider {
  id = "hybrid";
  private fixtureProvider = new FixtureProvider();

  async search(input: ProductIdentification): Promise<MarketplaceListing[]> {
    const dataMode = process.env.DATA_MODE || "fixture";

    if (dataMode === "fixture") {
      return this.fixtureProvider.search(input);
    }

    try {
      const { AmazonProvider } = await import("../scraping/amazon-provider");
      const { HepsiburadaProvider } = await import("../scraping/hepsiburada-provider");
      const { TrendyolProvider } = await import("../scraping/trendyol-provider");
      const amazon = new AmazonProvider();
      const hepsiburada = new HepsiburadaProvider();
      const trendyol = new TrendyolProvider();
      const liveResults = (await Promise.all([
        amazon.search(input),
        hepsiburada.search(input),
        trendyol.search(input),
      ])).flat();

      if (liveResults.length > 0) {
        return liveResults;
      }

      console.warn("Live scraping returned 0 results, falling back to product-aware fixtures.");
      return this.fixtureProvider.search(input);
    } catch (err) {
      console.error("Hybrid provider failed to run live scraper:", err);
      return this.fixtureProvider.search(input);
    }
  }
}
