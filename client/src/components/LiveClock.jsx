import { useEffect, useState } from "react";

// Always show Sri Lanka time, even if the kiosk computer's own time zone is set wrongly
const TIME_ZONE = "Asia/Colombo";

const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: TIME_ZONE,
});

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

// Built from parts so it looks the same in every browser:
//   long  → "Tuesday, 29 September 2026"   (tablets / kiosk screens)
//   short → "Tue, 29 Sep 2026"             (phones)
const formatDates = (date) => {
  const part = Object.fromEntries(dateFormat.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    long: `${part.weekday}, ${part.day} ${part.month} ${part.year}`,
    short: `${part.weekday.slice(0, 3)}, ${part.day} ${part.month.slice(0, 3)} ${part.year}`,
  };
};

const read = () => {
  const now = new Date();
  return { time: timeFormat.format(now), date: formatDates(now), iso: now.toISOString() };
};

// variant "header": inside a dark header bar
// variant "floating": a small dark badge fixed to the top-right corner (pages without a header)
export default function LiveClock({ variant = "header", className = "" }) {
  const [clock, setClock] = useState(read);

  // Check every second so the minute changes on time; React only re-draws when the text changes
  useEffect(() => {
    const timer = setInterval(() => {
      const next = read();
      setClock((current) => (current.time === next.time && current.date.long === next.date.long ? current : next));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const content = (
    <time dateTime={clock.iso} className="block text-right leading-tight">
      <span className="block text-lg font-bold tabular-nums text-cream sm:text-2xl md:text-3xl">{clock.time}</span>
      <span className="block text-xs text-cream/70 sm:hidden">{clock.date.short}</span>
      <span className="hidden text-sm text-cream/70 sm:block">{clock.date.long}</span>
    </time>
  );

  if (variant === "floating") {
    return (
      // pointer-events-none: taps go through the clock to the page underneath
      <div
        className={`pointer-events-none fixed right-4 top-4 z-50 rounded-2xl bg-espresso/80 px-4 py-2 shadow-lg backdrop-blur-sm ${className}`}
      >
        {content}
      </div>
    );
  }

  return <div className={className}>{content}</div>;
}