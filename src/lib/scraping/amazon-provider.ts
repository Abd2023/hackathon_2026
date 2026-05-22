import * as cheerio from "cheerio";
import { Page } from "playwright";
import { MarketplaceProvider } from "../marketplaces/provider";
import { ProductIdentification } from "../schemas/product";
import { MarketplaceListing } from "../schemas/marketplace";
import { SourceFetchResult, MarketplaceConfig } from "./types";
import { MARKETPLACE_CONFIGS } from "./selectors";
import { createPage } from "./browser";
import { randomDelay, withTimeout } from "./rate-limit";

type AmazonSearchCandidate = MarketplaceListing & { similarityScore: number };

export type AmazonProductSnapshot = {
  title: string;
  url: string;
  priceTRY?: number;
  sellerName?: string;
  productRating?: number;
  reviewCount?: number;
  imageUrl?: string;
  availabilityText?: string;
  hasCaptcha: boolean;
};

const AMAZON_ORIGIN = "https://www.amazon.com.tr";

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

function parsePrice(text?: string | null) {
  if (!text) return undefined;

  const numeric = text
    .replace(/\u00a0/g, " ")
    .replace(/[^\d.,]/g, "")
    .trim();

  if (!numeric) return undefined;

  const normalized = numeric.includes(",")
    ? numeric.replace(/\./g, "").replace(",", ".")
    : numeric.replace(/\.(?=\d{3}(?:\D|$))/g, "");

  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : undefined;
}

function parseWholeFractionPrice($: cheerio.CheerioAPI, scope = "") {
  const whole = $(`${scope} .a-price-whole`).first().text().replace(/[^\d]/g, "");
  const fraction = $(`${scope} .a-price-fraction`).first().text().replace(/[^\d]/g, "");

  if (!whole) return undefined;

  const priceText = fraction ? `${whole}.${fraction.padEnd(2, "0").slice(0, 2)}` : whole;
  const price = Number.parseFloat(priceText);
  return Number.isFinite(price) ? price : undefined;
}

function parseRating(text?: string | null) {
  if (!text) return undefined;
  const normalizedText = text.toLocaleLowerCase("tr-TR");
  const match = normalizedText.match(/üzerinden\s*(\d+(?:[,.]\d+)?)/)
    || normalizedText.match(/(\d+(?:[,.]\d+)?)/);
  if (!match) return undefined;

  const rating = Number.parseFloat(match[1].replace(",", "."));
  return Number.isFinite(rating) ? rating : undefined;
}

function parseReviewCount(text?: string | null) {
  if (!text) return undefined;

  const compact = text.replace(/\u00a0/g, " ").trim();
  const match = compact.match(/([\d.,]+)\s*([Bb])?/);
  if (!match) return undefined;

  const value = Number.parseFloat(match[1].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(value)) return undefined;

  return match[2] ? Math.round(value * 1000) : Math.round(value);
}

function normalizeAmazonUrl(href?: string, base = AMAZON_ORIGIN) {
  if (!href || href.startsWith("javascript:") || href === "#") return undefined;

  const initialUrl = new URL(href, base);
  const sponsoredTarget = initialUrl.pathname === "/sspa/click"
    ? initialUrl.searchParams.get("url")
    : undefined;
  const url = sponsoredTarget ? new URL(sponsoredTarget, AMAZON_ORIGIN) : initialUrl;

  const productPath = url.pathname.match(/(.+?\/dp\/[A-Z0-9]{10})/i)?.[1]
    || url.pathname.match(/(\/dp\/[A-Z0-9]{10})/i)?.[1];

  return productPath ? `${AMAZON_ORIGIN}${productPath}` : url.toString();
}

function isCaptchaPage($: cheerio.CheerioAPI) {
  return $("form[action*='validateCaptcha']").length > 0 || $("title").text().includes("Robot Check");
}

function buildSearchProfile(input: ProductIdentification) {
  const normalizedInput = normalizeText([
    input.productName,
    input.brand,
    input.model,
    input.category,
    ...input.searchQueries,
  ].filter(Boolean).join(" "));

  return {
    normalizedInput,
    normalizedModel: normalizeText(input.model || ""),
    terms: normalizedInput
      .split(" ")
      .filter((term) => term.length > 2),
    requiredTerms: normalizeText(input.model || "")
      .split(" ")
      .filter((term) => term.length > 1),
    numberTokens: [...new Set(normalizedInput.match(/\b\d{2,4}\b/g) || [])],
  };
}

