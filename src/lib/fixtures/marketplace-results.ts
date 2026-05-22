import { MarketplaceListing } from "../schemas/marketplace";

export const FIXTURE_MARKETPLACE_RESULTS: Record<string, MarketplaceListing[]> = {
  mouse: [
    {
      source: "amazon_tr",
      title: "Logitech MX Master 3S Kablosuz Mouse, Açık Gri",
      url: "https://www.amazon.com.tr/s?k=Logitech+MX+Master+3S",
      priceTRY: 2899,
      sellerName: "Amazon.com.tr",
      sellerRating: 4.9,
      productRating: 4.8,
      reviewCount: 1250,
      shippingSummary: "Prime ile hızlı teslimat",
      returnPolicySummary: "30 gün iade",
      reviewSnippets: [
        "Tekerlek hissi kaliteli ve sessiz.",
        "Ergonomisi uzun kullanımda rahat.",
        "Biraz ağır bulan kullanıcılar var."
      ],
      sourceStatus: "fixture",
    },
    {
      source: "trendyol",
      title: "Logitech MX Master 3S Gelişmiş Kablosuz Mouse",
      url: "https://www.trendyol.com/sr?q=Logitech%20MX%20Master%203S",
      priceTRY: 2950,
      sellerName: "TeknolojiMarket",
      sellerRating: 4.5,
      productRating: 4.7,
      reviewCount: 340,
      shippingSummary: "Kargo bedava",
      returnPolicySummary: "14 gün iade",
      reviewSnippets: [
        "Tıklama sesi yok denecek kadar az.",
        "Tekerlek bozulmuyor, kaliteli duruyor.",
        "Rengi fotoğraftan biraz farklı gelebiliyor."
      ],
      sourceStatus: "fixture",
    },
    {
      source: "hepsiburada",
      title: "Logitech MX Master 3S Performance Mouse",
      url: "https://www.hepsiburada.com/ara?q=Logitech%20MX%20Master%203S",
      priceTRY: 2920,
      sellerName: "HB Bilişim",
      sellerRating: 4.2,
      productRating: 4.6,
      reviewCount: 215,
      shippingSummary: "Yarın kapında",
      returnPolicySummary: "14 gün iade",
      reviewSnippets: [
        "Güzel fare, ele iyi oturuyor.",
        "Tekerlek sağlam duruyor."
      ],
      sourceStatus: "fixture",
    },
  ],

  keyboard: [
    {
      source: "amazon_tr",
      title: "Razer Ornata V3 Düşük Profilli Oyun Klavyesi TR Düzeni",
      url: "https://www.amazon.com.tr/Razer-RZ03-04461200-R3L1-Meka-Membran-Kablolu-Klavyesi/dp/B0C6B3GCBR",
      priceTRY: 1999,
      sellerName: "Amazon.com.tr",
      sellerRating: 4.8,
      productRating: 4.3,
      reviewCount: 230,
      shippingSummary: "Prime teslimat seçeneği",
      returnPolicySummary: "Amazon iade politikası",
      reviewSnippets: [
        "RGB aydınlatması başarılı ve tuş hissi yumuşak.",
        "Bilek desteği uzun kullanımda rahat.",
        "Meka-membran yapısı mekanik klavye bekleyenler için farklı hissettirebilir."
      ],
      sourceStatus: "fixture",
    },
    {
      source: "trendyol",
      title: "Razer Ornata V3 RGB Gaming Klavye Türkçe Q",
      url: "https://www.trendyol.com/sr?q=Razer%20Ornata%20V3%20TR",
      priceTRY: 2149,
      sellerName: "GameTech",
      sellerRating: 4.5,
      productRating: 4.4,
      reviewCount: 148,
      shippingSummary: "Kargo bedava",
      returnPolicySummary: "14 gün iade",
      reviewSnippets: [
        "Tuşlar sessiz sayılır, ışıklandırma güçlü.",
        "Bilek desteği pratik ama manyetik tutuşu daha güçlü olabilirdi.",
        "Kutu sağlam geldi."
      ],
      sourceStatus: "fixture",
    },
    {
      source: "hepsiburada",
      title: "Razer Ornata V3 Meka-Membran Kablolu Oyuncu Klavyesi",
      url: "https://www.hepsiburada.com/ara?q=Razer%20Ornata%20V3",
      priceTRY: 2099,
      sellerName: "HepsiTeknoloji",
      sellerRating: 4.4,
      productRating: 4.2,
      reviewCount: 96,
      shippingSummary: "Hızlı kargo",
      returnPolicySummary: "14 gün iade",
      reviewSnippets: [
        "Razer Synapse ile ayar yapmak kolay.",
        "Tuş sesi orta seviyede.",
        "Fiyatına göre malzeme kalitesi iyi."
      ],
      sourceStatus: "fixture",
    },
  ],

  headphones: [
    {
      source: "amazon_tr",
      title: "Sony WH-1000XM5 Gürültü Engelleyici Kulaklık",
      url: "https://www.amazon.com.tr/s?k=Sony+WH-1000XM5",
      priceTRY: 11999,
      sellerName: "Amazon.com.tr",
      sellerRating: 4.8,
      productRating: 4.7,
      reviewCount: 880,
      shippingSummary: "Prime teslimat",
      returnPolicySummary: "30 gün iade",
      reviewSnippets: [
        "Gürültü engelleme çok güçlü.",
        "Mikrofon kalitesi toplantılar için yeterli.",
        "Katlanmaması bazı kullanıcılar için dezavantaj."
      ],
      sourceStatus: "fixture",
    },
    {
      source: "trendyol",
      title: "Sony WH-1000XM5 Kablosuz Kulaklık",
      url: "https://www.trendyol.com/sr?q=Sony%20WH-1000XM5",
      priceTRY: 12450,
      sellerName: "SesMarket",
      sellerRating: 4.6,
      productRating: 4.6,
      reviewCount: 310,
      shippingSummary: "Kargo bedava",
      returnPolicySummary: "14 gün iade",
      reviewSnippets: [
        "Pil ömrü uzun.",
        "Kulak pedleri rahat.",
        "Fiyatı yüksek."
      ],
      sourceStatus: "fixture",
    },
  ],

  smartphone: [
    {
      source: "amazon_tr",
      title: "Samsung Galaxy S24 Ultra 256 GB",
      url: "https://www.amazon.com.tr/s?k=Samsung+Galaxy+S24+Ultra+256GB",
      priceTRY: 56999,
      sellerName: "Amazon.com.tr",
      sellerRating: 4.8,
      productRating: 4.6,
      reviewCount: 540,
      shippingSummary: "Hızlı teslimat",
      returnPolicySummary: "30 gün iade",
      reviewSnippets: [
        "Kamera performansı çok iyi.",
        "Ekran parlaklığı başarılı.",
        "Cihaz büyük ve ağır gelebiliyor."
      ],
      sourceStatus: "fixture",
    },
    {
      source: "hepsiburada",
      title: "Samsung Galaxy S24 Ultra Cep Telefonu",
      url: "https://www.hepsiburada.com/ara?q=Samsung%20Galaxy%20S24%20Ultra",
      priceTRY: 57999,
      sellerName: "MobilStore",
      sellerRating: 4.5,
      productRating: 4.5,
      reviewCount: 220,
      shippingSummary: "Yarın kapında",
      returnPolicySummary: "14 gün iade",
      reviewSnippets: [
        "Pil performansı yoğun kullanımda iyi.",
        "Kalem kullanımı pratik.",
        "Kutu içeriğinde adaptör yok."
      ],
      sourceStatus: "fixture",
    },
  ],

  vacuum: [
    {
      source: "amazon_tr",
      title: "Roborock S8 Robot Süpürge",
      url: "https://www.amazon.com.tr/s?k=Roborock+S8",
      priceTRY: 18999,
      sellerName: "Amazon.com.tr",
      sellerRating: 4.7,
      productRating: 4.6,
      reviewCount: 410,
      shippingSummary: "Hızlı teslimat",
      returnPolicySummary: "30 gün iade",
      reviewSnippets: [
        "Haritalama başarılı.",
        "Emiş gücü günlük temizlik için yeterli.",
        "Servis ve yedek parça fiyatları araştırılmalı."
      ],
      sourceStatus: "fixture",
    },
    {
      source: "trendyol",
      title: "Roborock S8 Akıllı Robot Süpürge",
      url: "https://www.trendyol.com/sr?q=Roborock%20S8",
      priceTRY: 19499,
      sellerName: "EvTekno",
      sellerRating: 4.4,
      productRating: 4.5,
      reviewCount: 175,
      shippingSummary: "Kargo bedava",
      returnPolicySummary: "14 gün iade",
      reviewSnippets: [
        "Uygulama bağlantısı kolay.",
        "Halı algılama iyi çalışıyor.",
        "Bazı kullanıcılar su haznesini küçük bulmuş."
      ],
      sourceStatus: "fixture",
    },
  ],
};
