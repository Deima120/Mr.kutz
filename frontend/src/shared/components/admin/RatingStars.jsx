/**
 * Valoración visual (sustituye ★/☆) — lucide Star
 */

import { Star } from 'lucide-react';

export default function RatingStars({
  value,
  max = 5,
  sizeClass = 'w-3.5 h-3.5',
  gapClass = 'gap-0.5',
  className = '',
}) {
  const v = Math.min(max, Math.max(0, Number(value) || 0));
  return (
    <span className={`inline-flex items-center ${gapClass} ${className}`} aria-hidden>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`${sizeClass} shrink-0 ${i < v ? 'fill-amber-500 text-amber-500' : 'fill-none text-stone-300'}`}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}
