import type { ProductGroup } from "@/lib/types";
import { ZONE_INFO } from "@/lib/store-map";
import { useProductImage } from "@/lib/product-image-cache";
import { useState } from "react";

const CATEGORY_EMOJI: Record<string, string> = {
  hardshell: "🧥",
  "rain-jacket": "🧥",
  "insulated-jacket": "🧥",
  fleece: "🧥",
  "base-layer": "👕",
  trousers: "👖",
  boots: "🥾",
  "trail-shoes": "👟",
  "approach-shoes": "👟",
  socks: "🧦",
  gloves: "🧤",
  hat: "🧢",
  tent: "⛺",
  tarp: "⛺",
  "sleeping-bag": "🛌",
  "sleeping-mat": "🛏️",
  backpack: "🎒",
  headlamp: "🔦",
  stove: "🔥",
  "water-bottle": "💧",
  "trekking-poles": "🥢",
};

export function ProductHero({ group, className }: { group: ProductGroup; className?: string }) {
  const zone = ZONE_INFO[group.zone];
  const emoji = CATEGORY_EMOJI[group.category] ?? "🎽";
  const imageUrl = useProductImage(group);
  const [errored, setErrored] = useState(false);
  const showImage = imageUrl && !errored;

  return (
    <div
      className={`relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl ${className ?? ""}`}
      style={{
        background: `linear-gradient(160deg, ${zone?.color ?? "#ddd"} 0%, #ffffff 100%)`,
      }}
    >
      {showImage ? (
        <img
          src={imageUrl!}
          alt={`${group.brand} ${group.name}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setErrored(true)}
          className="h-full w-full object-contain p-4 mix-blend-multiply"
        />
      ) : (
        <div className="text-center">
          <div className="text-7xl">{emoji}</div>
          <div className="mt-3 text-xs uppercase tracking-wider text-foreground/70">{group.brand}</div>
        </div>
      )}
    </div>
  );
}

export function specChips(group: ProductGroup): string[] {
  const chips: string[] = [];
  if (group.waterproof_rating_mm) chips.push(`${group.waterproof_rating_mm.toLocaleString()}mm WP`);
  if (group.temp_rating_c !== null && group.temp_rating_c !== undefined)
    chips.push(`${group.temp_rating_c}°C`);
  if (group.weight_g) chips.push(`${group.weight_g}g`);
  if (group.material) chips.push(group.material);
  return chips;
}
