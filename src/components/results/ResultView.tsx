import React from "react";
import { RecommendationResult } from "@/lib/schemas/analysis";

export function ResultView({ result, onReset }: { result: RecommendationResult, onReset: () => void }) {
  // Use passed result instead of mockResult
  
  // Since our mock result had some hardcoded product data, we'll map what we can
  const mockProductCategory = result.bestListing?.title || "Bulunan Ürün";
  const productImage = result.bestListing?.imageUrl || "https://placehold.co/150x150?text=Urun";

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 bg-surface-dark pb-20 animate-in fade-in duration-500">
      {/* Product Header */}
      <div className="card flex gap-4 items-center border-l-4 border-l-primary">
        <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center flex-shrink-0 text-2xl overflow-hidden border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={productImage} alt="Product" className="w-full h-full object-contain p-1" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 bg-success-light text-success rounded-full">
              %{result.matchPercent} Eşleşme
            </span>
          </div>
          <h2 className="font-bold text-foreground leading-tight text-sm line-clamp-2">{mockProductCategory}</h2>
        </div>
      </div>

      {/* AI Decision Card */}
      <div className={`card text-white ${result.decisionTitle.includes("Güven") || result.decisionTitle.includes("Başarılı") ? 'bg-gradient-to-br from-success to-emerald-700' : 'bg-gradient-to-br from-danger to-red-700'}`}>
        <div className="flex items-center gap-2 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
          <h3 className="font-bold text-lg">{result.decisionTitle}</h3>
        </div>
        <p className="text-sm opacity-90 leading-relaxed">
          {result.decisionSummary}
        </p>
      </div>

      {/* Deal Breaker Check */}
      {result.dealBreaker && (
        <div className={`card border-l-4 ${result.dealBreaker.verdict === 'pass' ? 'border-l-success' : 'border-l-danger'}`}>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <span className={result.dealBreaker.verdict === 'pass' ? 'text-success' : 'text-danger'}>
              {result.dealBreaker.verdict === 'pass' ? '✓' : '✗'}
            </span> 
            Özel Şartınız: {result.dealBreaker.verdict === 'pass' ? 'Geçti' : 'Kaldı'}
          </h4>
          <p className="text-sm italic text-muted mb-3">&quot;{result.dealBreaker.condition}&quot;</p>
          <ul className="text-sm space-y-1">
            {result.dealBreaker.evidence.map((item, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-muted">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Marketplaces */}
      <section className="flex flex-col gap-3">
        <h3 className="font-bold">Pazaryeri Karşılaştırması</h3>
        {[result.bestListing, result.alternativeListing].filter(Boolean).map((listing, idx) => {
          if (!listing) return null;
          // In real logic, we'd have a list of all raw listings. For now we just show best and alt.
          const isBest = idx === 0;
          return (
            <a key={idx} href={listing.url} className={`card flex items-center justify-between transition-all hover:border-primary cursor-pointer ${isBest ? 'ring-2 ring-primary border-transparent' : ''}`}>
              <div className="flex flex-col">
                <span className="font-bold text-primary-dark">{listing.source}</span>
                <span className="text-xs text-muted flex items-center gap-1">
                  Satıcı: {listing.sellerName || "Bilinmiyor"} {listing.sellerRating && <span className="text-orange-500">★{listing.sellerRating}</span>}
                </span>
              </div>
              <div className="flex flex-col items-end">
                {isBest && <span className="text-[10px] font-bold text-primary uppercase mb-1">En İyi Seçenek</span>}
                <span className="font-bold text-lg">{listing.priceTRY.toLocaleString('tr-TR')} ₺</span>
              </div>
            </a>
          );
        })}
      </section>

      {/* Pros and Cons */}
      <section className="grid grid-cols-2 gap-3">
        <div className="card bg-success-light/30 border-success/20">
          <h4 className="font-bold text-success text-sm mb-2 flex items-center gap-1">
            <span>👍</span> Artıları
          </h4>
          <ul className="text-xs space-y-1.5">
            {result.pros.map((pro, idx) => (
              <li key={idx}>• {pro}</li>
            ))}
            {result.pros.length === 0 && <li className="text-muted italic">Belirtilmedi</li>}
          </ul>
        </div>
        <div className="card bg-danger-light/30 border-danger/20">
          <h4 className="font-bold text-danger text-sm mb-2 flex items-center gap-1">
            <span>👎</span> Eksileri
          </h4>
          <ul className="text-xs space-y-1.5">
            {result.cons.map((con, idx) => (
              <li key={idx}>• {con}</li>
            ))}
            {result.cons.length === 0 && <li className="text-muted italic">Belirtilmedi</li>}
          </ul>
        </div>
      </section>

      {/* Limitations */}
      <section className="text-xs text-muted bg-surface p-3 rounded-lg border border-border">
        <p className="font-semibold mb-1">Bilgilendirme:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          {result.evidenceLimitations.map((limit, idx) => (
            <li key={idx}>{limit}</li>
          ))}
        </ul>
      </section>

      {/* Action */}
      <button onClick={onReset} className="btn-secondary mt-2">
        Yeni Sorgu Yap
      </button>
    </div>
  );
}
