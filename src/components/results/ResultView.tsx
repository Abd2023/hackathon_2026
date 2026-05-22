import React from "react";

export function ResultView({ onReset }: { onReset: () => void }) {
  // Static fixture data for Step 5
  const mockResult = {
    product: {
      name: "Logitech MX Master 3S Kablosuz Mouse",
      category: "Elektronik > Bilgisayar Bileşenleri > Mouse",
      matchConfidence: 98,
      imageUrl: "https://example.com/mock-image.jpg" // We'll just show a placeholder or skip image if not available
    },
    decision: {
      title: "Güvenle Alabilirsiniz",
      summary: "İstediğiniz ürün bu. Fiyatlar rekabetçi ve satıcılar güvenilir. Özel şartınızı tam olarak karşılıyor.",
      isPositive: true
    },
    dealBreaker: {
      condition: "Tekerleği çabuk bozulmasın",
      verdict: "pass" as const,
      evidence: [
        "150+ yorumda 'tekerlek çok sağlam', 'MagSpeed tekerlek harika' ifadeleri geçiyor.",
        "Kronik tekerlek arızası şikayeti bulunamadı."
      ]
    },
    listings: [
      {
        source: "Amazon",
        price: 2899,
        sellerName: "Amazon.com.tr",
        sellerRating: 4.9,
        url: "#",
        isBest: true,
      },
      {
        source: "Trendyol",
        price: 2950,
        sellerName: "TeknolojiMarket",
        sellerRating: 4.5,
        url: "#",
        isBest: false,
      },
      {
        source: "Hepsiburada",
        price: 2920,
        sellerName: "HB Bilişim",
        sellerRating: 4.2,
        url: "#",
        isBest: false,
      }
    ],
    prosCons: {
      pros: ["Ergonomik tasarım", "Çoklu cihaz desteği", "Uzun pil ömrü", "Sessiz tıklama"],
      cons: ["Sol elliler için uygun değil", "Büyük eller için tasarlanmış", "Fiyatı yüksek"]
    },
    alternative: {
      name: "Logitech MX Anywhere 3S",
      reason: "Daha küçük ve taşınabilir bir model arıyorsanız tercih edilebilir."
    },
    limitations: [
      "Fiyatlar anlık olarak değişebilir.",
      "Sadece en popüler 3 pazaryeri tarandı."
    ]
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 bg-surface-dark pb-20 animate-in fade-in duration-500">
      {/* Product Header */}
      <div className="card flex gap-4 items-center border-l-4 border-l-primary">
        <div className="w-16 h-16 bg-surface rounded-lg flex items-center justify-center flex-shrink-0 text-2xl">
          🖱️
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 bg-success-light text-success rounded-full">
              %{mockResult.product.matchConfidence} Eşleşme
            </span>
          </div>
          <h2 className="font-bold text-foreground leading-tight">{mockResult.product.name}</h2>
          <p className="text-xs text-muted mt-1">{mockResult.product.category}</p>
        </div>
      </div>

      {/* AI Decision Card */}
      <div className={`card text-white ${mockResult.decision.isPositive ? 'bg-gradient-to-br from-success to-emerald-700' : 'bg-gradient-to-br from-danger to-red-700'}`}>
        <div className="flex items-center gap-2 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
          <h3 className="font-bold text-lg">{mockResult.decision.title}</h3>
        </div>
        <p className="text-sm opacity-90 leading-relaxed">
          {mockResult.decision.summary}
        </p>
      </div>

      {/* Deal Breaker Check */}
      <div className="card border-l-4 border-l-success">
        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <span className="text-success">✓</span> Özel Şartınız: Geçti
        </h4>
        <p className="text-sm italic text-muted mb-3">&quot;{mockResult.dealBreaker.condition}&quot;</p>
        <ul className="text-sm space-y-1">
          {mockResult.dealBreaker.evidence.map((item, idx) => (
            <li key={idx} className="flex gap-2">
              <span className="text-muted">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Marketplaces */}
      <section className="flex flex-col gap-3">
        <h3 className="font-bold">Pazaryeri Karşılaştırması</h3>
        {mockResult.listings.map((listing, idx) => (
          <a key={idx} href={listing.url} className={`card flex items-center justify-between transition-all hover:border-primary cursor-pointer ${listing.isBest ? 'ring-2 ring-primary border-transparent' : ''}`}>
            <div className="flex flex-col">
              <span className="font-bold text-primary-dark">{listing.source}</span>
              <span className="text-xs text-muted flex items-center gap-1">
                Satıcı: {listing.sellerName} <span className="text-orange-500">★{listing.sellerRating}</span>
              </span>
            </div>
            <div className="flex flex-col items-end">
              {listing.isBest && <span className="text-[10px] font-bold text-primary uppercase mb-1">En İyi Fiyat</span>}
              <span className="font-bold text-lg">{listing.price.toLocaleString('tr-TR')} ₺</span>
            </div>
          </a>
        ))}
      </section>

      {/* Pros and Cons */}
      <section className="grid grid-cols-2 gap-3">
        <div className="card bg-success-light/30 border-success/20">
          <h4 className="font-bold text-success text-sm mb-2 flex items-center gap-1">
            <span>👍</span> Artıları
          </h4>
          <ul className="text-xs space-y-1.5">
            {mockResult.prosCons.pros.map((pro, idx) => (
              <li key={idx}>• {pro}</li>
            ))}
          </ul>
        </div>
        <div className="card bg-danger-light/30 border-danger/20">
          <h4 className="font-bold text-danger text-sm mb-2 flex items-center gap-1">
            <span>👎</span> Eksileri
          </h4>
          <ul className="text-xs space-y-1.5">
            {mockResult.prosCons.cons.map((con, idx) => (
              <li key={idx}>• {con}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Alternative */}
      <section className="card bg-blue-50 border-blue-100">
        <h4 className="font-bold text-blue-800 text-sm mb-1 flex items-center gap-2">
          <span>💡</span> Alternatif Öneri
        </h4>
        <p className="text-sm font-semibold text-blue-900 mt-2">{mockResult.alternative.name}</p>
        <p className="text-xs text-blue-800 mt-1">{mockResult.alternative.reason}</p>
      </section>

      {/* Limitations */}
      <section className="text-xs text-muted bg-surface p-3 rounded-lg border border-border">
        <p className="font-semibold mb-1">Bilgilendirme:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          {mockResult.limitations.map((limit, idx) => (
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
