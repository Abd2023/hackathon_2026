import { ProductIdentification } from "../schemas/product";

export const FIXTURE_PRODUCTS: Record<string, ProductIdentification> = {
  mouse: {
    productName: "Logitech MX Master 3S Kablosuz Mouse",
    brand: "Logitech",
    model: "MX Master 3S",
    category: "Elektronik > Bilgisayar Bileşenleri > Mouse",
    searchQueries: ["Logitech MX Master 3S", "MX Master 3S mouse"],
    visualConfidence: 98,
    uncertaintyNotes: [],
  },
  keyboard: {
    productName: "Keychron K2 Kablosuz Mekanik Klavye",
    brand: "Keychron",
    model: "K2",
    category: "Elektronik > Bilgisayar Bileşenleri > Klavye",
    searchQueries: ["Keychron K2", "Keychron K2 v2"],
    visualConfidence: 95,
    uncertaintyNotes: [],
  },
  headphones: {
    productName: "Sony WH-1000XM5 Gürültü Engelleyici Kulaklık",
    brand: "Sony",
    model: "WH-1000XM5",
    category: "Elektronik > Ses Sistemleri > Kulaklık",
    searchQueries: ["Sony WH-1000XM5", "Sony xm5 kulaklık"],
    visualConfidence: 99,
    uncertaintyNotes: [],
  },
  smartphone: {
    productName: "Samsung Galaxy S24 Ultra",
    brand: "Samsung",
    model: "Galaxy S24 Ultra",
    category: "Elektronik > Telefon > Cep Telefonu",
    searchQueries: ["Samsung Galaxy S24 Ultra 256GB"],
    visualConfidence: 92,
    uncertaintyNotes: ["Renk siyah veya koyu gri olabilir."],
  },
  vacuum: {
    productName: "Roborock S8 Robot Süpürge",
    brand: "Roborock",
    model: "S8",
    category: "Ev Aletleri > Süpürge > Robot Süpürge",
    searchQueries: ["Roborock S8"],
    visualConfidence: 88,
    uncertaintyNotes: ["S8 Plus modeli ile benzer görülebilir, baz istasyonu resimde yok."],
  }
};
