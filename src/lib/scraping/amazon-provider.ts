import * as cheerio from "cheerio";
import { MarketplaceProvider } from "../marketplaces/provider";
import { ProductIdentification } from "../schemas/product";
import { MarketplaceListing } from "../schemas/marketplace";
import { SourceFetchResult, MarketplaceConfig } from "./types";
import { MARKETPLACE_CONFIGS } from "./selectors";
import { createPage, getBrowser } from "./browser";
import { randomDelay, withTimeout } from "./rate-limit";

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

  async fetchLive(input: ProductIdentification): Promise<SourceFetchResult<MarketplaceListing[]>> {
    const query = encodeURIComponent(input.searchQueries[0] || input.productName);
    const url = this.config.searchUrlTemplate.replace("{query}", query);

    try {
      const page = await createPage();
      
      // Random delay before starting to seem more human-like
      await randomDelay(this.config.delayRangeMs[0], this.config.delayRangeMs[1]);

      await withTimeout(page.goto(url, { waitUntil: "domcontentloaded" }), 15000, "Page load timeout");
      
      // Add slight delay to allow client-side hydration if any
      await randomDelay(1000, 2000);

      const html = await page.content();
      const $ = cheerio.load(html);

      const listings: MarketplaceListing[] = [];
      const cards = $(this.config.selectors.card);

      if (cards.length === 0) {
        // Checking if blocked (captcha)
        if ($("form[action='/errors/validateCaptcha']").length > 0 || $("title").text().includes("Robot Check")) {
          return { ok: false, reason: "blocked" };
        }
        return { ok: false, reason: "selector_failed" };
      }

      cards.each((_, el) => {
        const card = $(el);
        const title = card.find(this.config.selectors.title).text().trim();
        const relativeUrl = card.find(this.config.selectors.url).attr("href");
        const priceStr = card.find(this.config.selectors.price).first().text().trim();
        
        if (!title || !relativeUrl || !priceStr) return;

        const absoluteUrl = relativeUrl.startsWith("http") ? relativeUrl : `https://www.amazon.com.tr${relativeUrl}`;
        
        // Parse price (e.g., "1.234,56 TL" or "1,234.56 TL")
        const cleanPrice = priceStr.replace(/[^0-9,]/g, "").replace(",", ".");
        const priceTRY = parseFloat(cleanPrice);

        if (isNaN(priceTRY)) return;

        let productRating: number | undefined;
        const ratingStr = card.find(this.config.selectors.productRating!).text().trim();
        if (ratingStr) {
          const match = ratingStr.match(/([\d,]+)/);
          if (match) productRating = parseFloat(match[1].replace(",", "."));
        }

        let reviewCount: number | undefined;
        const reviewsStr = card.find(this.config.selectors.reviewCount!).text().trim();
        if (reviewsStr) {
          reviewCount = parseInt(reviewsStr.replace(/[^0-9]/g, ""), 10);
        }

        const imageUrl = card.find(this.config.selectors.image!).attr("src") || "";

        listings.push({
          source: "Amazon",
          url: absoluteUrl,
          priceTRY,
          title,
          sellerName: "Amazon.com.tr", // Usually true for first page if shipped by Amazon, scraping detailed seller requires going into the product page.
          sellerRating: 4.8, // Mocked rating since search page doesn't show seller rating
          productRating,
          reviewCount,
          imageUrl,
          isBest: false,
        });
      });

      await page.close();
      return { ok: true, data: listings, sourceStatus: "live" };

    } catch (error: any) {
      if (error.message.includes("timeout")) {
        return { ok: false, reason: "timeout" };
      }
      return { ok: false, reason: "network_error" };
    }
  }
}
