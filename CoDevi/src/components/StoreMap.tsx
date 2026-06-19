import {
  buildStoreRoute,
  ENTRANCE_POS,
  EXIT_POS,
  MAP_ASPECT_RATIO,
  MAP_IMAGE_SRC,
  ZONE_INFO,
} from "@/lib/store-map";
import { useEffect, useMemo, useState } from "react";

export type MapPin = { x: number; y: number; zone: string; label: string; done?: boolean };

export function StoreMap({
  pins,
  route = true,
  selectedIndex,
  onSelect,
  userPos,
  heading,
  arrived,
}: {
  pins: MapPin[];
  route?: boolean;
  selectedIndex?: number | null;
  onSelect?: (i: number) => void;
  userPos?: { x: number; y: number } | null;
  heading?: { x: number; y: number } | null;
  arrived?: boolean;
}) {
  const nextIndex = useMemo(() => pins.findIndex((p) => !p.done), [pins]);
  const focusIndex = selectedIndex ?? (nextIndex >= 0 ? nextIndex : null);

  const computed = useMemo(
    () =>
      route
        ? buildStoreRoute(
            pins.map((p) => ({ x: p.x, y: p.y })),
            pins.map((p) => p.zone)
          )
        : null,
    [pins, route]
  );

  const pathD = useMemo(
    () =>
      computed
        ? computed.points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ")
        : "",
    [computed]
  );

  const totalLen = computed?.totalLen ?? 0;

  const focusZone = focusIndex != null ? pins[focusIndex]?.zone : null;
  const focusBox = focusZone ? ZONE_INFO[focusZone]?.box : null;

  const [tick, setTick] = useState(0);
  useEffect(() => setTick((t) => t + 1), [pathD]);

  // Arrow direction (degrees) from heading vector
  const arrowDeg = useMemo(() => {
    if (!heading) return 0;
    const mag = Math.hypot(heading.x, heading.y);
    if (mag < 0.0001) return 0;
    return (Math.atan2(heading.y, heading.x) * 180) / Math.PI;
  }, [heading]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
      style={{ aspectRatio: `${MAP_ASPECT_RATIO}` }}
    >
      <img
        src={MAP_IMAGE_SRC}
        alt="Store map"
        className="absolute inset-0 h-full w-full select-none object-fill"
        draggable={false}
      />

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <filter id="pinShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0.4" stdDeviation="0.5" floodOpacity="0.35" />
          </filter>
        </defs>

        {focusBox && (
          <rect
            x={focusBox.x}
            y={focusBox.y}
            width={focusBox.w}
            height={focusBox.h}
            rx="2"
            ry="2"
            fill="rgba(220,38,38,0.10)"
            stroke="#dc2626"
            strokeWidth="0.4"
            strokeDasharray="1.2 0.8"
            vectorEffect="non-scaling-stroke"
          >
            <animate attributeName="opacity" values="0.6;1;0.6" dur="1.8s" repeatCount="indefinite" />
          </rect>
        )}

        {route && computed && computed.points.length > 1 && (
          <g>
            <path
              d={pathD}
              fill="none"
              stroke="#dc2626"
              strokeOpacity="0.18"
              strokeWidth="2.4"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              key={tick}
              d={pathD}
              fill="none"
              stroke="#dc2626"
              strokeWidth="1.1"
              strokeDasharray="2 1.4"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={{
                strokeDashoffset: totalLen,
                animation: `tm-draw 1.2s ease-out forwards`,
              }}
            />
          </g>
        )}

        <g>
          <circle cx={ENTRANCE_POS.x} cy={ENTRANCE_POS.y} r="1.4" fill="#10b981" stroke="#fff" strokeWidth="0.4" />
          <circle cx={EXIT_POS.x} cy={EXIT_POS.y} r="1.4" fill="#0ea5e9" stroke="#fff" strokeWidth="0.4" />
        </g>

        {pins.map((pin, i) => {
          const isFocus = i === focusIndex;
          const isNext = i === nextIndex && !pin.done;
          const fill = pin.done ? "#10b981" : isNext ? "#dc2626" : "#0f172a";
          return (
            <g
              key={i}
              transform={`translate(${pin.x} ${pin.y})`}
              style={{ cursor: onSelect ? "pointer" : "default" }}
              onClick={() => onSelect?.(i)}
            >
              {isFocus && (
                <circle r="5" fill="none" stroke={fill} strokeWidth="0.5" opacity="0.7">
                  <animate attributeName="r" values="3.6;6.5;3.6" dur="1.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0;0.9" dur="1.6s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                r={isFocus ? 3.8 : 3.2}
                fill={fill}
                stroke="#fff"
                strokeWidth="0.7"
                filter="url(#pinShadow)"
              />
              <text
                textAnchor="middle"
                y="1.25"
                fontSize="3.6"
                fill="#fff"
                fontWeight="800"
                style={{ pointerEvents: "none" }}
              >
                {pin.done ? "✓" : i + 1}
              </text>
            </g>
          );
        })}

        {/* You-are-here marker + directional arrow */}
        {userPos && (
          <g transform={`translate(${userPos.x} ${userPos.y})`}>
            {/* Pulsing accuracy ring */}
            <circle r="3.5" fill="#2563eb" opacity="0.18">
              <animate attributeName="r" values="3.5;6;3.5" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.35;0;0.35" dur="2s" repeatCount="indefinite" />
            </circle>
            {/* Directional arrow (hidden when arrived) */}
            {!arrived && heading && (
              <g transform={`rotate(${arrowDeg})`}>
                <polygon
                  points="3.6,0 -1.2,-2.2 -0.2,0 -1.2,2.2"
                  fill="#2563eb"
                  stroke="#fff"
                  strokeWidth="0.35"
                  strokeLinejoin="round"
                  filter="url(#pinShadow)"
                />
              </g>
            )}
            {/* Solid blue dot */}
            <circle r="1.5" fill="#2563eb" stroke="#fff" strokeWidth="0.6" />
            {arrived && (
              <circle r="2.6" fill="none" stroke="#2563eb" strokeWidth="0.5">
                <animate attributeName="r" values="2.2;4.5;2.2" dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0;1" dur="1.2s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        )}
      </svg>

      <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-2 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-medium text-slate-700 shadow-sm backdrop-blur">
        <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-600" />You</span>
        <span className="text-slate-300">·</span>
        <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-red-600" />Next</span>
        <span className="text-slate-300">·</span>
        <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />Done</span>
      </div>

      <style>{`@keyframes tm-draw { to { stroke-dashoffset: 0; } }`}</style>
    </div>
  );
}
