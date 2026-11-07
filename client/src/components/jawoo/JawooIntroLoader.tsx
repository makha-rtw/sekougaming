import React, { useEffect, useRef, useState } from 'react';
import {
  gsap,
  useGSAP,
  isIntroComplete,
  markIntroComplete,
} from '../../animations/jawooEngine.js';
import { preloadPortalAssets } from '../PlatformSplashScreen.js';
import { TextMask } from './TextMask.js';

interface JawooIntroLoaderProps {
  onReady?: () => void;
}

/**
 * Exact replica of jawoo.io's IntroLoader (module 156554) adapted for SekouGaming:
 * - Runs strictly ONCE upon initial entry onto the site
 * - Full-screen #181818 curtain
 * - Top-left masked brand signature & bottom-right giant 0% -> 100% counter
 * - Center SekouGaming emblem whose opacity tracks m.value / 100
 * - Frame-accurate lerp (0.09) on gsap.ticker
 * - Staggered yPercent: -110 text exit (expo.in) + yPercent: -100 curtain lift (expo.inOut)
 */
export const JawooIntroLoader: React.FC<JawooIntroLoaderProps> = ({ onReady }) => {
  const [done, setDone] = useState<boolean>(() => isIntroComplete());
  const loaderRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const logoWrapRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (done || isIntroComplete()) return;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [done]);

  useGSAP(
    () => {
      if (done || isIntroComplete()) return;
      const loader = loaderRef.current;
      if (!loader) return;

      let isAssetsLoaded = false;
      let isMinTimeReached = false;
      let targetValue = 0;
      const state = { value: 0 };

      const minTimer = window.setTimeout(() => {
        isMinTimeReached = true;
      }, 1500);

      const safetyTimer = window.setTimeout(() => {
        isAssetsLoaded = true;
        isMinTimeReached = true;
      }, 3600);

      const { promise, unsubscribe } = preloadPortalAssets();
      promise.finally(() => {
        isAssetsLoaded = true;
      });

      const tick = () => {
        const delta = gsap.ticker.deltaRatio() / 60;
        if (isAssetsLoaded && isMinTimeReached) {
          targetValue = 100;
        } else if (isAssetsLoaded) {
          targetValue = Math.min(92, targetValue + delta * 60);
        } else {
          targetValue = Math.min(85, targetValue + delta * 30);
        }

        state.value += (targetValue - state.value) * 0.09;

        const rounded = Math.round(state.value);
        if (counterRef.current) {
          counterRef.current.textContent = String(rounded);
        }
        if (logoWrapRef.current) {
          logoWrapRef.current.style.opacity = String(state.value / 100);
        }
        if (progressBarRef.current) {
          progressBarRef.current.style.transform = `scaleX(${Math.min(1, state.value / 100)})`;
        }

        if (state.value > 99.5) {
          gsap.ticker.remove(tick);
          if (counterRef.current) counterRef.current.textContent = '100';
          if (logoWrapRef.current) logoWrapRef.current.style.opacity = '1';
          if (progressBarRef.current) progressBarRef.current.style.transform = 'scaleX(1)';

          onReady?.();

          const revealNodes = loader.querySelectorAll('[data-intro-reveal] [data-reveal]');
          const tl = gsap.timeline();
          tl.to(revealNodes, {
            yPercent: -110,
            duration: 0.6,
            ease: 'expo.in',
            stagger: 0.05,
          })
            .to(
              loader,
              {
                yPercent: -100,
                duration: 0.9,
                ease: 'expo.inOut',
              },
              '-=0.1'
            )
            .set(loader, { display: 'none' })
            .add(() => {
              document.documentElement.style.overflow = '';
              markIntroComplete();
              setDone(true);
            });
        }
      };

      gsap.ticker.add(tick);

      return () => {
        window.clearTimeout(minTimer);
        window.clearTimeout(safetyTimer);
        unsubscribe();
        gsap.ticker.remove(tick);
      };
    },
    { scope: loaderRef, dependencies: [done] }
  );

  if (done) {
    return null;
  }

  return (
    <div
      ref={loaderRef}
      role="status"
      aria-live="polite"
      aria-label="Chargement de SekouGaming"
      className="fixed inset-0 z-[100] flex flex-col justify-between bg-[#181818] px-5 py-6 sm:px-10 sm:py-8 text-white select-none"
    >
      {/* Top Row: Masked Brand Name + Status */}
      <div className="flex items-center justify-between gap-4">
        <TextMask data-intro-reveal="" className="text-xl sm:text-2xl font-extrabold tracking-tight">
          <span className="inline-flex items-center gap-2.5">
            <span className="inline-block h-3 w-3 bg-[#EF4C05]" />
            <span>SekouGaming</span>
          </span>
        </TextMask>

        <TextMask
          data-intro-reveal=""
          className="font-mono text-xs sm:text-sm uppercase tracking-widest text-white/60"
        >
          &gt; PORTAIL MULTI-JEUX
        </TextMask>
      </div>

      {/* Center Emblem whose opacity interpolates 0 -> 1 with state.value / 100 */}
      <div
        ref={logoWrapRef}
        style={{ opacity: 0 }}
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 px-6"
      >
        <div className="relative border-2 border-white/20 bg-[#222222] p-4 shadow-[6px_6px_0_0_#EF4C05]">
          <img
            src="/loading/logo_chargement_sekou.png"
            alt="SekouGaming"
            decoding="sync"
            fetchPriority="high"
            draggable={false}
            className="h-24 w-24 sm:h-32 sm:w-32 object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/sekouG_logo.jpg';
            }}
          />
        </div>
        <div className="h-[3px] w-36 bg-white/15 overflow-hidden">
          <div
            ref={progressBarRef}
            style={{ transform: 'scaleX(0)' }}
            className="h-full w-full origin-left bg-[#EF4C05]"
          />
        </div>
      </div>

      {/* Bottom Row: Left descriptor + Giant Right Tabular Percentage Counter */}
      <div className="flex items-end justify-between gap-4">
        <TextMask
          data-intro-reveal=""
          className="hidden sm:block font-mono text-xs uppercase tracking-widest text-white/50"
        >
          SEKOUNO · LOUPS-GAROUS · POLYCHESS · SEKOU BOMB
        </TextMask>

        <TextMask
          data-intro-reveal=""
          className="ml-auto text-[clamp(4rem,13vw,9.5rem)] font-black leading-none tracking-tight tabular-nums"
        >
          <span ref={counterRef}>0</span>
          <span className="text-[#EF4C05]">%</span>
        </TextMask>
      </div>
    </div>
  );
};
