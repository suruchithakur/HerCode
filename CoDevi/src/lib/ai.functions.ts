import { createServerFn } from "@tanstack/react-start";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { generateText } from "ai";
import { z } from "zod";
import type { Trip } from "./types";

const TripSchema = z.object({
  name: z.string(),
  country: z.string(),
  month: z.string(),
  weather: z.string(),
  gender: z.string(),
  height_cm: z.string(),
  weight_kg: z.string(),
  sizing_notes: z.string(),
  style: z.string(),
  days: z.string(),
  activities: z.array(z.string()),
  budget_chf: z.string(),
  notes: z.string(),
}) satisfies z.ZodType<Pick<Trip,
  "name" | "country" | "month" | "weather" | "gender" | "height_cm" | "weight_kg" |
  "sizing_notes" | "style" | "days" | "activities" | "budget_chf" | "notes"
>>;

const CatalogItem = z.object({
  product_id: z.string(),
  name: z.string(),
  brand: z.string(),
  category: z.string(),
  price_chf: z.number(),
  tags: z.array(z.string()),
  waterproof_rating_mm: z.number().nullable(),
  temp_rating_c: z.number().nullable(),
  weight_g: z.number().nullable(),
  material: z.string(),
  zone_name: z.string(),
});

function extractJson(raw: string): unknown {
  let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.search(/[\[{]/);
  const openChar = start !== -1 ? cleaned[start] : "";
  const closeChar = openChar === "[" ? "]" : "}";
  const end = cleaned.lastIndexOf(closeChar);
  if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(cleaned);
  } catch {
    cleaned = cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, "");
    return JSON.parse(cleaned);
  }
}

const PicksSchema = z.object({
  picks: z.array(z.object({ product_id: z.string(), reason: z.string() })),
});

export const generateChecklist = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ trip: TripSchema, catalog: z.array(CatalogItem) }).parse(input)
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const system = `You are TrailMate, an expert Swiss outdoor gear advisor for an in-store concierge app.
You are given a shopper trip profile and a catalog of available products in the store.
Recommend a smart, complete gear checklist tailored to the trip. Cover essentials (no duplicates across categories), respect the budget loosely, and match weather/activities/style.
Pick 8-14 items. Return ONLY product_ids that appear in the catalog, each with a one-line reason aimed at the shopper.

Respond with STRICT JSON only, no prose, no markdown fences. Shape:
{"picks":[{"product_id":"...","reason":"..."}]}`;

    const prompt = `TRIP:\n${JSON.stringify(data.trip, null, 2)}\n\nCATALOG (one entry per distinct product_id):\n${JSON.stringify(
      data.catalog
    )}`;

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
      prompt,
    });

    const parsed = PicksSchema.parse(extractJson(text));
    // Filter to valid catalog product_ids defensively
    const valid = new Set(data.catalog.map((c) => c.product_id));
    parsed.picks = parsed.picks.filter((p) => valid.has(p.product_id));
    return parsed;
  });

const PackingItem = z.object({ product_id: z.string(), name: z.string(), category: z.string() });

const PackingSchema = z.object({
  groups: z.array(
    z.object({
      title: z.string(),
      items: z.array(z.object({ product_id: z.string(), note: z.string() })),
    })
  ),
});

export const generatePackingList = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ trip: TripSchema, items: z.array(PackingItem) }).parse(input)
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const system = `You are TrailMate. Group the user's selected products into a packing checklist with clear section titles (e.g. "On your body", "Shelter & Sleep", "In your pack", "Accessories"). For each item add a short helpful note (1 sentence max). Use ONLY the provided product_ids.

Respond with STRICT JSON only, no prose, no markdown fences. Shape:
{"groups":[{"title":"...","items":[{"product_id":"...","note":"..."}]}]}`;

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
      prompt: `TRIP:\n${JSON.stringify(data.trip, null, 2)}\n\nSELECTED ITEMS:\n${JSON.stringify(data.items)}`,
    });

    return PackingSchema.parse(extractJson(text));
  });
