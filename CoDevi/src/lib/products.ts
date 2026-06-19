import { useQuery } from "@tanstack/react-query";
import type { Product, ProductGroup } from "./types";

let cache: Product[] | null = null;

export async function loadProducts(): Promise<Product[]> {
  if (cache) return cache;
  const res = await fetch("/data/products.json");
  const data = (await res.json()) as Product[];
  cache = data;
  return data;
}

export function useProducts() {
  return useQuery({ queryKey: ["products"], queryFn: loadProducts, staleTime: Infinity });
}

export function groupByProductId(products: Product[]): Map<string, ProductGroup> {
  const map = new Map<string, ProductGroup>();
  for (const p of products) {
    const g = map.get(p.product_id);
    if (!g) {
      map.set(p.product_id, {
        product_id: p.product_id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        zone: p.zone,
        zone_name: p.zone_name,
        aisle: p.aisle,
        description: p.description,
        tags: p.tags,
        price_chf: p.price_chf,
        discount_pct: p.discount_pct,
        weight_g: p.weight_g,
        waterproof_rating_mm: p.waterproof_rating_mm,
        temp_rating_c: p.temp_rating_c,
        material: p.material,
        variants: [p],
        colors: [p.color],
        sizes: [p.size],
      });
    } else {
      g.variants.push(p);
      if (!g.colors.includes(p.color)) g.colors.push(p.color);
      if (!g.sizes.includes(p.size)) g.sizes.push(p.size);
    }
  }
  return map;
}

export function byCode(products: Product[], code: string): Product | undefined {
  return products.find((p) => p.product_code === code);
}
