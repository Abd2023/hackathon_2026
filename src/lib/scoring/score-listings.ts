import { MarketplaceListing } from "../schemas/marketplace";
import { DealBreakerEvaluation } from "../schemas/analysis";

export type ScoredListing = MarketplaceListing & { score: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hasReturnSignal(listing: MarketplaceListing) {
  const text = `${listing.returnPolicySummary || ""} ${listing.shippingSummary || ""}`.toLocaleLowerCase("tr-TR");
  return /iade|return|amazon|prime|güvenli|guvenli/.test(text);
}

export function scoreListings(
  listings: MarketplaceListing[],
  dealBreaker?: DealBreakerEvaluation
): ScoredListing[] {
  if (!listings || listings.length === 0) return [];

  const lowestPrice = Math.min(...listings.map((listing) => listing.priceTRY));

  const scored = listings.map((listing) => {
    let score = 0;

    const priceScore = (lowestPrice / listing.priceTRY) * 35;
    score += priceScore;

    score += listing.sellerRating ? (listing.sellerRating / 5) * 25 : 12;
    score += listing.productRating ? (listing.productRating / 5) * 20 : 8;

    const reviewDepth = Math.min(listing.reviewCount || 0, 500) / 500;
    score += reviewDepth * 8;

    if (hasReturnSignal(listing)) score += 7;
    if (listing.sourceStatus === "live") score += 5;
    if (listing.sourceStatus === "fixture" || listing.sourceStatus === "cached") score -= 3;

    if (dealBreaker?.verdict === "pass") score += 5;
    if (dealBreaker?.verdict === "uncertain") score -= 8;
    if (dealBreaker?.verdict === "fail") score -= 35;

    return { ...listing, score: Math.round(clamp(score, 0, 100)) };
  });

  return scored.sort((a, b) => b.score - a.score);
}
