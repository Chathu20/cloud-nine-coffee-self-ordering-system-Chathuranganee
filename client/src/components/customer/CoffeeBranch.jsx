// Decorative coffee-branch line drawing (leaves + coffee cherries).
// Purely decoration: hidden from screen readers and never catches taps.
const LEAF = "M0 0 C 10 -13, 38 -15, 58 0 C 38 15, 10 13, 0 0 Z M4 0 L 52 0";

const LEAVES = [
  { x: 40, y: 162, angle: -100 },
  { x: 62, y: 140, angle: 15 },
  { x: 92, y: 110, angle: -105 },
  { x: 122, y: 80, angle: 10 },
  { x: 150, y: 52, angle: -95 },
  { x: 176, y: 30, angle: 5 },
];

const CHERRIES = [
  { x: 84, y: 128 },
  { x: 97, y: 134 },
  { x: 88, y: 142 },
  { x: 140, y: 74 },
  { x: 150, y: 84 },
];

export default function CoffeeBranch({ className = "" }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none ${className}`}
    >
      {/* Stem */}
      <path d="M8 192 C 60 150, 110 100, 194 14" />

      {/* Leaves */}
      {LEAVES.map(({ x, y, angle }) => (
        <path key={`${x}-${y}`} d={LEAF} transform={`translate(${x} ${y}) rotate(${angle})`} />
      ))}

      {/* Coffee cherries with a small highlight */}
      {CHERRIES.map(({ x, y }) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="6.5" />
          <path d={`M${x - 3} ${y - 2} q 2 -3 5 -2`} />
        </g>
      ))}
    </svg>
  );
}