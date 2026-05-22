import React from "react";
import { RecommendationResult } from "@/lib/schemas/analysis";
import { MarketplaceListing } from "@/lib/schemas/marketplace";

function sourceLabel(source?: MarketplaceListing["source"]) {
  const labels: Record<MarketplaceListing["source"], string> = {
    amazon_tr: "Amazon TR",
    trendyol: "Trendyol",
    hepsiburada: "Hepsiburada",
    fixture: "Demo",
  };

  return source ? labels[source] || "Pazaryeri" : "Pazaryeri";
}

function sourceInitial(source?: MarketplaceListing["source"]) {
  if (source === "amazon_tr") return "A";
  if (source === "trendyol") return "T";
  if (source === "hepsiburada") return "H";
  return "D";
}

function sourceTone(source?: MarketplaceListing["source"]) {
  if (source === "trendyol") return "bg-orange-500";
  if (source === "hepsiburada") return "bg-sky-600";
  if (source === "amazon_tr") return "bg-stone-900";
  return "bg-primary";
}

function statusBadge(status?: MarketplaceListing["sourceStatus"]) {
  if (status === "live") return { label: "Canlı", className: "bg-teal-50 text-teal-700 border-teal-100" };
  if (status === "cached") return { label: "Önbellek", className: "bg-slate-50 text-slate-600 border-slate-200" };
  if (status === "fixture") return { label: "Demo", className: "bg-amber-50 text-amber-700 border-amber-100" };
  return { label: "Sınırlı", className: "bg-rose-50 text-rose-700 border-rose-100" };
}

function uniqueListings(result: RecommendationResult) {
  const listings = result.listings?.length
    ? result.listings
    : [result.bestListing, result.alternativeListing].filter(Boolean) as MarketplaceListing[];

  const seen = new Set<string>();
  return listings.filter((listing) => {
    if (seen.has(listing.url)) return false;
    seen.add(listing.url);
    return true;
  });
}

function formatPrice(price?: number) {
  if (!Number.isFinite(price)) return "-";
  return `${Math.round(price || 0).toLocaleString("tr-TR")} ₺`;
}

function cheapestPrice(listings: MarketplaceListing[]) {
  const prices = listings
    .map((listing) => listing.priceTRY)
    .filter((price) => Number.isFinite(price));

  return prices.length > 0 ? Math.min(...prices) : undefined;
}

function listingBadges(
  listing: MarketplaceListing,
  bestUrl?: string,
  cheapest?: number
) {
  const badges: Array<{ label: string; className: string }> = [];

  if (listing.url === bestUrl) {
    badges.push({ label: "Önerilen", className: "bg-primary text-white border-primary" });
  }

  if (cheapest !== undefined && listing.priceTRY === cheapest) {
    badges.push({ label: "En Ucuz", className: "bg-emerald-50 text-emerald-700 border-emerald-100" });
  }

  if ((listing.sellerRating || 0) >= 4.5) {
    badges.push({ label: "Güvenli Satıcı", className: "bg-amber-50 text-amber-700 border-amber-100" });
  }

  return badges;
}

function dealBreakerTone(verdict?: string) {
  if (verdict === "pass") return "border-emerald-200 bg-white/15";
  if (verdict === "fail") return "border-rose-200 bg-white/15";
  return "border-white/25 bg-white/10";
}

function alternativeText(listing: MarketplaceListing, cheapest?: number) {
  if (cheapest !== undefined && listing.priceTRY === cheapest) {
    return "Daha düşük fiyat verdiği için ikinci seçenek olarak tutuldu. Satıcı ve yorum bilgilerini satın almadan önce kontrol edin.";
  }

  if ((listing.sellerRating || 0) >= 4.5) {
    return "Satıcı puanı güçlü olduğu için güvenli bir alternatif olarak öne çıkıyor.";
  }

  if ((listing.reviewCount || 0) > 100) {
    return "Yorum sayısı daha yüksek olduğu için karşılaştırmaya değer.";
  }

  return "Fiyat ve temel pazaryeri sinyalleri dengeli olduğu için yedek seçenek olarak önerildi.";
}

