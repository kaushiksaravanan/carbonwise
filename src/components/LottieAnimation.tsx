'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Lazy-load the lottie-react runtime so the ~250KB Lottie player is
// code-split out of the main client bundle. ssr:false because Lottie
// touches the DOM/canvas and has no value during server rendering.
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

// Module-level cache so the same animation JSON is fetched and parsed
// only once per src across mounts (e.g. every dashboard visit, every
// chat loading bubble re-render).
const animationCache = new Map<string, unknown>();

interface LottieAnimationProps {
  src: string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  ariaLabel?: string;
}

export default function LottieAnimation({
  src,
  loop = true,
  autoplay = true,
  className = '',
  ariaLabel = 'Animation',
}: LottieAnimationProps) {
  const [animationData, setAnimationData] = useState<unknown>(
    () => animationCache.get(src) ?? null
  );

  useEffect(() => {
    let cancelled = false;

    const cached = animationCache.get(src);
    if (cached) {
      setAnimationData(cached);
      return;
    }

    fetch(src)
      .then((res) => res.json())
      .then((data) => {
        animationCache.set(src, data);
        if (!cancelled) setAnimationData(data);
      })
      .catch(() => {
        if (!cancelled) setAnimationData(null);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!animationData) return null;

  return (
    <div role="img" aria-label={ariaLabel} className={className}>
      <Lottie animationData={animationData} loop={loop} autoplay={autoplay} />
    </div>
  );
}
