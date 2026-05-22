import { MarketplaceListing } from "../schemas/marketplace";
import { DealBreakerEvaluation } from "../schemas/analysis";

type ScoredListing = MarketplaceListing & { score: number };

export function scoreListings(
  listings: MarketplaceListing[],
  dealBreaker?: DealBreakerEvaluation
): ScoredListing[] {
  if (!listings || listings.length === 0) return [];

  // Filter out listings where deal-breaker failed
  const validListings = dealBreaker?.verdict === "fail" 
    ? listings.filter(l => false) // If deal breaker applies globally and failed, none are valid. In reality, dealbreaker could be per-listing, but keeping it simple for now.
    : listings;

  if (validListings.length === 0) return [];

  // Find the lowest price for normalization
  const lowestPrice = Math.min(...validListings.map(l => l.priceTRY));

  const scored = validListings.map(listing => {
    let score = 0;

    // Price score: max 50 points (cheapest gets 50, others get proportionally less)
    const priceScore = (lowestPrice / listing.priceTRY) * 50;
    score += priceScore;

    // Seller trust score: max 30 points (based on rating out of 5)
    if (listing.sellerRating) {
      score += (listing.sellerRating / 5) * 30;
    } else {
      score += 15; // default middle score if unknown
    }

    // Product trust score: max 20 points
    if (listing.productRating) {
      score += (listing.productRating / 5) * 20;
    } else {
      score += 10;
    }

    return { ...listing, score };
  });

  // Sort descending by score
  return scored.sort((a, b) => b.score - a.score);
}
