import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMenu } from "../../context/MenuContext";

// Files live in client/public/videos/
const INTRO_VIDEO = "/videos/welcome-intro.mp4"; // beans fall into the cup (plays once, ~3.8 s)
const STEAM_VIDEO = "/videos/welcome-steam.mp4?v=3"; // still cup – only the real steam moves (repeats forever). "?v=3" = load the new file, not an old cached one
const POSTER = "/videos/welcome-poster.jpg"; // still picture: used while loading / if video can't play / reduced motion

const TITLE_LINES = ["Cloud Nine", "Coffee Bar"];
const LETTER_DELAY_MS = 45; // time between each title letter appearing

// Timing of the hand-over from the intro to the steam loop
const TEXT_START_S = 2.4; // title starts while the camera is still settling (no "empty" wait)
const CROSSFADE_S = 0.7; // the steam loop starts this long before the intro ends, and they blend
const INTRO_FALLBACK_MS = 5000; // show everything anyway if the video is slow or blocked
const LEAVE_MS = 350; // fade-out after "tap to start", then open the menu

// Endless steam without a visible restart:
// the file holds the same seamless 1.4 s steam cycle 12 times (17 s). Two copies of it take turns:
// 1.5 s before the visible copy ends, the hidden copy jumps (while paused) to the moment the visible
// copy will reach 0.5 s later, then starts exactly at that moment – both show the same picture.
const STEAM_REPEATS = 12;
const PREPARE_BEFORE_END_S = 1.5;
const SEEK_LEAD_S = 0.5; // time the hidden copy gets to jump and be ready
const STEAM_FADE_MS = 200; // short blend that hides even a one-frame difference

