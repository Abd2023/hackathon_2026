import { chromium, Page } from "playwright";
import { MarketplaceProvider } from "../marketplaces/provider";
import { ProductIdentification } from "../schemas/product";
import { MarketplaceListing } from "../schemas/marketplace";
import { SourceFetchResult } from "./types";
import { randomDelay, withTimeout } from "./rate-limit";

type TrendyolProductSnapshot = {
  title: string;
  url: string;
  priceTRY?: number;
  sellerName?: string;
  sellerRating?: number;
  productRating?: number;
  reviewCount?: number;
  imageUrl?: string;
  shippingSummary?: string;
  keyFeatures?: string;
  reviewUrl?: string;
  reviewSnippets: string[];
};

type TrendyolSearchCandidate = {
  title: string;
  url: string;
  priceTRY?: number;
  imageUrl?: string;
  similarityScore: number;
};

const TRENDYOL_ORIGIN = "https://www.trendyol.com";

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value?: string | null) {
  if (!value) return undefined;

  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/Devamini Oku/gi, "")
    .replace(/Devamını Oku/gi, "")
    .trim();

  return cleaned || undefined;
}

function parsePrice(text?: string | null) {
  if (!text) return undefined;

  const normalizedText = text.replace(/\u00a0/g, " ").replace(/₺/g, " TL");
  const matches = [...normalizedText.matchAll(/(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?\s*TL/gi)];
  if (matches.length === 0) return undefined;

  const selected = matches[0];
  const [, whole, fraction] = selected;
  const normalizedFraction = (fraction || "00").padEnd(2, "0").slice(0, 2);
  const value = Number.parseFloat(`${whole.replace(/\./g, "")}.${normalizedFraction}`);

  return Number.isFinite(value) ? value : undefined;
}

function parseRating(text?: string | null) {
  const cleaned = cleanText(text);
  if (!cleaned) return undefined;

  const match = cleaned.match(/(\d+[,.]\d+)/);
  if (!match) return undefined;

  const value = Number.parseFloat(match[1].replace(",", "."));
  return Number.isFinite(value) ? value : undefined;
}

function parseReviewCount(text?: string | null) {
  const cleaned = cleanText(text);
  if (!cleaned) return undefined;

  const match = cleaned.match(/([\d.,]+)\s*(B)?\s*(Degerlendirme|Değerlendirme|Yorum)/i);
  if (!match) return undefined;

  const value = Number.parseFloat(match[1].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(value)) return undefined;

  return match[2] ? Math.round(value * 1000) : Math.round(value);
}

function parseSellerRating(text?: string | null) {
  const cleaned = cleanText(text);
  if (!cleaned) return undefined;

  const match = cleaned.match(/(\d+[,.]\d+)/);
  if (!match) return undefined;

  const ratingOutOfTen = Number.parseFloat(match[1].replace(",", "."));
  if (!Number.isFinite(ratingOutOfTen)) return undefined;

  return Math.min(5, Math.max(0, ratingOutOfTen / 2));
}

function absoluteTrendyolUrl(href?: string | null) {
  if (!href || href.startsWith("javascript:")) return undefined;
  const url = new URL(href, TRENDYOL_ORIGIN);
  return `${url.origin}${url.pathname}${url.search}`;
}

function normalizeProductUrl(url: string) {
  const parsed = new URL(url, TRENDYOL_ORIGIN);
  return `${parsed.origin}${parsed.pathname}${parsed.search}`;
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
    terms: normalizedInput.split(" ").filter((term) => term.length > 1),
    requiredTerms: normalizedModel.split(" ").filter((term) => term.length > 1),
    numberTokens: [...new Set(normalizedInput.match(/\b\d{2,4}\b/g) || [])],
    modelLikeTokens: [...new Set(normalizedInput.match(/\b[a-z]*\d+[a-z0-9]*\b/g) || [])],
  };
}

