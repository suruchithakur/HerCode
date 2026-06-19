import { AppShell } from "@/components/AppShell";
import { ProductHero, specChips } from "@/components/ProductCard";
import { byCode, groupByProductId, useProducts } from "@/lib/products";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useMemo, useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send } from "lucide-react";

export const Route = createFileRoute("/product/$code")({
  head: () => ({ meta: [{ title: "Product — TrailMate" }] }),
  component: ProductPage,
});

const SUGGESTIONS = [
  "Is this warm enough for my trip?",
  "Show me cheaper alternatives in the store",
  "What's the size availability?",
  "How does the material feel & breathe?",
];

function ProductPage() {
  const { code } = useParams({ from: "/product/$code" });
  const products = useProducts();
  const product = products.data ? byCode(products.data, code) : null;
  const group = useMemo(() => {
    if (!products.data || !product) return null;
    return groupByProductId(products.data).get(product.product_id) ?? null;
  }, [products.data, product]);

  const alternatives = useMemo(() => {
    if (!products.data || !product) return [];
    const groups = Array.from(groupByProductId(products.data).values());
    return groups
      .filter((g) => g.category === product.category && g.product_id !== product.product_id)
      .slice(0, 6)
      .map((g) => ({ product_id: g.product_id, name: g.name, brand: g.brand, price_chf: g.price_chf, tags: g.tags }));
  }, [products.data, product]);

  const system = useMemo(() => {
    if (!product || !group) return "";
    return `You are TrailMate, a friendly Swiss outdoor gear concierge embedded in a retail app.
Answer only based on the product data and store catalog snippet below. Be concise (3-5 sentences max). Use markdown bullets when helpful. If the user asks about feel/style/comfort, infer from the material, weight and category. If asked about availability, reference the variants list. If asked for alternatives, suggest from the ALTERNATIVES list by name and brand.

PRODUCT:
${JSON.stringify({ ...group, variants: group.variants.map(v => ({ size: v.size, color: v.color, stock_total: v.stock_total, product_code: v.product_code })) })}

ALTERNATIVES (same category):
${JSON.stringify(alternatives)}`;
  }, [product, group, alternatives]);

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status } = useChat({ transport });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function send(text: string) {
    if (!text.trim() || !system) return;
    sendMessage({ text: text.trim() }, { body: { system } });
    setInput("");
  }

  if (!product || !group) return <AppShell title="Product" back="/">Loading…</AppShell>;

  return (
    <AppShell title={product.name} back="/">
      <div className="mb-4 flex gap-3 rounded-2xl border border-border bg-card p-3">
        <div className="h-24 w-24 shrink-0">
          <ProductHero group={group} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{group.brand}</div>
          <div className="truncate text-sm font-semibold">{group.name}</div>
          <div className="mt-1 text-xs text-emerald-700">CHF {group.price_chf}</div>
          <div className="text-[11px] text-muted-foreground">
            Zone {group.zone} · Aisle {group.aisle}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {specChips(group).slice(0, 3).map((c) => (
              <span key={c} className="rounded-full bg-muted px-1.5 py-0.5 text-[9px]">{c}</span>
            ))}
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="mb-3 max-h-[42vh] min-h-[12vh] space-y-3 overflow-y-auto rounded-2xl bg-muted/40 p-3"
      >
        {messages.length === 0 && (
          <div className="text-center text-xs text-muted-foreground">
            Ask anything about this product.
          </div>
        )}
        {messages.map((m: UIMessage) => {
          const text = m.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("")
            .trim();
          if (!text) return null;
          const mine = m.role === "user";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-emerald-600 text-white" : "bg-card text-foreground border border-border"
                }`}
              >
                <div className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1">
                  <ReactMarkdown>{text}</ReactMarkdown>
                </div>
              </div>
            </div>
          );
        })}
        {(status === "submitted" || status === "streaming") && (
          <div className="text-xs text-muted-foreground">TrailMate is typing…</div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground hover:border-emerald-400"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about fit, warmth, alternatives…"
          className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || status === "streaming"}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </AppShell>
  );
}
