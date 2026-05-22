import React from "react";
import { RecommendationResult } from "@/lib/schemas/analysis";
import { MarketplaceListing } from "@/lib/schemas/marketplace";

function sourceLabel(source: MarketplaceListing["source"]) {
  const labels: Record<MarketplaceListing["source"], string> = {
    amazon_tr: "Amazon TR",
    trendyol: "Trendyol",
    hepsiburada: "Hepsiburada",
    fixture: "Demo",
  };

  return labels[source];
}

function statusBadge(status: MarketplaceListing["sourceStatus"]) {
  if (status === "live") return { label: "Canlı veri", className: "bg-blue-100 text-blue-700" };
  if (status === "cached") return { label: "Önbellek", className: "bg-gray-100 text-gray-700" };
  if (status === "fixture") return { label: "Demo veri", className: "bg-purple-100 text-purple-700" };
  return { label: "Kanıt sınırlı", className: "bg-red-100 text-red-700" };
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
  const productTitle = result.product?.productName || result.bestListing?.title || "Bulunan Ürün";
  const productCategory = result.product?.category;
  const productImage = imagePreview || result.bestListing?.imageUrl || "https://placehold.co/150x150?text=Urun";
  const decisionTone = result.dealBreaker?.verdict === "fail" || /risk|dikkat|bulunamadı/i.test(result.decisionTitle)
    ? "bg-gradient-to-br from-danger to-red-700"
    : "bg-gradient-to-br from-success to-emerald-700";

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 bg-surface-dark pb-20 animate-in fade-in duration-500">
      <div className="card flex gap-4 items-center border-l-4 border-l-primary">
        <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={productImage} alt="Ürün görseli" className="w-full h-full object-contain p-1" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 bg-success-light text-success rounded-full">
              %{Math.round(result.matchPercent)} Eşleşme
            </span>
          </div>
          <h2 className="font-bold text-foreground leading-tight text-sm line-clamp-2">{productTitle}</h2>
          {productCategory && <p className="text-xs text-muted mt-1 line-clamp-1">{productCategory}</p>}
        </div>
      </div>

      <div className={`card text-white ${decisionTone}`}>
        <div className="flex items-center gap-2 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <h3 className="font-bold text-lg">{result.decisionTitle}</h3>
        </div>
        <p className="text-sm opacity-90 leading-relaxed">{result.decisionSummary}</p>
      </div>

      {result.dealBreaker && (
        <div className={`card border-l-4 ${result.dealBreaker.verdict === "pass" ? "border-l-success" : result.dealBreaker.verdict === "fail" ? "border-l-danger" : "border-l-primary"}`}>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <span className={result.dealBreaker.verdict === "pass" ? "text-success" : result.dealBreaker.verdict === "fail" ? "text-danger" : "text-primary"}>
              {result.dealBreaker.verdict === "pass" ? "✓" : result.dealBreaker.verdict === "fail" ? "✕" : "?"}
            </span>
            Özel Şart: {result.dealBreaker.verdict === "pass" ? "Geçti" : result.dealBreaker.verdict === "fail" ? "Kaldı" : "Belirsiz"}
          </h4>
          <p className="text-sm italic text-muted mb-2">&quot;{result.dealBreaker.condition}&quot;</p>
          {result.dealBreaker.shortExplanation && (
            <p className="text-sm font-medium mb-3">{result.dealBreaker.shortExplanation}</p>
          )}
          <ul className="text-sm space-y-1">
            {result.dealBreaker.evidence.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-muted">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h3 className="font-bold">Pazaryeri Karşılaştırması</h3>
        {listings.map((listing) => {
          const isBest = result.bestListing?.url === listing.url;
          const badge = statusBadge(listing.sourceStatus);

          return (
            <a
              key={listing.url}
              href={listing.url}
              target="_blank"
              rel="noreferrer"
              className={`card flex items-center justify-between gap-3 transition-all hover:border-primary cursor-pointer ${isBest ? "ring-2 ring-primary border-transparent" : ""}`}
            >
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-primary-dark tracking-wider text-xs">{sourceLabel(listing.source)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badge.className}`}>{badge.label}</span>
                </div>
                <span className="text-xs text-muted line-clamp-1">Satıcı: {listing.sellerName || "Bilinmiyor"}</span>
                {(listing.sellerRating || listing.productRating) && (
                  <span className="text-xs text-muted">
                    {listing.sellerRating ? `Satıcı ${listing.sellerRating}/5` : ""}
                    {listing.sellerRating && listing.productRating ? " · " : ""}
                    {listing.productRating ? `Ürün ${listing.productRating}/5` : ""}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end flex-shrink-0">
                {isBest && <span className="text-[10px] font-bold text-primary uppercase mb-1">En iyi seçenek</span>}
                <span className="font-bold text-lg">{listing.priceTRY.toLocaleString("tr-TR")} ₺</span>
              </div>
            </a>
          );
        })}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="card bg-success-light/30 border-success/20">
          <h4 className="font-bold text-success text-sm mb-2 flex items-center gap-1">
            <span>✓</span> Artıları
          </h4>
          <ul className="text-xs space-y-1.5">
            {result.pros.map((pro) => (
              <li key={pro}>• {pro}</li>
            ))}
            {result.pros.length === 0 && <li className="text-muted italic">Belirtilmedi</li>}
          </ul>
        </div>
        <div className="card bg-danger-light/30 border-danger/20">
          <h4 className="font-bold text-danger text-sm mb-2 flex items-center gap-1">
            <span>!</span> Eksileri
          </h4>
          <ul className="text-xs space-y-1.5">
            {result.cons.map((con) => (
              <li key={con}>• {con}</li>
            ))}
            {result.cons.length === 0 && <li className="text-muted italic">Belirtilmedi</li>}
          </ul>
        </div>
      </section>

      <section className="text-xs text-muted bg-surface p-3 rounded-lg border border-border">
        <p className="font-semibold mb-1">Bilgilendirme:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          {result.evidenceLimitations.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
      </section>

      <button onClick={onReset} className="btn-secondary mt-2">
        Yeni Sorgu Yap
      </button>
    </div>
  );
}
