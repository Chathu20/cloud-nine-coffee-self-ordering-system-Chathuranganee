// Animated coffee cup: fills with coffee, then steam rises
const CUP_SHAPE = "M52 78 H148 L138 158 Q136 170 124 170 H76 Q64 170 62 158 Z";

export default function CoffeeCup({ className = "" }) {
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="A cup of coffee">
      <defs>
        <clipPath id="cup-inside">
          <path d={CUP_SHAPE} />
        </clipPath>
      </defs>

      {/* Steam – three wavy lines that rise at different times */}
      <g className="stroke-latte" strokeWidth="6" strokeLinecap="round" fill="none">
        <path className="steam" style={{ animationDelay: "1.4s" }} d="M80 64 q-10 -12 0 -24 q10 -12 0 -24" />
        <path className="steam" style={{ animationDelay: "1.9s" }} d="M100 64 q-10 -12 0 -24 q10 -12 0 -24" />
        <path className="steam" style={{ animationDelay: "2.4s" }} d="M120 64 q-10 -12 0 -24 q10 -12 0 -24" />
      </g>

      {/* Coffee – only visible inside the cup shape */}
      <g clipPath="url(#cup-inside)">
        <rect className="coffee-fill fill-coffee" x="40" y="78" width="120" height="100" />
      </g>

      {/* Cup outline, handle and saucer */}
      <g className="stroke-espresso" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={CUP_SHAPE} />
        <path d="M146 96 q26 0 24 22 q-2 20 -28 20" />
        <path d="M36 182 H164" />
      </g>
    </svg>
  );
}