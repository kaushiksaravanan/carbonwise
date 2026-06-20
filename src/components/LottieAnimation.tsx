'use client';

import Lottie from 'lottie-react';
import { useEffect, useState } from 'react';

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
  const [animationData, setAnimationData] = useState<unknown>(null);

  useEffect(() => {
    fetch(src)
      .then((res) => res.json())
      .then(setAnimationData)
      .catch(() => setAnimationData(null));
  }, [src]);

  if (!animationData) return null;

  return (
    <div role="img" aria-label={ariaLabel} className={className}>
      <Lottie animationData={animationData} loop={loop} autoplay={autoplay} />
    </div>
  );
}
