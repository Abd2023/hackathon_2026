import { chromium, Page } from "playwright";
import { MarketplaceProvider } from "../marketplaces/provider";
import { ProductIdentification } from "../schemas/product";
import { MarketplaceListing } from "../schemas/marketplace";
import { SourceFetchResult } from "./types";
import { randomDelay, withTimeout } from "./rate-limit";

type HepsiburadaProductSnapshot = {
  title: string;
  url: string;
  priceTRY?: number;
  sellerName?: string;
  productRating?: number;
  reviewCount?: number;
  imageUrl?: string;
  shippingSummary?: string;
  keyFeatures?: string;
};

type HepsiburadaSearchCandidate = {
  title: string;
  url: string;
  priceTRY?: number;
  imageUrl?: string;
  similarityScore: number;
};

const HEPSIBURADA_ORIGIN = "https://www.hepsiburada.com";

function shouldRunHeadless() {
  if (process.env.HEPSIBURADA_HEADLESS === "true") return true;
  if (process.env.HEPSIBURADA_HEADLESS === "false") return false;
  return process.env.NODE_ENV === "production";
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value?: string | null) {
  if (!value) return undefined;

  const cleaned = value
    .replace(/\{[\s\S]*$/, "")
    .replace(/\/\*!sc\*\/[\s\S]*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || undefined;
}

function parsePrice(text?: string | null) {
  if (!text) return undefined;

  const matches = [...text.matchAll(/(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{2}))?\s*TL/gi)];
  if (matches.length === 0) return undefined;

  const [, whole, fraction] = matches[0];
  const normalized = `${whole.replace(/\./g, "")}.${fraction || "00"}`;
  const value = Number.parseFloat(normalized);

  return Number.isFinite(value) ? value : undefined;
}

function parseRatingAndReviewCount(text?: string | null) {
  const cleaned = cleanText(text);
  if (!cleaned) return {};

  const compactMatch = cleaned.match(/^(\d+[,.]\d)(\d+)\s*Değerlendirme/i);
  if (compactMatch) {
    return {
      productRating: Number.parseFloat(compactMatch[1].replace(",", ".")),
      reviewCount: Number.parseInt(compactMatch[2], 10),
    };
  }

  const ratingMatch = cleaned.match(/^(\d+[,.]\d)/);
  const reviewMatch = cleaned.match(/(\d+)\s*Değerlendirme/i);

  return {
    productRating: ratingMatch ? Number.parseFloat(ratingMatch[1].replace(",", ".")) : undefined,
    reviewCount: reviewMatch ? Number.parseInt(reviewMatch[1], 10) : undefined,
  };
}

function cleanSellerName(text?: string | null) {
  const cleaned = cleanText(text);
  if (!cleaned) return undefined;

  const withoutPrefix = cleaned
    .replace(/^Satıcı:\s*/i, "")
    .replace(/Resmi Satıcı[\s\S]*$/i, "")
    .replace(/Yetkili satıcı[\s\S]*$/i, "")
    .replace(/Takip et$/i, "")
    .trim();

  return withoutPrefix || cleaned;
}

function absoluteHepsiburadaUrl(href?: string | null) {
  if (!href || href.startsWith("javascript:")) return undefined;
  return new URL(href, HEPSIBURADA_ORIGIN).toString().split("?")[0];
}

function buildSearchProfile(input: ProductIdentification) {
  const normalizedInput = normalizeText([
    input.productName,
    input.brand,
    input.model,
    input.category,
    ...input.searchQueries,
  ].filter(Boolean).join(" "));
  const normalizedModel = normalizeText(input.model || "");

  return {
    normalizedInput,
    normalizedModel,
    terms: normalizedInput.split(" ").filter((term) => term.length > 2),
    requiredTerms: normalizedModel.split(" ").filter((term) => term.length > 1),
    numberTokens: [...new Set(normalizedInput.match(/\b\d{2,4}\b/g) || [])],
  };
}

function scoreTitle(title: string, profile: ReturnType<typeof buildSearchProfile>) {
  const normalizedTitle = normalizeText(title);
  if (!normalizedTitle) return 0;

  if (profile.numberTokens.some((token) => !normalizedTitle.includes(token))) {
    return 0;
  }

  if (profile.requiredTerms.length > 0 && profile.requiredTerms.some((term) => !normalizedTitle.includes(term))) {
    return 0;
  }

  let score = profile.terms.reduce((currentScore, term) => (
    currentScore + (normalizedTitle.includes(term) ? 1 : 0)
  ), 0);

  if (profile.normalizedModel && normalizedTitle.includes(profile.normalizedModel)) {
    score += 20;
  }

  return Math.max(0, score);
}

async function createHepsiburadaPage() {
  const browser = await chromium.launch({
    headless: shouldRunHeadless(),
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
  const context = await browser.newContext({
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    viewport: { width: 1366, height: 768 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    extraHTTPHeaders: {
      "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  return context.newPage();
}

export class HepsiburadaProvider implements MarketplaceProvider {
  id = "hepsiburada";

  async search(input: ProductIdentification): Promise<MarketplaceListing[]> {
    const result = await this.fetchLive(input);
    if (result.ok) return result.data;

    console.error(`Hepsiburada scraper failed: ${result.reason}`);
    return [];
  }

  async fetchProductByUrl(url: string): Promise<SourceFetchResult<MarketplaceListing>> {
    let page: Page | undefined;

    try {
      page = await createHepsiburadaPage();
      const snapshot = await this.scrapeProductSnapshot(page, url);

      if (!snapshot.ok) return snapshot;
      if (!snapshot.data.priceTRY) return { ok: false, reason: "price_unavailable" };

      return {
        ok: true,
        sourceStatus: "live",
        data: this.snapshotToListing(snapshot.data),
      };
    } catch (error) {
      return this.mapError(error);
    } finally {
      await page?.context().browser()?.close().catch(() => undefined);
    }
  }

  async fetchLive(input: ProductIdentification): Promise<SourceFetchResult<MarketplaceListing[]>> {
    let page: Page | undefined;
    const query = encodeURIComponent(input.searchQueries[0] || input.productName);
    const url = `https://www.hepsiburada.com/ara?q=${query}`;

    try {
      page = await createHepsiburadaPage();
      await withTimeout(page.goto(url, { waitUntil: "domcontentloaded" }), this.timeoutMs(), "Page load timeout");
      await randomDelay(1800, 2600);

      if (await this.isSecurityPage(page)) {
        return { ok: false, reason: "blocked" };
      }

      const candidates = await this.parseSearchCandidates(page, input);
      const listings: MarketplaceListing[] = [];

      for (const candidate of candidates.slice(0, 3)) {
        const detail = await this.scrapeProductSnapshot(page, candidate.url);

        if (detail.ok && detail.data.priceTRY) {
          listings.push(this.snapshotToListing(detail.data, candidate));
        } else if (candidate.priceTRY) {
          listings.push(this.candidateToListing(candidate));
        }

        await randomDelay(250, 500);
      }

      if (listings.length === 0) {
        return { ok: false, reason: "price_unavailable" };
      }

      return { ok: true, data: this.dedupeListings(listings), sourceStatus: "live" };
    } catch (error) {
      return this.mapError(error);
    } finally {
      await page?.context().browser()?.close().catch(() => undefined);
    }
  }

  private async scrapeProductSnapshot(page: Page, url: string): Promise<SourceFetchResult<HepsiburadaProductSnapshot>> {
    await withTimeout(page.goto(url, { waitUntil: "domcontentloaded" }), this.timeoutMs(), "Page load timeout");
    await randomDelay(1800, 2600);

    if (await this.isSecurityPage(page)) {
      return { ok: false, reason: "blocked" };
    }

    const snapshot = await page.evaluate(`(() => {
      const text = (selector) => document.querySelector(selector)?.textContent?.replace(/\\s+/g, " ").trim();
      const attr = (selector, name) => document.querySelector(selector)?.getAttribute(name) || undefined;

      return {
        title: text('[data-test-id="title"]') || text("h1") || "",
        url: window.location.href.split("?")[0],
        priceText: text('[data-test-id="checkout-price"]')
          || text('[data-test-id="default-price"]')
          || text('[data-test-id="price-current-price"]')
          || text('[data-test-id="price"]'),
        sellerText: text('[data-test-id="buyBox-seller"]') || text('[data-test-id="merchant-name"]'),
        ratingText: text('[data-test-id="has-review"]'),
        imageUrl: attr('img[src*="productimages"]', "src") || attr("img", "src"),
        shippingText: text('[data-test-id="delivery-options"]') || text('[data-test-id="shipment-text"]'),
        keyFeatures: text('[data-test-id="key-features"]') || text('[data-test-id="KeyFeaturesTable"]'),
      };
    })()`) as {
      title: string;
      url: string;
      priceText?: string;
      sellerText?: string;
      ratingText?: string;
      imageUrl?: string;
      shippingText?: string;
      keyFeatures?: string;
    };

    if (!snapshot.title) {
      return { ok: false, reason: "selector_failed" };
    }

    const rating = parseRatingAndReviewCount(snapshot.ratingText);

    return {
      ok: true,
      sourceStatus: "live",
      data: {
        title: snapshot.title,
        url: snapshot.url,
        priceTRY: parsePrice(snapshot.priceText),
        sellerName: cleanSellerName(snapshot.sellerText),
        productRating: rating.productRating,
        reviewCount: rating.reviewCount,
        imageUrl: snapshot.imageUrl,
        shippingSummary: cleanText(snapshot.shippingText),
        keyFeatures: cleanText(snapshot.keyFeatures),
      },
    };
  }

  private async parseSearchCandidates(
    page: Page,
    input: ProductIdentification
  ): Promise<HepsiburadaSearchCandidate[]> {
    const profile = buildSearchProfile(input);
    const candidates = await page.evaluate(`(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="-p-"], a[href*="-pm-"]'));
      return anchors.flatMap((anchor) => {
        const href = anchor.getAttribute("href") || "";
        if (!href) return [];

        const title = anchor.textContent?.replace(/\s+/g, " ").trim() || anchor.getAttribute("title") || "";
        if (!title || title.length < 12) return [];

        const container = anchor.closest("li") || anchor.parentElement;
        const priceText = Array.from(container?.querySelectorAll("[data-test-id^='final-price'], [data-test-id='price-current-price']") || [])
          .map((el) => el.textContent?.replace(/\s+/g, " ").trim())
          .find(Boolean);
        const imageUrl = container?.querySelector("img")?.getAttribute("src") || undefined;

        return [{ title, href, priceText, imageUrl }];
      });
    })()`) as Array<{ title: string; href: string; priceText?: string; imageUrl?: string }>;

    return candidates
      .map((candidate) => ({
        title: candidate.title,
        url: absoluteHepsiburadaUrl(candidate.href) || candidate.href,
        priceTRY: parsePrice(candidate.priceText),
        imageUrl: candidate.imageUrl,
        similarityScore: scoreTitle(candidate.title, profile),
      }))
      .filter((candidate) => candidate.similarityScore > 0 && candidate.url.startsWith(HEPSIBURADA_ORIGIN))
      .sort((a, b) => {
        if (b.similarityScore !== a.similarityScore) return b.similarityScore - a.similarityScore;
        return (a.priceTRY || Number.MAX_SAFE_INTEGER) - (b.priceTRY || Number.MAX_SAFE_INTEGER);
      });
  }

  private snapshotToListing(
    snapshot: HepsiburadaProductSnapshot,
    fallback?: HepsiburadaSearchCandidate
  ): MarketplaceListing {
    return {
      source: "hepsiburada",
      title: snapshot.title,
      url: snapshot.url,
      priceTRY: snapshot.priceTRY || fallback?.priceTRY || 1,
      sellerName: snapshot.sellerName || "Hepsiburada",
      sellerRating: undefined,
      productRating: snapshot.productRating,
      reviewCount: snapshot.reviewCount,
      imageUrl: snapshot.imageUrl || fallback?.imageUrl,
      shippingSummary: snapshot.shippingSummary,
      returnPolicySummary: "Hepsiburada iade koşulları kontrol edilmeli",
      reviewSnippets: snapshot.keyFeatures ? [snapshot.keyFeatures] : [],
      sourceStatus: "live",
    };
  }

  private candidateToListing(candidate: HepsiburadaSearchCandidate): MarketplaceListing {
    return {
      source: "hepsiburada",
      title: candidate.title,
      url: candidate.url,
      priceTRY: candidate.priceTRY || 1,
      sellerName: "Hepsiburada",
      imageUrl: candidate.imageUrl,
      returnPolicySummary: "Hepsiburada iade koşulları kontrol edilmeli",
      reviewSnippets: [],
      sourceStatus: "live",
    };
  }

  private dedupeListings(listings: MarketplaceListing[]) {
    const seen = new Set<string>();

    return listings.filter((listing) => {
      if (seen.has(listing.url)) return false;
      seen.add(listing.url);
      return true;
    });
  }

  private async isSecurityPage(page: Page) {
    const title = await page.title().catch(() => "");
    return /güvenlik|guvenlik|security/i.test(title);
  }

  private timeoutMs() {
    return Number(process.env.HEPSIBURADA_TIMEOUT_MS || process.env.SCRAPER_TIMEOUT_MS || 30000);
  }

  private mapError(error: unknown): SourceFetchResult<never> {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Hepsiburada scraper internal error:", message);
    if (message.toLocaleLowerCase("tr-TR").includes("timeout")) {
      return { ok: false, reason: "timeout" };
    }

    return { ok: false, reason: "network_error" };
  }
}
