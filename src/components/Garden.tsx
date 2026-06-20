'use client';

import { GardenState } from '@/types';
import { useEffect, useMemo, useRef, useState } from 'react';

interface GardenProps {
  garden: GardenState;
  /** Optional: a stable seed so the layout is deterministic per user. */
  seed?: string;
  /** Optional: today's remaining carbon budget ratio (0..1). Drives the sky. */
  budgetRemaining?: number;
  /** Optional: 7-day rolling carbon health (0..1). Drives the grass. */
  rollingHealth?: number;
  /** Optional: callback fired when the user clicks "Share my garden". */
  onShare?: () => void;
  /** Optional: a public share URL (e.g. /g/[shareId]); if absent we synthesize one. */
  shareUrl?: string;
}

/**
 * Tiny seeded PRNG (mulberry32) so the garden "remembers" its layout.
 */
function makeRng(seedStr: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let t = h >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

type Plant = {
  id: string;
  kind: 'tree' | 'flower';
  x: number; // 0..100 (% of plot width)
  y: number; // 0..100 (% of plot depth — used for parallax + draw order)
  scale: number;
  hue: number; // species jitter
  stage: 'sprout' | 'sapling' | 'canopy';
};

function stageFromIndex(i: number, total: number): Plant['stage'] {
  // The earliest planted (lowest index) are the most mature.
  if (total === 0) return 'sprout';
  const ratio = (total - i) / total;
  if (ratio > 0.66) return 'canopy';
  if (ratio > 0.33) return 'sapling';
  return 'sprout';
}

function clamp01(n: number | undefined, fallback: number) {
  if (typeof n !== 'number' || Number.isNaN(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

export default function Garden({
  garden,
  seed,
  budgetRemaining,
  rollingHealth,
  onShare,
  shareUrl,
}: GardenProps) {
  const healthColor =
    garden.health > 70
      ? 'bg-green-500'
      : garden.health > 40
        ? 'bg-yellow-500'
        : 'bg-red-500';

  // Derive ambient state. Falls back to garden.health so behavior is sensible
  // even when callers don't pass the optional drivers.
  const sky = clamp01(budgetRemaining, garden.health / 100);
  const grass = clamp01(rollingHealth, garden.health / 100);

  // Build a deterministic plant layout. Seed defaults to a stable string so
  // re-renders keep the same garden shape — the "memory" the brief asks for.
  const seedKey = seed ?? `cw-garden-l${garden.level}`;
  const plants = useMemo<Plant[]>(() => {
    const rng = makeRng(seedKey);
    const list: Plant[] = [];
    const treeCount = Math.max(0, Math.floor(garden.trees));
    const flowerCount = Math.max(0, Math.floor(garden.flowers));
    for (let i = 0; i < treeCount; i++) {
      list.push({
        id: `t-${i}`,
        kind: 'tree',
        x: 6 + rng() * 88,
        y: 30 + rng() * 65, // trees occupy mid-back to foreground
        scale: 0.85 + rng() * 0.4,
        hue: rng(),
        stage: stageFromIndex(i, treeCount),
      });
    }
    for (let i = 0; i < flowerCount; i++) {
      list.push({
        id: `f-${i}`,
        kind: 'flower',
        x: 4 + rng() * 92,
        y: 55 + rng() * 42, // flowers cluster up front
        scale: 0.7 + rng() * 0.5,
        hue: rng(),
        stage: stageFromIndex(i, flowerCount),
      });
    }
    // Painter's algorithm — back to front so foreground plants overlap correctly.
    list.sort((a, b) => a.y - b.y);
    return list;
  }, [seedKey, garden.trees, garden.flowers]);

  // Sky gradient stops: sunny (high budget) → overcast → stormy (busted budget).
  const skyTop =
    sky > 0.66
      ? '#bde8ff'
      : sky > 0.33
        ? '#cfd8e3'
        : '#5e6b78';
  const skyBottom =
    sky > 0.66
      ? '#fff4d6'
      : sky > 0.33
        ? '#e8d8c4'
        : '#3a4754';

  // Grass: rich emerald → tan when 7-day health is poor.
  const grassNear = `hsl(${90 + grass * 30}, ${30 + grass * 45}%, ${22 + grass * 18}%)`;
  const grassFar = `hsl(${80 + grass * 30}, ${25 + grass * 40}%, ${32 + grass * 18}%)`;

  // Weather/breeze particles — drift only when the user is doing well.
  const breezeOn = grass > 0.45;

  // Parallax on scroll (cheap rAF-throttled).
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [parallax, setParallax] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = wrapRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        // -1..1 ratio of how far the element's center is from viewport center.
        const ratio = (rect.top + rect.height / 2 - vh / 2) / vh;
        setParallax(Math.max(-1, Math.min(1, ratio)));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Particle leaves that drift in when a green action lands. We watch the
  // count of plants — a new sprout = a fresh burst.
  const totalPlants = plants.length;
  const prevCount = useRef(totalPlants);
  const [burstKey, setBurstKey] = useState(0);
  useEffect(() => {
    if (totalPlants > prevCount.current) {
      setBurstKey((k) => k + 1);
    }
    prevCount.current = totalPlants;
  }, [totalPlants]);

  // Share interaction. We synthesize a /g/[shareId] URL when one isn't passed
  // so the share button still works in standalone preview.
  const [copied, setCopied] = useState(false);
  const computedShareUrl = useMemo(() => {
    if (shareUrl) return shareUrl;
    if (typeof window === 'undefined') return '';
    const id = encodeURIComponent(seedKey).slice(0, 24);
    return `${window.location.origin}/g/${id}`;
  }, [shareUrl, seedKey]);

  const handleShare = async () => {
    onShare?.();
    const url = computedShareUrl;
    if (!url) return;
    const shareData = {
      title: 'My CarbonWise Garden',
      text: `Level ${garden.level} • ${garden.trees} trees • ${garden.flowers} flowers`,
      url,
    };
    try {
      if (
        typeof navigator !== 'undefined' &&
        typeof (navigator as Navigator & { share?: (d: ShareData) => Promise<void> })
          .share === 'function'
      ) {
        await (
          navigator as Navigator & { share: (d: ShareData) => Promise<void> }
        ).share(shareData);
        return;
      }
    } catch {
      // user cancelled or share unsupported — fall through to clipboard
    }
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // last-resort: do nothing; the URL is still in the DOM aria-label
    }
  };

  return (
    <div
      ref={wrapRef}
      className="relative overflow-hidden rounded-2xl shadow-lg"
      style={{
        background: `linear-gradient(180deg, ${skyTop} 0%, ${skyBottom} 60%, ${grassFar} 60.01%, ${grassNear} 100%)`,
      }}
    >
      {/* Scene */}
      <div className="relative z-0 h-72 w-full sm:h-80">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-label={`Living garden scene: level ${garden.level}, ${garden.trees} trees, ${garden.flowers} flowers, ${garden.health}% health`}
          role="img"
        >
          {/* Sun / moon — position tracks today's budget remaining */}
          <circle
            cx={20 + sky * 60}
            cy={18 - sky * 6}
            r={5}
            fill={sky > 0.5 ? '#ffe27a' : '#e6e9ef'}
            opacity={0.9}
          />

          {/* Distant hills with parallax */}
          <path
            d={`M0,${62 + parallax * 1.5} Q25,${52 + parallax * 1.5} 50,${60 + parallax * 1.5} T100,${58 + parallax * 1.5} L100,100 L0,100 Z`}
            fill={grassFar}
            opacity={0.85}
          />

          {/* Ground */}
          <rect x={0} y={70} width={100} height={30} fill={grassNear} />

          {/* Plants — back to front. SVG y-axis: bigger y = nearer the camera */}
          {plants.map((p, i) => {
            // Map plant.y (30..97) into world y; bigger plants in front.
            const worldY = 60 + (p.y / 100) * 38;
            const depth = p.y / 100;
            // Parallax: foreground sways less; background drifts more.
            const px = p.x + parallax * 1.2 * (1 - depth);
            const sproutScale =
              p.stage === 'sprout' ? 0.45 : p.stage === 'sapling' ? 0.75 : 1;
            const finalScale = p.scale * sproutScale * (0.6 + depth * 0.6);
            const tint = p.kind === 'tree'
              ? `hsl(${100 + p.hue * 30}, ${40 + grass * 30}%, ${22 + grass * 14}%)`
              : `hsl(${320 + p.hue * 40}, 70%, ${60 + p.hue * 10}%)`;
            const trunk = `hsl(28, 40%, ${22 + p.hue * 8}%)`;
            const animDelay = `${(i % 7) * 0.12}s`;

            return (
              <g
                key={p.id}
                transform={`translate(${px}, ${worldY}) scale(${finalScale})`}
                style={{
                  transformOrigin: 'center bottom',
                  animation: `cw-grow 900ms cubic-bezier(.2,.7,.3,1.3) ${animDelay} both`,
                }}
              >
                {p.kind === 'tree' ? (
                  <>
                    {/* trunk */}
                    <rect x={-0.6} y={-3.5} width={1.2} height={3.5} fill={trunk} />
                    {/* canopy — three blobs for a friendlier silhouette */}
                    <circle cx={0} cy={-5} r={2.6} fill={tint} />
                    <circle cx={-1.6} cy={-4.2} r={1.8} fill={tint} opacity={0.9} />
                    <circle cx={1.6} cy={-4.2} r={1.8} fill={tint} opacity={0.9} />
                    {p.stage === 'canopy' && (
                      <circle cx={0} cy={-6.6} r={1.6} fill={tint} opacity={0.8} />
                    )}
                  </>
                ) : (
                  <>
                    {/* stem */}
                    <rect
                      x={-0.12}
                      y={-2.2}
                      width={0.24}
                      height={2.2}
                      fill="#3f7a3f"
                    />
                    {/* petals */}
                    <circle cx={0} cy={-2.6} r={0.8} fill={tint} />
                    <circle cx={-0.7} cy={-2.3} r={0.7} fill={tint} opacity={0.9} />
                    <circle cx={0.7} cy={-2.3} r={0.7} fill={tint} opacity={0.9} />
                    <circle cx={0} cy={-3.2} r={0.7} fill={tint} opacity={0.9} />
                    <circle cx={0} cy={-2.6} r={0.3} fill="#fff4a8" />
                  </>
                )}
              </g>
            );
          })}

          {/* Breeze leaves — only when 7-day health is decent */}
          {breezeOn &&
            Array.from({ length: 6 }).map((_, i) => (
              <circle
                key={`breeze-${i}`}
                r={0.45}
                fill={`hsl(${100 + i * 8}, 55%, 40%)`}
                opacity={0.7}
                style={{
                  animation: `cw-drift ${7 + i}s linear ${i * -1.2}s infinite`,
                }}
                cx={-5}
                cy={20 + i * 7}
              />
            ))}

          {/* One-shot leaf burst when a new plant arrives */}
          {burstKey > 0 &&
            Array.from({ length: 10 }).map((_, i) => (
              <circle
                key={`burst-${burstKey}-${i}`}
                r={0.55}
                fill={`hsl(${90 + i * 12}, 60%, 45%)`}
                opacity={0.9}
                style={{
                  animation: `cw-burst 1400ms ease-out ${i * 60}ms forwards`,
                }}
                cx={50}
                cy={70}
              />
            ))}
        </svg>
      </div>

      {/* HUD overlay (preserves existing health UI + adds share affordance) */}
      <div className="relative z-10 px-6 pb-5 pt-4 text-green-950">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold drop-shadow-sm">
            Level {garden.level}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium" aria-live="polite">
              Health: {garden.health}%
            </span>
            <button
              type="button"
              onClick={handleShare}
              className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-green-900 shadow ring-1 ring-green-900/10 backdrop-blur transition hover:bg-white"
              aria-label={`Share my garden — ${computedShareUrl}`}
            >
              {copied ? 'Link copied' : 'Share my garden'}
            </button>
          </div>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-white/40">
          <div
            className={`h-full rounded-full transition-all duration-700 ${healthColor}`}
            style={{ width: `${garden.health}%` }}
            role="progressbar"
            aria-valuenow={garden.health}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Garden health ${garden.health}%`}
          />
        </div>

        <p className="mt-3 text-sm font-medium" aria-live="polite">
          {garden.trees} trees, {garden.flowers} flowers
        </p>
      </div>

      {/* Scoped keyframes — kept inline so the component stays drop-in. */}
      <style>{`
        @keyframes cw-grow {
          0% { transform: translate(0,0) scale(0.001); opacity: 0; }
          60% { opacity: 1; }
          100% { transform: translate(0,0) scale(1); opacity: 1; }
        }
        @keyframes cw-drift {
          0%   { transform: translate(0,0) rotate(0deg); }
          100% { transform: translate(120px,-30px) rotate(540deg); }
        }
        @keyframes cw-burst {
          0%   { transform: translate(0,0) scale(0.4); opacity: 1; }
          100% { transform: translate(${(Math.random() - 0.5) * 60}px, -40px) scale(1.1); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="cw-grow"], [style*="cw-drift"], [style*="cw-burst"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
