import { MarketplaceListing } from "../schemas/marketplace";

export const FIXTURE_MARKETPLACE_RESULTS: Record<string, MarketplaceListing[]> = {
  mouse: [
    {
      source: "amazon_tr",
      title: "Logitech MX Master 3S Kablosuz Mouse, Açık Gri",
      url: "https://amazon.com.tr/placeholder",
      priceTRY: 2899,
      sellerName: "Amazon.com.tr",
      sellerRating: 4.9,
      productRating: 4.8,
      reviewCount: 1250,
      imageUrl: "https://example.com/mx3s.jpg",
      shippingSummary: "Prime ile ertesi gün teslimat",
      returnPolicySummary: "30 gün koşulsuz iade",
      reviewSnippets: ["Tekerleği harika", "Ergonomisi çok iyi", "Biraz ağır"],
      sourceStatus: "fixture"
    },
    {
      source: "trendyol",
      title: "Logitech Mx Master 3s Gelişmiş Kablosuz Mouse Soluk Gri",
      url: "https://trendyol.com/placeholder",
      priceTRY: 2950,
      sellerName: "TeknolojiMarket",
      sellerRating: 4.5,
      productRating: 4.7,
      reviewCount: 340,
      imageUrl: "https://example.com/mx3s-ty.jpg",
      shippingSummary: "Kargo Bedava",
      returnPolicySummary: "14 gün iade",
      reviewSnippets: ["Tıklama sesi yok", "Tekerlek bozulmuyor", "Siyahı daha iyiydi"],
      sourceStatus: "fixture"
    },
    {
      source: "hepsiburada",
      title: "Logitech MX Master 3s Performance Mouse - Açık Gri",
      url: "https://hepsiburada.com/placeholder",
      priceTRY: 2920,
      sellerName: "HB Bilişim",
      sellerRating: 4.2,
      productRating: 4.6,
      reviewCount: 215,
      imageUrl: "https://example.com/mx3s-hb.jpg",
      shippingSummary: "Yarın Kapında",
      returnPolicySummary: "14 gün iade",
      reviewSnippets: ["Güzel fare", "Tekerlek sağlam duruyor"],
      sourceStatus: "fixture"
    }
  ]
};
