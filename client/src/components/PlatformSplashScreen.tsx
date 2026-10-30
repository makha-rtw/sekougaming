import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

const PORTAL_CRITICAL_IMAGES = [
  '/loading/logo_chargement_sekou.png',
  '/sekouG_logo.jpg',
  '/hub/sekouno.jpg',
  '/hub/loupgarou.jpg',
  '/hub/polychess.jpg',
  '/hub/sekoubomb.jpg',
] as const;

// Keep decoded HTMLImageElement instances alive in memory so HubScreen paints in 0ms
const retainedPortalImages: HTMLImageElement[] = [];
const progressSubscribers = new Set<(ratio: number) => void>();
let currentProgressRatio = 0.08;
let cachedPreloadPromise: Promise<void> | null = null;

function notifyProgress(ratio: number) {
  currentProgressRatio = Math.max(currentProgressRatio, Math.min(1, ratio));
  progressSubscribers.forEach((cb) => cb(currentProgressRatio));
}

function preloadAndDecodeImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    retainedPortalImages.push(img);

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    img.onload = () => {
      if (typeof img.decode === 'function') {
        img.decode().then(finish).catch(finish);
      } else {
        finish();
      }
    };
    img.onerror = finish;
    img.src = src;

    if (img.complete && img.naturalWidth > 0) {
      if (typeof img.decode === 'function') {
        img.decode().then(finish).catch(finish);
      } else {
        finish();
      }
    }
  });
}

export function preloadPortalAssets(
  onProgress?: (ratio: number) => void
): { promise: Promise<void>; unsubscribe: () => void } {
  if (typeof window === 'undefined') {
    onProgress?.(1);
    return { promise: Promise.resolve(), unsubscribe: () => {} };
  }

  if (onProgress) {
    progressSubscribers.add(onProgress);
    onProgress(currentProgressRatio);
  }

  if (!cachedPreloadPromise) {
    const totalSteps = PORTAL_CRITICAL_IMAGES.length + 1;
    let completedSteps = 0;

    const bump = () => {
      completedSteps += 1;
      notifyProgress(completedSteps / totalSteps);
    };

    const imageTasks = PORTAL_CRITICAL_IMAGES.map((src) =>
      preloadAndDecodeImage(src).finally(bump)
    );

    const fontTask = (
      document.fonts?.ready
        ? document.fonts.ready.then(() => undefined).catch(() => undefined)
        : Promise.resolve()
    ).finally(bump);

    cachedPreloadPromise = Promise.all([...imageTasks, fontTask]).then(() => {
      notifyProgress(1);
    });
  }

  return {
    promise: cachedPreloadPromise,
    unsubscribe: () => {
      if (onProgress) {
        progressSubscribers.delete(onProgress);
      }
    },
  };
}

interface PlatformSplashScreenProps {
  progress: number;
}

export const PlatformSplashScreen: React.FC<PlatformSplashScreenProps> = ({ progress }) => {
  const reduceMotion = useReducedMotion();
  const clampedProgress = Math.max(0.08, Math.min(1, progress));

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Chargement de la plateforme SekouGaming"
      initial={false}
      exit={
        reduceMotion
          ? { opacity: 0, transition: { duration: 0.18 } }
          : {
              opacity: 0,
              scale: 1.025,
              transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
            }
      }
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0A0F1E] select-none"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Halo ambiant discret accordé au perroquet SekouGaming */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(24rem 18rem at 50% 48%, rgba(255, 102, 68, 0.09), rgba(255, 201, 60, 0.04) 48%, transparent 76%)',
        }}
      />

      {/* Logo central SekouGaming */}
      <motion.div
        animate={
          reduceMotion
            ? undefined
            : {
                scale: [1, 1.024, 1],
              }
        }
        transition={
          reduceMotion
            ? undefined
            : {
                duration: 2.2,
                repeat: Infinity,
                ease: 'easeInOut',
              }
        }
        className="relative z-10 flex items-center justify-center px-6"
      >
        <img
          src="/loading/logo_chargement_sekou.png"
          alt="SekouGaming"
          decoding="sync"
          fetchPriority="high"
          draggable={false}
          style={{ width: 'clamp(11.5rem, 36vw, 15.5rem)' }}
          className="h-auto object-contain"
        />
      </motion.div>

      {/* Signature bas d'écran style application mobile & barre fine GPU */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10 flex flex-col items-center gap-3"
        style={{
          bottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 1.5rem), 2.25rem)',
        }}
      >
        <div className="h-[2.5px] w-28 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full w-full origin-left rounded-full transition-transform duration-300 ease-out"
            style={{
              transform: `scaleX(${clampedProgress})`,
              background: 'linear-gradient(90deg, #FF5A36 0%, #FFC93C 100%)',
            }}
          />
        </div>
        <span className="font-['Bricolage_Grotesque',_'Plus_Jakarta_Sans',_sans-serif] text-[0.72rem] font-bold tracking-[0.18em] uppercase text-[#8E97AD]/80">
          SekouGaming
        </span>
      </div>
    </motion.div>
  );
};