export function ResultView({
  result,
  imagePreview,
  onReset,
}: {
  result: RecommendationResult;
  imagePreview?: string | null;
  onReset: () => void;
}) {
  const listings = uniqueListings(result);
  const cheapest = cheapestPrice(listings);
  const productTitle = result.product?.productName || result.bestListing?.title || "Bulunan Ürün";
  const productCategory = result.product?.category;
  const productImage = imagePreview || result.bestListing?.imageUrl || "https://placehold.co/160x160?text=Urun";
  const bestUrl = result.bestListing?.url;
  const alternative = result.alternativeListing && result.alternativeListing.url !== bestUrl
    ? result.alternativeListing
    : listings.find((listing) => listing.url !== bestUrl);
  const isRisky = result.dealBreaker?.verdict === "fail" || /risk|dikkat|bulunamadı/i.test(result.decisionTitle);
  const decisionTone = isRisky
    ? "from-rose-600 to-orange-600"
    : "from-primary-dark to-violet-700";

  return (
    <div className="flex-1 overflow-y-auto bg-page p-4 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col gap-5">
        <section className="card flex gap-4 items-center">
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={productImage} alt="Ürün görseli" className="h-full w-full object-contain p-1.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                %{Math.round(result.matchPercent)} eşleşme
              </span>
              {productCategory && (
                <span className="truncate rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                  {productCategory}
                </span>
              )}
            </div>
            <h2 className="line-clamp-2 text-[15px] font-bold leading-snug text-foreground">{productTitle}</h2>
          </div>
        </section>

        <section className={`rounded-lg bg-gradient-to-br ${decisionTone} p-5 text-white shadow-soft`}>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-amber-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m13 2-9 13h8l-1 7 9-13h-8l1-7Z" />
              </svg>
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-white/75">Yapay Zeka Kararı</p>
              <h3 className="text-lg font-bold leading-tight">{result.decisionTitle}</h3>
            </div>
          </div>
          <p className="text-sm font-medium leading-6 text-white/95">{result.decisionSummary}</p>

          {result.dealBreaker && (
            <div className={`mt-4 rounded-lg border p-3 ${dealBreakerTone(result.dealBreaker.verdict)}`}>
              <div className="mb-1 flex items-center gap-2 text-sm font-bold">
                <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 13c0 5-3.5 7.5-7.7 8.8a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.4a1.3 1.3 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1v7Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                Şartınız analiz edildi
              </div>
              <p className="text-xs font-semibold leading-5 text-white/90">
                {result.dealBreaker.shortExplanation}
              </p>
              {result.dealBreaker.evidence[0] && (
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/75">
                  “{result.dealBreaker.evidence[0]}”
                </p>
              )}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">Pazaryeri Karşılaştırması</h3>
            <span className="text-xs font-semibold text-muted">{listings.length} sonuç</span>
          </div>

          {listings.map((listing) => {
            const isBest = bestUrl === listing.url;
            const status = statusBadge(listing.sourceStatus);
            const badges = listingBadges(listing, bestUrl, cheapest);

            return (
              <a
                key={listing.url}
                href={listing.url}
                target="_blank"
                rel="noreferrer"
                className={`card flex items-center gap-3 transition hover:border-primary ${
                  isBest ? "border-primary ring-2 ring-primary/10" : ""
                }`}
              >
                <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-base font-black text-white ${sourceTone(listing.source)}`}>
                  {sourceInitial(listing.source)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-foreground">{sourceLabel(listing.source)}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="line-clamp-1 text-xs text-muted">Satıcı: {listing.sellerName || "Bilinmiyor"}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                    {listing.sellerRating && <span>⭐ {listing.sellerRating} satıcı</span>}
                    {listing.productRating && <span>Ürün {listing.productRating}/5</span>}
                    {listing.reviewCount && <span>{listing.reviewCount.toLocaleString("tr-TR")} yorum</span>}
                  </div>
                </div>

                <div className="flex min-w-[86px] flex-col items-end gap-1">
                  <span className="text-right text-lg font-black text-foreground">{formatPrice(listing.priceTRY)}</span>
                  <div className="flex flex-col items-end gap-1">
                    {badges.slice(0, 2).map((badge) => (
                      <span key={badge.label} className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.className}`}>
                        {badge.label}
                      </span>
                    ))}
                  </div>
                </div>
              </a>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="card border-emerald-100 bg-emerald-50/70">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-emerald-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">✓</span>
              Artılar
            </h4>
            <ul className="space-y-2 text-sm leading-5 text-emerald-950">
              {result.pros.map((pro) => (
                <li key={pro}>{pro}</li>
              ))}
              {result.pros.length === 0 && <li className="text-muted">Net artı sinyali yok.</li>}
            </ul>
          </div>

          <div className="card border-orange-100 bg-orange-50/70">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-orange-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white">!</span>
              Eksikler
            </h4>
            <ul className="space-y-2 text-sm leading-5 text-orange-950">
              {result.cons.map((con) => (
                <li key={con}>{con}</li>
              ))}
              {result.cons.length === 0 && <li className="text-muted">Belirgin risk sinyali yok.</li>}
            </ul>
          </div>
        </section>

        {alternative && (
          <section className="rounded-lg border border-teal-100 bg-teal-50 p-5">
            <div className="mb-3 flex items-center gap-2 text-teal-900">
              <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 20A7 7 0 0 1 4 13c0-5 7-9 16-9 0 9-4 16-9 16Z" />
                <path d="M4 13c3 0 7 0 10-3" />
              </svg>
              <h3 className="text-base font-black">Ajanın Alternatif Önerisi</h3>
            </div>
            <p className="font-bold leading-snug text-foreground">
              {sourceLabel(alternative.source)} - {formatPrice(alternative.priceTRY)}
            </p>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-700">{alternative.title}</p>
            <p className="mt-2 text-sm leading-6 text-teal-950">{alternativeText(alternative, cheapest)}</p>
            <a
              href={alternative.url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex h-11 items-center justify-center rounded-lg bg-teal-200 text-sm font-black text-teal-950 transition hover:bg-teal-300"
            >
              İncele
            </a>
          </section>
        )}

        <button onClick={onReset} className="btn-secondary mt-1">
          Yeni Sorgu Yap
        </button>
      </div>
    </div>
  );
}