function scoreTitle(title: string, profile: ReturnType<typeof buildSearchProfile>) {
  const normalizedTitle = normalizeText(title);
  if (!normalizedTitle) return 0;

  if (/\b(skate|skatez|uyumlu|yedek|grip|kilif|kılıf|case|koruyucu|kapak|aksesuar)\b/.test(normalizedTitle)) {
    return 0;
  }

  if (profile.numberTokens.some((token) => !normalizedTitle.includes(token))) {
    return 0;
  }

  if (profile.requiredTerms.some((term) => !normalizedTitle.includes(term))) {
    return 0;
  }

  let score = profile.terms.reduce((currentScore, term) => (
    currentScore + (normalizedTitle.includes(term) ? 1 : 0)
  ), 0);

  if (profile.normalizedModel && normalizedTitle.includes(profile.normalizedModel)) {
    score += 20;
  }

  if (
    /\bviper v3 hyperspeed\b/.test(profile.normalizedInput)
    && /\bviper v3 pro\b/.test(normalizedTitle)
  ) {
    return 0;
  }

  const inputHasProMax = /\bpro max\b/.test(profile.normalizedInput);
  const titleHasProMax = /\bpro max\b/.test(normalizedTitle);
  if (inputHasProMax && !titleHasProMax) return 0;

  return Math.max(0, score);
}

function firstText($: cheerio.CheerioAPI, selectors: string[]) {
  for (const selector of selectors) {
    const value = $(selector).first().text().replace(/\s+/g, " ").trim();
    if (value) return value;
  }

  return undefined;
}

function cleanSellerName(value?: string) {
  if (!value) return undefined;
  return value
    .replace(/tarafından satılır.*$/i, "")
    .replace(/tarafindan satilir.*$/i, "")
    .replace(/satıcı[:\s]*/i, "")
    .trim() || value.trim();
}

