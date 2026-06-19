import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({ query: z.string().min(1).max(200) });

/**
 * Find a product image URL by scraping DuckDuckGo's image search.
 * Free, no API key. Returns null if nothing found.
 */
export const findProductImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const { query } = data;
    try {
      // Step 1: get vqd token from HTML search page
      const tokenRes = await fetch(
        `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          },
        },
      );
      const html = await tokenRes.text();
      const m = html.match(/vqd=(?:"|&quot;|')([\d-]+)(?:"|&quot;|')/) ||
        html.match(/vqd=([\d-]+)&/);
      if (!m) return { url: null as string | null };
      const vqd = m[1];

      // Step 2: hit image JSON endpoint
      const imgRes = await fetch(
        `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=1`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
            Referer: "https://duckduckgo.com/",
            Accept: "application/json, text/javascript, */*; q=0.01",
          },
        },
      );
      if (!imgRes.ok) return { url: null };
      const json = (await imgRes.json()) as {
        results?: Array<{ image?: string; thumbnail?: string }>;
      };
      const first = json.results?.[0];
      return { url: first?.image ?? first?.thumbnail ?? null };
    } catch {
      return { url: null as string | null };
    }
  });
