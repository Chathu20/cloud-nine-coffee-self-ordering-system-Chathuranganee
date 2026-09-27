import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMenu } from "../../context/MenuContext";

// Files live in client/public/videos/
const INTRO_VIDEO = "/videos/welcome-intro.mp4"; // beans fall into the cup (plays once)
const STEAM_VIDEO = "/videos/welcome-steam.mp4"; // still cup – only the real steam moves (repeats forever)
const POSTER = "/videos/welcome-poster.jpg"; // still picture: used while loading / if video can't play / reduced motion

const TITLE_LINES = ["Cloud Nine", "Coffee Bar"];
const LETTER_DELAY_MS = 55; // time between each title letter appearing
const INTRO_FALLBACK_MS = 6000; // show the text anyway if the video never finishes

const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export default function WelcomePage() {
  const navigate = useNavigate();
  const { loading, error } = useMenu();
  const [reducedMotion] = useState(prefersReducedMotion);
  const [introDone, setIntroDone] = useState(reducedMotion); // reduced motion → skip straight to the text
  const [videoFailed, setVideoFailed] = useState(false);
  const steamRef = useRef(null);

  // Intro finished → switch to the steam loop (it starts on the exact frame the intro ends on)
  const finishIntro = useCallback(() => {
    setIntroDone(true);
    steamRef.current?.play().catch(() => {}); // if autoplay is blocked, the still picture stays
  }, []);

  const handleVideoError = useCallback(() => {
    setVideoFailed(true); // show the still picture instead
    setIntroDone(true);
  }, []);

  // Safety net: never leave the customer waiting if the video is slow or blocked
  useEffect(() => {
    if (introDone) return;
    const timer = setTimeout(finishIntro, INTRO_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [introDone, finishIntro]);

  // Title letters appear one after another, then the tagline, then "Tap to start"
  const letterCount = TITLE_LINES.join("").length;
  const taglineDelay = letterCount * LETTER_DELAY_MS + 400;
  const showStill = reducedMotion || videoFailed;

  return (
    <button
      type="button"
      onClick={() => navigate("/menu")}
      aria-label="Tap to start your order"
      className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-espresso text-center"
    >
      {/* ---------- Background (decoration only) ---------- */}
      <div className="absolute inset-0" aria-hidden="true">
        {showStill ? (
          <img src={POSTER} alt="" className="h-full w-full object-cover" />
        ) : (
          <>
            {/* Steam loop waits underneath and takes over when the intro ends */}
            <video
              ref={steamRef}
              src={STEAM_VIDEO}
              poster={POSTER}
              muted
              loop
              playsInline
              preload="auto"
              onError={handleVideoError}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <video
              src={INTRO_VIDEO}
              autoPlay
              muted
              playsInline
              preload="auto"
              onEnded={finishIntro}
              onError={handleVideoError}
              className={`absolute inset-0 h-full w-full object-cover ${introDone ? "invisible" : ""}`}
            />
          </>
        )}

        {/* Darkens the picture so the light text is easy to read */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/25 to-black/65" />
      </div>

      {/* ---------- Text ---------- */}
      <div className="relative z-10 flex flex-col items-center gap-5 px-6">
        <h1 className="font-display text-6xl leading-[0.95] text-cream drop-shadow-lg sm:text-7xl md:text-8xl lg:text-9xl">
          {TITLE_LINES.map((line, lineIndex) => {
            const offset = TITLE_LINES.slice(0, lineIndex).join("").length;
            return (
              <span key={line} className="block whitespace-nowrap">
                {[...line].map((char, i) => (
                  <span
                    key={i}
                    className={`inline-block ${introDone ? "letter-in" : "opacity-0"}`}
                    style={{ animationDelay: `${(offset + i) * LETTER_DELAY_MS}ms` }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </span>
                ))}
              </span>
            );
          })}
        </h1>

        <p
          className={`text-base text-cream/90 drop-shadow md:text-2xl ${introDone ? "fade-up" : "opacity-0"}`}
          style={{ animationDelay: `${taglineDelay}ms` }}
        >
          Freshly brewed, just the way you like it
        </p>

        <span
          className={`mt-6 ${introDone ? "fade-up" : "opacity-0"}`}
          style={{ animationDelay: `${taglineDelay + 600}ms` }}
        >
          <span className="soft-pulse inline-block rounded-full border border-cream/40 bg-black/25 px-10 py-4 font-display text-2xl text-cream backdrop-blur-sm md:text-4xl">
            Tap anywhere to start
          </span>
        </span>
      </div>

      {/* Menu status (bottom of the screen) */}
      <p className="absolute inset-x-0 bottom-6 z-10 h-6 text-sm text-cream/70">
        {error ? "Having trouble reaching the menu – please ask a staff member" : loading ? "Brewing the menu…" : ""}
      </p>
    </button>
  );
}