const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export default function WelcomePage() {
  const navigate = useNavigate();
  const { loading, error } = useMenu();
  const [reducedMotion] = useState(prefersReducedMotion);

  const [showText, setShowText] = useState(reducedMotion); // title + tagline + button
  const [crossfading, setCrossfading] = useState(reducedMotion); // intro fading out over the steam loop
  const [videoFailed, setVideoFailed] = useState(false);
  const [leaving, setLeaving] = useState(false); // tapped → fading out

  const steamA = useRef(null); // two copies of the steam video
  const steamB = useRef(null);
  const [activeSteam, setActiveSteam] = useState(0); // copy on top (fading in / visible)
  const [previousSteam, setPreviousSteam] = useState(null); // copy kept visible underneath during a hand-over
  const activeSteamRef = useRef(0);
  const swapping = useRef(false);
  const swapTimer = useRef(null);
  const swapFrame = useRef(null);
  const leaveTimer = useRef(null);
  const crossfadeStarted = useRef(reducedMotion);

  // Start the steam loop underneath and fade the intro away (runs only once)
  const startCrossfade = useCallback(() => {
    setShowText(true);
    if (crossfadeStarted.current) return;
    crossfadeStarted.current = true;
    steamA.current?.play().catch(() => {}); // if autoplay is blocked, the poster stays
    setCrossfading(true);
  }, []);

  // Near the end of the visible steam copy, hand over to the other copy
  const handleSteamTime = (index) => {
    const [current, next] = index === 0 ? [steamA.current, steamB.current] : [steamB.current, steamA.current];
    if (index !== activeSteamRef.current || swapping.current || !current?.duration || !next) return;
    if (current.currentTime < current.duration - PREPARE_BEFORE_END_S) return;

    swapping.current = true;
    const cycle = current.duration / STEAM_REPEATS;
    const switchAt = current.currentTime + SEEK_LEAD_S; // moment (in the visible copy) to switch
    next.currentTime = switchAt % cycle; // same moment of the steam, in the first cycle (ready while paused)
    let lastTime = current.currentTime;

    // Check every screen refresh; start the hidden copy the moment the visible one gets there
    const waitForSwitch = () => {
      const now = current.currentTime;
      const reached = now >= switchAt || now < lastTime; // "< lastTime" = it already wrapped around
      lastTime = now;
      if (!reached) {
        swapFrame.current = requestAnimationFrame(waitForSwitch);
        return;
      }
      next
        .play()
        .then(() => {
          activeSteamRef.current = 1 - index;
          setPreviousSteam(index); // old copy stays fully visible underneath (no dark dip)
          setActiveSteam(1 - index); // new copy blends in on top
          swapTimer.current = setTimeout(() => {
            setPreviousSteam(null);
            current.pause();
            current.currentTime = 0;
            swapping.current = false;
          }, STEAM_FADE_MS + 50);
        })
        .catch(() => {
          swapping.current = false; // couldn't start: the visible copy simply loops by itself
        });
    };
    swapFrame.current = requestAnimationFrame(waitForSwitch);
  };

  // Called many times a second while the intro plays
  const handleIntroTime = (event) => {
    const video = event.currentTarget;
    if (!video.duration) return;
    if (video.currentTime >= TEXT_START_S) setShowText(true);
    if (video.currentTime >= video.duration - CROSSFADE_S) startCrossfade();
  };

  const handleVideoError = useCallback(() => {
    setVideoFailed(true); // show the still picture instead
    setShowText(true);
    crossfadeStarted.current = true;
    setCrossfading(true);
  }, []);

  // Safety net: never leave the customer waiting if the video is slow or blocked
  useEffect(() => {
    if (crossfading) return;
    const timer = setTimeout(startCrossfade, INTRO_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [crossfading, startCrossfade]);

  useEffect(
    () => () => {
      clearTimeout(leaveTimer.current);
      clearTimeout(swapTimer.current);
      cancelAnimationFrame(swapFrame.current);
    },
    []
  );

  // Tap: a short fade-out, then the menu (works at any moment, even during the intro)
  const start = () => {
    if (leaving) return; // ignore double taps
    if (reducedMotion) {
      navigate("/menu");
      return;
    }
    setLeaving(true);
    leaveTimer.current = setTimeout(() => navigate("/menu"), LEAVE_MS);
  };

  // One copy of the steam loop. The copy on top fades in; the previous one stays visible
  // underneath until the fade is finished, so the picture never dims.
  const renderSteam = (index, ref) => (
    <video
      ref={ref}
      src={STEAM_VIDEO}
      poster={POSTER}
      muted
      loop
      playsInline
      preload="auto"
      onTimeUpdate={() => handleSteamTime(index)}
      onError={handleVideoError}
      className={`absolute inset-0 h-full w-full object-cover ${
        activeSteam === index
          ? "z-[1] opacity-100 transition-opacity ease-in-out"
          : previousSteam === index
            ? "z-0 opacity-100"
            : "z-0 opacity-0"
      }`}
      style={{ transitionDuration: `${STEAM_FADE_MS}ms` }}
    />
  );

  // Title letters appear one after another, then the tagline, then "Tap to start"
  const letterCount = TITLE_LINES.join("").length;
  const taglineDelay = letterCount * LETTER_DELAY_MS + 300;
  const showStill = reducedMotion || videoFailed;

  return (
    <button
      type="button"
      onClick={start}
      aria-label="Tap to start your order"
      className={`relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-espresso text-center transition-opacity ease-out ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${LEAVE_MS}ms` }}
    >
      {/* ---------- Background (decoration only) ---------- */}
      {/* Layers, bottom → top: steam copies (0–1), intro (2), dark overlay (3). Text sits above all (z-10). */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        {showStill ? (
          <img src={POSTER} alt="" className="h-full w-full object-cover" />
        ) : (
          <>
            {/* Two copies of the steam loop take turns (see handleSteamTime). The first one waits
                underneath the intro and starts during the cross-fade. "loop" is only a safety net. */}
            {renderSteam(0, steamA)}
            {renderSteam(1, steamB)}
            {/* Intro on top: fades out smoothly instead of switching off in one frame */}
            <video
              src={INTRO_VIDEO}
              autoPlay
              muted
              playsInline
              preload="auto"
              onTimeUpdate={handleIntroTime}
              onEnded={startCrossfade}
              onError={handleVideoError}
              className={`absolute inset-0 z-[2] h-full w-full object-cover transition-opacity duration-700 ease-in-out ${
                crossfading ? "opacity-0" : "opacity-100"
              }`}
            />
          </>
        )}

        {/* Darkens the picture so the light text is easy to read */}
        <div className="absolute inset-0 z-[3] bg-gradient-to-b from-black/35 via-black/25 to-black/65" />
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
                    className={`inline-block ${showText ? "letter-in" : "opacity-0"}`}
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
          className={`text-base text-cream/90 drop-shadow md:text-2xl ${showText ? "fade-up" : "opacity-0"}`}
          style={{ animationDelay: `${taglineDelay}ms` }}
        >
          Freshly brewed, just the way you like it
        </p>

        <span
          className={`mt-6 ${showText ? "fade-up" : "opacity-0"}`}
          style={{ animationDelay: `${taglineDelay + 500}ms` }}
        >
          <span className="soft-pulse inline-block rounded-full border border-cream/40 bg-black/40 px-10 py-4 font-display text-2xl text-cream md:text-4xl">
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