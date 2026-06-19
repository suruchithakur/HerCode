import { useEffect, useState } from "react";
import { findProductImage } from "./product-image.functions";
import type { ProductGroup } from "./types";

const STORAGE_KEY = "trailmate.product-images.v1";
const NEGATIVE_TTL_MS = 1000 * 60 * 60 * 24; // retry not-founds after 1 day

type CacheEntry = { url: string | null; ts: number };
type CacheShape = Record<string, CacheEntry>;

const inflight = new Map<string, Promise<string | null>>();

function readCache(): CacheShape {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeCache(cache: CacheShape) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // quota — drop silently
  }
}

function queryFor(group: ProductGroup): string {
  return `${group.brand} ${group.name} ${group.category}`.trim();
}

async function fetchImage(id: string, query: string): Promise<string | null> {
  if (inflight.has(id)) return inflight.get(id)!;
  const p = (async () => {
    try {
      const res = await findProductImage({ data: { query } });
      const cache = readCache();
      cache[id] = { url: res.url, ts: Date.now() };
      writeCache(cache);
      return res.url;
    } catch {
      return null;
    } finally {
      inflight.delete(id);
    }
  })();
  inflight.set(id, p);
  return p;
}

export function useProductImage(group: ProductGroup): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    const c = readCache()[group.product_id];
    if (!c) return null;
    if (c.url === null && Date.now() - c.ts > NEGATIVE_TTL_MS) return null;
    return c.url;
  });

  useEffect(() => {
    const cache = readCache();
    const entry = cache[group.product_id];
    if (entry && (entry.url || Date.now() - entry.ts < NEGATIVE_TTL_MS)) {
      setUrl(entry.url);
      return;
    }
    let alive = true;
    fetchImage(group.product_id, queryFor(group)).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [group.product_id, group.brand, group.name, group.category]);

  return url;
}
