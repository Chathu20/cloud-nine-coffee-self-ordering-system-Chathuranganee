import { useState } from "react";

const FALLBACK_ICON = { Food: "🥐", "Other Drinks": "🍫" };

// Shows the product photo, or a friendly icon if the image is missing/broken
export default function ProductImage({ src, alt, category, className = "" }) {
  const [failedSrc, setFailedSrc] = useState(null);

  if (!src || failedSrc === src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-latte/30 text-6xl ${className}`}
      >
        {FALLBACK_ICON[category] ?? "☕"}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSrc(src)}
      className={`object-cover ${className}`}
    />
  );
}