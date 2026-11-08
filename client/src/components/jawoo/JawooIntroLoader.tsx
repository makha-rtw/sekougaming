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

      const state = { value: 0 };
      let hasFinished = false;

      const finishIntro = () => {
        if (hasFinished) return;
        hasFinished = true;

        if (counterRef.current) counterRef.current.textContent = '100';
        if (logoWrapRef.current) logoWrapRef.current.style.opacity = '1';
        if (progressBarRef.current) progressBarRef.current.style.transform = 'scaleX(1)';

        onReady?.();

        const revealNodes = loader.querySelectorAll('[data-intro-reveal] [data-reveal]');
        const tl = gsap.timeline();

        // 1. Snappy fade/slide exit of loader text & logo
        tl.to(revealNodes, {
          yPercent: -100,
          autoAlpha: 0,
          duration: 0.32,
          ease: 'power2.in',
          stagger: 0.02,
        })
          .to(
            logoWrapRef.current,
            {
              autoAlpha: 0,
              scale: 0.95,
              duration: 0.25,
              ease: 'power2.in',
            },
            0
          )
          // 2. Lift the dark curtain smoothly (0.75s expo.inOut)
          .to(
            loader,
            {
              yPercent: -100,
              duration: 0.75,
              ease: 'expo.inOut',
              force3D: true,
            },
            '-=0.1'
          )
          // 3. Trigger markIntroComplete() WHILE the curtain is lifting, so content underneath is ALREADY revealing
          .add(() => {
            markIntroComplete();
          }, '-=0.55')
          .set(loader, { display: 'none' })
          .add(() => {
            document.documentElement.style.overflow = '';
            setDone(true);
          });
      };

      // Tween smoothly from 0 to 90 over 0.9s
      const initialTween = gsap.to(state, {
        value: 90,
        duration: 0.9,
        ease: 'power2.out',
        onUpdate: () => {
          const rounded = Math.min(99, Math.round(state.value));
          if (counterRef.current) counterRef.current.textContent = String(rounded);
          if (logoWrapRef.current) logoWrapRef.current.style.opacity = String(state.value / 100);
          if (progressBarRef.current) progressBarRef.current.style.transform = `scaleX(${state.value / 100})`;
        },
      });

      let isAssetsLoaded = false;
      let isMinTimeReached = false;

      const maybeComplete = () => {
        if (!isAssetsLoaded || !isMinTimeReached || hasFinished) return;
        initialTween.kill();
        gsap.to(state, {
          value: 100,
          duration: 0.28,
          ease: 'power1.out',
          onUpdate: () => {
            const rounded = Math.round(state.value);
            if (counterRef.current) counterRef.current.textContent = String(rounded);
            if (logoWrapRef.current) logoWrapRef.current.style.opacity = String(state.value / 100);
            if (progressBarRef.current) progressBarRef.current.style.transform = `scaleX(${state.value / 100})`;
          },
          onComplete: () => {
            finishIntro();
          },
        });
      };

      const minTimer = window.setTimeout(() => {
        isMinTimeReached = true;
        maybeComplete();
      }, 900);

      const safetyTimer = window.setTimeout(() => {
        isAssetsLoaded = true;
        isMinTimeReached = true;
        maybeComplete();
      }, 2400);

      const { promise, unsubscribe } = preloadPortalAssets();
      promise.finally(() => {
        isAssetsLoaded = true;
        maybeComplete();
      });

      return () => {
        window.clearTimeout(minTimer);
        window.clearTimeout(safetyTimer);
        unsubscribe();
        initialTween.kill();
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
      className="jawoo-safe-fullscreen fixed inset-0 z-[100] flex flex-col justify-between bg-[#181818] px-5 py-6 sm:px-10 sm:py-8 text-white select-none"
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