function cleanAvailability(value?: string) {
  if (!value) return undefined;
  const cleaned = value
    .replace(/\{[\s\S]*$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || /^P\.when|function\(/i.test(cleaned)) return undefined;
  return cleaned;
}

export class AmazonProvider implements MarketplaceProvider {
  id = "amazon_tr";
  private config: MarketplaceConfig = MARKETPLACE_CONFIGS.amazon_tr;

  async search(input: ProductIdentification): Promise<MarketplaceListing[]> {
    const result = await this.fetchLive(input);
    if (result.ok) {
      return result.data;
    }

    console.error(`Amazon scraper failed: ${result.reason}`);
    return [];
  }

  async fetchProductByUrl(url: string): Promise<SourceFetchResult<MarketplaceListing>> {
    let page: Page | undefined;

    try {
      page = await createPage();
      const snapshot = await this.scrapeProductSnapshot(page, url);

      if (!snapshot.ok) return snapshot;
      if (!snapshot.data.priceTRY) return { ok: false, reason: "price_unavailable" };

      return {
        ok: true,
        sourceStatus: "live",
        data: this.snapshotToListing(snapshot.data),
      };
    } catch (error: unknown) {
      return this.mapError(error);
    } finally {
      await page?.context().close().catch(() => undefined);
    }
  }

  async fetchLive(input: ProductIdentification): Promise<SourceFetchResult<MarketplaceListing[]>> {
    const query = encodeURIComponent(input.searchQueries[0] || input.productName);
    const url = this.config.searchUrlTemplate.replace("{query}", query);
    const pageTimeoutMs = Number(process.env.SCRAPER_TIMEOUT_MS || 30000);
    let page: Page | undefined;

    try {
      page = await createPage();
      await randomDelay(this.config.delayRangeMs[0], this.config.delayRangeMs[1]);

      await withTimeout(page.goto(url, { waitUntil: "domcontentloaded" }), pageTimeoutMs, "Page load timeout");
      await randomDelay(300, 700);

      const html = await page.content();
      const $ = cheerio.load(html);

      if (isCaptchaPage($)) {
        return { ok: false, reason: "blocked" };
      }

      const candidates = this.parseSearchCandidates($, page.url(), input);
      if (candidates.length === 0) {
        return { ok: false, reason: "selector_failed" };
      }

      const listings: MarketplaceListing[] = [];
      const detailCandidates = candidates.slice(0, 3);

      for (const candidate of detailCandidates) {
        const detail = await this.scrapeProductSnapshot(page, candidate.url);
        if (detail.ok && detail.data.priceTRY) {
          listings.push(this.snapshotToListing(detail.data, candidate));
        } else if (Number.isFinite(candidate.priceTRY) && candidate.priceTRY > 0) {
          listings.push(candidate);
        }

        await randomDelay(150, 350);
      }

      const uniqueListings = this.dedupeListings(listings);
      if (uniqueListings.length === 0) {
        return { ok: false, reason: "price_unavailable" };
      }

      return { ok: true, data: uniqueListings, sourceStatus: "live" };
    } catch (error: unknown) {
      return this.mapError(error);
    } finally {
      await page?.context().close().catch(() => undefined);
    }
  }

  async scrapeProductSnapshot(page: Page, url: string): Promise<SourceFetchResult<AmazonProductSnapshot>> {
    const pageTimeoutMs = Number(process.env.SCRAPER_TIMEOUT_MS || 30000);

    await withTimeout(page.goto(url, { waitUntil: "domcontentloaded" }), pageTimeoutMs, "Page load timeout");
    await randomDelay(500, 900);

    const html = await page.content();
    const $ = cheerio.load(html);

    if (isCaptchaPage($)) {
      return { ok: false, reason: "blocked" };
    }

    const title = $("#productTitle").text().trim();
    if (!title) {
      return { ok: false, reason: "selector_failed" };
    }

    const priceText = firstText($, [
      "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
      "#apex_desktop .a-price .a-offscreen",
      ".apexPriceToPay .a-offscreen",
      "#priceblock_ourprice",
      "#priceblock_dealprice",
      "#price_inside_buybox",
      ".a-price .a-offscreen",
    ]);

    const priceTRY = parsePrice(priceText) ?? parseWholeFractionPrice($);
    const sellerName = cleanSellerName(firstText($, [
      "#sellerProfileTriggerId",
      "#merchant-info",
      "#tabular-buybox .tabular-buybox-text",
    ]));
    const availabilityText = cleanAvailability(firstText($, ["#availability", "#buybox", "#unqualifiedBuyBox"]));

    return {
      ok: true,
      sourceStatus: "live",
      data: {
        title,
        url: normalizeAmazonUrl(page.url()) || page.url(),
        priceTRY,
        sellerName,
        productRating: parseRating(firstText($, [
          "#acrPopover .a-icon-alt",
          ".reviewCountTextLinkedHistogram .a-icon-alt",
          "i[data-hook='average-star-rating'] span",
        ])),
        reviewCount: parseReviewCount(firstText($, [
          "#acrCustomerReviewText",
          "span[data-hook='total-review-count']",
        ])),
        imageUrl: $("#landingImage").attr("src") || $("#imgTagWrapperId img").attr("src") || undefined,
        availabilityText,
        hasCaptcha: false,
      },
    };
  }

  private parseSearchCandidates(
    $: cheerio.CheerioAPI,
    baseUrl: string,
    input: ProductIdentification
  ): AmazonSearchCandidate[] {
    const searchProfile = buildSearchProfile(input);
    const candidates: AmazonSearchCandidate[] = [];

    $(this.config.selectors.card).each((_, el) => {
      const card = $(el);
      const title = card.find("h2 span").first().text().trim()
        || card.find("h2").first().attr("aria-label")?.replace(/^Sponsorlu Reklam\s*-\s*/i, "").trim()
        || "";
      const href = card.find("a.a-link-normal.s-line-clamp-4, a[href*='/dp/'], a.a-link-normal.s-no-outline")
        .first()
        .attr("href");
      const productUrl = normalizeAmazonUrl(href, baseUrl);
      const priceText = card.find(".a-price .a-offscreen").first().text().trim();
      const priceTRY = parsePrice(priceText);

      if (!title || !productUrl) return;

      const similarityScore = scoreTitle(title, searchProfile);
      if (similarityScore === 0) return;

      candidates.push({
        source: "amazon_tr",
        title,
        url: productUrl,
        priceTRY: priceTRY ?? Number.NaN,
        sellerName: "Amazon.com.tr",
        sellerRating: 4.8,
        productRating: parseRating(card.find(".a-icon-alt").first().text().trim()),
        reviewCount: parseReviewCount(card.find("a[href*='customerReviews'] span, .s-underline-text").first().text().trim()),
        imageUrl: card.find("img.s-image").first().attr("src") || undefined,
        reviewSnippets: [],
        shippingSummary: card.find("[aria-label*='teslimat'], .a-color-base.a-text-bold").first().text().trim() || undefined,
        returnPolicySummary: "Amazon iade politikası kontrol edilmeli",
        sourceStatus: "live",
        similarityScore,
      });
    });

    return candidates.sort((a, b) => {
      if (b.similarityScore !== a.similarityScore) return b.similarityScore - a.similarityScore;
      const aPrice = Number.isFinite(a.priceTRY) ? a.priceTRY : Number.MAX_SAFE_INTEGER;
      const bPrice = Number.isFinite(b.priceTRY) ? b.priceTRY : Number.MAX_SAFE_INTEGER;
      return aPrice - bPrice;
    });
  }

  private snapshotToListing(
    snapshot: AmazonProductSnapshot,
    fallback?: MarketplaceListing
  ): MarketplaceListing {
    return {
      source: "amazon_tr",
      title: snapshot.title,
      url: snapshot.url,
      priceTRY: snapshot.priceTRY || fallback?.priceTRY || 1,
      sellerName: snapshot.sellerName || fallback?.sellerName || "Amazon.com.tr",
      sellerRating: fallback?.sellerRating || 4.8,
      productRating: snapshot.productRating || fallback?.productRating,
      reviewCount: snapshot.reviewCount || fallback?.reviewCount,
      imageUrl: snapshot.imageUrl || fallback?.imageUrl,
      shippingSummary: snapshot.availabilityText || fallback?.shippingSummary,
      returnPolicySummary: "Amazon iade politikası kontrol edilmeli",
      reviewSnippets: fallback?.reviewSnippets || [],
      sourceStatus: "live",
    };
  }

  private dedupeListings(listings: MarketplaceListing[]) {
    const seen = new Set<string>();

    return listings.filter((listing) => {
      const key = normalizeAmazonUrl(listing.url) || listing.url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private mapError(error: unknown): SourceFetchResult<never> {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLocaleLowerCase("tr-TR").includes("timeout")) {
      return { ok: false, reason: "timeout" };
    }

    return { ok: false, reason: "network_error" };
  }
}
