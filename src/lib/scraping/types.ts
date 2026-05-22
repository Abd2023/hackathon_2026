export type SourceFetchResult<T> =
  | { ok: true; data: T; sourceStatus: "live" | "cached" | "fixture" }
  | { ok: false; reason: "blocked" | "timeout" | "selector_failed" | "price_unavailable" | "network_error" };

export interface MarketplaceConfig {
  id: string;
  searchUrlTemplate: string; // e.g. "https://www.example.com/search?q={query}"
  maxPages: number;
  delayRangeMs: [number, number];
  selectors: {
    card: string;
    title: string;
    price: string;
    url: string;
    seller?: string;
    sellerRating?: string;
    productRating?: string;
    reviewCount?: string;
    image?: string;
  };
}
