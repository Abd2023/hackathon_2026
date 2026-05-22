import { MarketplaceConfig } from "./types";

export const MARKETPLACE_CONFIGS: Record<string, MarketplaceConfig> = {
  amazon_tr: {
    id: "amazon_tr",
    searchUrlTemplate: "https://www.amazon.com.tr/s?k={query}",
    maxPages: 1,
    delayRangeMs: [1000, 3000],
    selectors: {
      card: "div[data-component-type='s-search-result']",
      title: "h2 a.a-link-normal span.a-text-normal",
      url: "h2 a.a-link-normal",
      price: ".a-price .a-offscreen",
      productRating: ".a-icon-star-small span.a-icon-alt",
      reviewCount: "span.a-size-base.s-underline-text",
      image: "img.s-image",
    }
  },
  trendyol: {
    id: "trendyol",
    searchUrlTemplate: "https://www.trendyol.com/sr?q={query}",
    maxPages: 1,
    delayRangeMs: [1000, 3000],
    selectors: {
      card: ".p-card-wrppr",
      title: ".prdct-desc-cntnr-name",
      url: "a",
      price: ".prc-box-dscntd",
      productRating: ".rating-score",
      reviewCount: ".ratingCount",
      image: ".p-card-img",
    }
  },
  hepsiburada: {
    id: "hepsiburada",
    searchUrlTemplate: "https://www.hepsiburada.com/ara?q={query}",
    maxPages: 1,
    delayRangeMs: [2000, 4000],
    selectors: {
      card: "li.productListContent-item",
      title: "h3[data-test-id='product-card-name']",
      url: "a",
      price: "div[data-test-id='price-current-price']",
      image: "img[data-test-id='product-image-image']",
    }
  }
};
