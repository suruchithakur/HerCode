export type Product = {
  product_code: string;
  product_id: string;
  name: string;
  brand: string;
  category: string;
  color: string;
  size: string;
  price_chf: number;
  discount_pct: number;
  weight_g: number | null;
  waterproof_rating_mm: number | null;
  temp_rating_c: number | null;
  material: string;
  tags: string[];
  zone: string;
  zone_name: string;
  aisle: string;
  stock_total: number;
  stock_front: number;
  description: string;
};

export type ProductGroup = {
  product_id: string;
  name: string;
  brand: string;
  category: string;
  zone: string;
  zone_name: string;
  aisle: string;
  description: string;
  tags: string[];
  price_chf: number;
  discount_pct: number;
  weight_g: number | null;
  waterproof_rating_mm: number | null;
  temp_rating_c: number | null;
  material: string;
  variants: Product[];
  colors: string[];
  sizes: string[];
};

export type Trip = {
  id: string;
  name: string;
  country: string;
  month: string;
  weather: string;
  gender: string;
  height_cm: string;
  weight_kg: string;
  sizing_notes: string;
  style: string;
  days: string;
  activities: string[];
  budget_chf: string;
  notes: string;
  createdAt: number;
  // Generated
  recommendations?: { product_id: string; reason: string }[];
  picks?: string[]; // product_ids
  skipped?: string[];
  packing?: PackingList;
  confirmedCodes?: string[]; // product_codes scanned in store
};

export type PackingList = {
  groups: { title: string; items: { product_id: string; note?: string }[] }[];
};