function scoreTitle(title: string, profile: ReturnType<typeof buildSearchProfile>) {
  const normalizedTitle = normalizeText(title);
  if (!normalizedTitle) return 0;

  if (profile.numberTokens.some((token) => !normalizedTitle.includes(token))) {
    return 0;
  }

  if (profile.modelLikeTokens.some((token) => !normalizedTitle.includes(token))) {
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

function shouldRunHeadless() {
  if (process.env.TRENDYOL_HEADLESS === "false") return false;
  return true;
}

async function createTrendyolPage() {
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

export class TrendyolProvider implements MarketplaceProvider {
  id = "trendyol";

  async search(input: ProductIdentification): Promise<MarketplaceListing[]> {
    const result = await this.fetchLive(input);
    if (result.ok) return result.data;

    console.error(`Trendyol scraper failed: ${result.reason}`);
    return [];
  }

  async fetchProductByUrl(url: string): Promise<SourceFetchResult<MarketplaceListing>> {
    let page: Page | undefined;

    try {
      page = await createTrendyolPage();
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

  async fetchReviewsByUrl(url: string): Promise<SourceFetchResult<string[]>> {
    let page: Page | undefined;

    try {
      page = await createTrendyolPage();
      const comments = await this.scrapeReviewSnippets(page, url);
      if (comments.length === 0) return { ok: false, reason: "selector_failed" };

      return { ok: true, sourceStatus: "live", data: comments };
    } catch (error) {
      return this.mapError(error);
    } finally {
      await page?.context().browser()?.close().catch(() => undefined);
    }
  }

  async fetchLive(input: ProductIdentification): Promise<SourceFetchResult<MarketplaceListing[]>> {
    let page: Page | undefined;
    const query = encodeURIComponent(input.searchQueries[0] || input.productName);
    const url = `${TRENDYOL_ORIGIN}/sr?q=${query}`;

    try {
      page = await createTrendyolPage();
      await withTimeout(page.goto(url, { waitUntil: "domcontentloaded" }), this.timeoutMs(), "Page load timeout");
      await randomDelay(1000, 1600);

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

  private async scrapeProductSnapshot(page: Page, url: string): Promise<SourceFetchResult<TrendyolProductSnapshot>> {
    await withTimeout(page.goto(url, { waitUntil: "domcontentloaded" }), this.timeoutMs(), "Page load timeout");
    await randomDelay(1000, 1600);
    await page.mouse.wheel(0, 700).catch(() => undefined);
    await randomDelay(250, 450);

    const snapshot = await page.evaluate(`(() => {
      const text = (selector) => document.querySelector(selector)?.textContent?.replace(/\\s+/g, " ").trim();
      const attr = (selector, name) => document.querySelector(selector)?.getAttribute(name) || undefined;
      const absoluteUrl = (href) => href ? new URL(href, window.location.origin).toString() : undefined;
      const priceText = text('[data-testid="normal-price"]')
        || text(".price-wrapper .new-price")
        || text(".price-wrapper .price-view .discounted")
        || text(".price-wrapper .discounted")
        || text(".price-wrapper .prc-dsc")
        || text(".price-wrapper");
      const reviewLink = document.querySelector('[data-testid="review-info-link"], a[href*="/yorumlar"]');
      const reviewCountText = text('[data-testid="review-info-link"]') || text(".product-review-summary") || text(".reviews-summary-reviews-detail");
      const sellerLinkText = text('[data-testid="store-link"]');
      const sellerInfoText = text(".seller-info") || text('[data-testid="seller-info"]');
      const featureText = text('[data-testid="attributes-section"]') || text(".attribute-sections") || text(".product-attributes");
      const imageUrl = attr('[data-testid="product-image-gallery-container"] img[data-testid="image"]', "src")
        || attr('img[data-testid="image"]', "src")
        || attr('img[src*="/prod/"][src*="_org_zoom"]', "src")
        || attr('img[src*="/prod/"]', "src");

      return {
        title: text('[data-testid="product-title"]') || text("h1") || "",
        url: window.location.href,
        priceText,
        sellerName: sellerLinkText || undefined,
        sellerInfoText,
        ratingText: text(".reviews-summary-average-rating") || text(".rating-score") || text(".product-rating-score"),
        reviewCountText,
        imageUrl,
        shippingText: text(".delivery-options") || text(".shipment-text") || text('[data-testid="delivery-info"]'),
        keyFeatures: featureText,
        reviewUrl: absoluteUrl(reviewLink?.getAttribute("href")),
      };
    })()`) as {
      title: string;
      url: string;
      priceText?: string;
      sellerName?: string;
      sellerInfoText?: string;
      ratingText?: string;
      reviewCountText?: string;
      imageUrl?: string;
      shippingText?: string;
      keyFeatures?: string;
      reviewUrl?: string;
    };

    if (!snapshot.title) {
      return { ok: false, reason: "selector_failed" };
    }

    const reviewSnippets = snapshot.reviewUrl
      ? await this.scrapeReviewSnippets(page, snapshot.reviewUrl).catch(() => [])
      : [];

    return {
      ok: true,
      sourceStatus: "live",
      data: {
        title: snapshot.title,
        url: normalizeProductUrl(snapshot.url),
        priceTRY: parsePrice(snapshot.priceText),
        sellerName: cleanText(snapshot.sellerName) || "Trendyol saticisi",
        sellerRating: parseSellerRating(snapshot.sellerInfoText),
        productRating: parseRating(snapshot.ratingText),
        reviewCount: parseReviewCount(snapshot.reviewCountText),
        imageUrl: snapshot.imageUrl,
        shippingSummary: cleanText(snapshot.shippingText),
        keyFeatures: cleanText(snapshot.keyFeatures),
        reviewUrl: snapshot.reviewUrl,
        reviewSnippets,
      },
    };
  }

  private async scrapeReviewSnippets(page: Page, url: string) {
    await withTimeout(page.goto(url, { waitUntil: "domcontentloaded" }), this.timeoutMs(), "Page load timeout");
    await randomDelay(1200, 1800);
    await page.mouse.wheel(0, 1400).catch(() => undefined);
    await randomDelay(500, 800);

    const comments = await page.evaluate(`(() => (
      Array.from(document.querySelectorAll(".review-comment span.review-comment, span.review-comment, .comment-body span"))
        .map((element) => element.textContent?.replace(/\\s+/g, " ").trim())
        .filter((value) => Boolean(value && value.length > 10))
        .slice(0, 12)
    ))()`) as string[];

    return comments.map((comment) => cleanText(comment)).filter((comment): comment is string => Boolean(comment));
  }

  private async parseSearchCandidates(
    page: Page,
    input: ProductIdentification
  ): Promise<TrendyolSearchCandidate[]> {
    const profile = buildSearchProfile(input);
    const candidates = await page.evaluate(`(() => {
      const text = (root, selector) => root.querySelector(selector)?.textContent?.replace(/\\s+/g, " ").trim();

      return Array.from(document.querySelectorAll("a[href*='-p-']"))
        .flatMap((anchor) => {
          const href = anchor.getAttribute("href") || "";
          const card = anchor.closest(".p-card-wrppr, [data-testid='product-card'], .prdct-cntnr-wrppr") || anchor;
          const title = text(card, ".prdct-desc-cntnr")
            || text(card, ".prdct-desc-cntnr-name")
            || text(card, "[data-testid='product-card-name']")
            || anchor.textContent?.replace(/\\s+/g, " ").trim()
            || anchor.getAttribute("title")
            || "";

          if (!title || title.length < 12) return [];

        const priceText = text(card, '[data-testid="single-price"]')
          || text(card, '[data-testid="price-section"]')
          || text(card, ".single-price")
          || text(card, ".price-section")
          || text(card, ".prc-box-dscntd")
          || text(card, ".prc-box-orgnl")
          || text(card, "[data-testid='price-current-price']")
          || text(card, "[class*='price']");
          const imageUrl = card.querySelector("img")?.getAttribute("src") || undefined;

          return [{ title, href, priceText, imageUrl }];
        });
    })()`) as Array<{ title: string; href: string; priceText?: string; imageUrl?: string }>;

    const seen = new Set<string>();

    return candidates
      .map((candidate) => ({
        title: candidate.title,
        url: absoluteTrendyolUrl(candidate.href) || candidate.href,
        priceTRY: parsePrice(candidate.priceText),
        imageUrl: candidate.imageUrl,
        similarityScore: scoreTitle(candidate.title, profile),
      }))
      .filter((candidate) => {
        if (candidate.similarityScore <= 0 || !candidate.url.startsWith(TRENDYOL_ORIGIN)) return false;
        const key = normalizeProductUrl(candidate.url);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => {
        if (b.similarityScore !== a.similarityScore) return b.similarityScore - a.similarityScore;
        return (a.priceTRY || Number.MAX_SAFE_INTEGER) - (b.priceTRY || Number.MAX_SAFE_INTEGER);
      });
  }

  private snapshotToListing(
    snapshot: TrendyolProductSnapshot,
    fallback?: TrendyolSearchCandidate
  ): MarketplaceListing {
    return {
      source: "trendyol",
      title: snapshot.title,
      url: snapshot.url,
      priceTRY: snapshot.priceTRY || fallback?.priceTRY || 1,
      sellerName: snapshot.sellerName || "Trendyol saticisi",
      sellerRating: snapshot.sellerRating,
      productRating: snapshot.productRating,
      reviewCount: snapshot.reviewCount,
      imageUrl: snapshot.imageUrl || fallback?.imageUrl,
      shippingSummary: snapshot.shippingSummary,
      returnPolicySummary: "Trendyol iade kosullari kontrol edilmeli",
      reviewSnippets: snapshot.reviewSnippets.length > 0
        ? snapshot.reviewSnippets
        : [snapshot.keyFeatures].filter((value): value is string => Boolean(value)),
      sourceStatus: "live",
    };
  }

  private candidateToListing(candidate: TrendyolSearchCandidate): MarketplaceListing {
    return {
      source: "trendyol",
      title: candidate.title,
      url: candidate.url,
      priceTRY: candidate.priceTRY || 1,
      sellerName: "Trendyol saticisi",
      imageUrl: candidate.imageUrl,
      returnPolicySummary: "Trendyol iade kosullari kontrol edilmeli",
      reviewSnippets: [],
      sourceStatus: "live",
    };
  }

  private dedupeListings(listings: MarketplaceListing[]) {
    const seen = new Set<string>();

    return listings.filter((listing) => {
      const key = normalizeProductUrl(listing.url);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private timeoutMs() {
    return Number(process.env.TRENDYOL_TIMEOUT_MS || process.env.SCRAPER_TIMEOUT_MS || 30000);
  }

  private mapError(error: unknown): SourceFetchResult<never> {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Trendyol scraper internal error:", message);
    if (message.toLocaleLowerCase("tr-TR").includes("timeout")) {
      return { ok: false, reason: "timeout" };
    }

    return { ok: false, reason: "network_error" };
  }
}
