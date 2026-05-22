import { ProductIdentification } from "../schemas/product";
import { MarketplaceListing } from "../schemas/marketplace";
import { FIXTURE_MARKETPLACE_RESULTS } from "../fixtures/marketplace-results";

export interface MarketplaceProvider {
  id: string;
  search(input: ProductIdentification): Promise<MarketplaceListing[]>;
}

export class FixtureProvider implements MarketplaceProvider {
  id = "fixture";

  async search(input: ProductIdentification): Promise<MarketplaceListing[]> {
    const queryLower = input.searchQueries.join(" ").toLowerCase();
    let searchKey = "mouse"; // fallback
    if (queryLower.includes("klavye") || queryLower.includes("keychron")) searchKey = "keyboard";
    else if (queryLower.includes("kulaklık") || queryLower.includes("sony")) searchKey = "headphones";
    else if (queryLower.includes("telefon") || queryLower.includes("samsung")) searchKey = "smartphone";
    else if (queryLower.includes("süpürge") || queryLower.includes("roborock")) searchKey = "vacuum";

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return FIXTURE_MARKETPLACE_RESULTS[searchKey] || FIXTURE_MARKETPLACE_RESULTS["mouse"];
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

    // TODO: Add live scraping provider integration here
    // For now, if live/hybrid is selected but scraping is not implemented, fallback to fixture
    return this.fixtureProvider.search(input);
  }
}
