import React, { useEffect, useRef, useState } from 'react';
import { useLenis } from 'lenis/react';
import {
  gsap,
  ScrollTrigger,
  markPageCovered,
  notifyPageChange,
  notifyPageReveal,
  registerPageTransitionHandler,
  TransitionRequest,
} from '../../animations/jawooEngine.js';

/**
 * Exact replica of jawoo.io's PageTransition component (module 826926):
 * - Phase 1 (Cover): slides right-to-center (xPercent: 100 -> 0, duration: 0.9s, ease: "expo.inOut")
 *   while revealing the target destination title inside an overflow-hidden mask (yPercent: 110 -> 0, ease: "expo.out", "-=0.25")
 * - Swaps view/route at cover completion, scrolls to top, refreshes ScrollTrigger, fires notifyPageChange()
 * - Phase 2 (Reveal): after a 0.2s pause, slides center-to-left (xPercent: 0 -> -100, duration: 0.9s, ease: "expo.inOut")
 *   and triggers notifyPageReveal() at 0.35s so the new screen's animations start as the curtain opens.
 */
export const JawooPageTransition: React.FC = () => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const subtitleRef = useRef<HTMLSpanElement>(null);
  const isTransitioningRef = useRef(false);
  const [label, setLabel] = useState('SekouGaming');
  const [subtitle, setSubtitle] = useState('PORTAIL OFFICIEL');
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

  useEffect(() => {
    const overlay = overlayRef.current;
    if (overlay) {
      gsap.set(overlay, { xPercent: 100, autoAlpha: 0 });
    }
  }, []);

  useEffect(() => {
    const handleTransition = (req: TransitionRequest) => {
      const overlay = overlayRef.current;
      const title = titleRef.current;
      const sub = subtitleRef.current;

      if (!overlay || !title) {
        req.onSwap();
        notifyPageChange();
        notifyPageReveal();
        return;
      }

      if (isTransitioningRef.current) {
        gsap.killTweensOf([overlay, title, sub]);
      }

      isTransitioningRef.current = true;
      markPageCovered();
      setLabel(req.label);
      setSubtitle(req.subtitle || 'SEKOUGAMING // SALON EN DIRECT');

      const tl = gsap.timeline();
      tl.set(overlay, { xPercent: 100, autoAlpha: 1, pointerEvents: 'auto' })
        .set(title, { yPercent: 110 })
        .set(sub, { yPercent: 110 })
        .to(overlay, {
          xPercent: 0,
          duration: 0.85,
          ease: 'expo.inOut',
        })
        .to(
          title,
          {
            yPercent: 0,
            duration: 0.75,
            ease: 'expo.out',
          },
          '-=0.28'
        )
        .to(
          sub,
          {
            yPercent: 0,
            duration: 0.65,
            ease: 'expo.out',
          },
          '-=0.6'
        )
        .add(() => {
          // Execute state/page change while screen is covered
          req.onSwap();

          if (lenisRef.current) {
            lenisRef.current.scrollTo(0, { immediate: true, force: true });
          }
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });

          window.requestAnimationFrame(() => {
            ScrollTrigger.refresh();
            notifyPageChange();

            // Phase 2: Reveal new screen
            gsap
              .timeline({
                delay: 0.2,
                onComplete: () => {
                  isTransitioningRef.current = false;
                },
              })
              .to(overlay, {
                xPercent: -100,
                duration: 0.9,
                ease: 'expo.inOut',
              })
              .add(() => {
                notifyPageReveal();
              }, 0.32)
              .set(overlay, { autoAlpha: 0, pointerEvents: 'none' });
          });
        });
    };

    registerPageTransitionHandler(handleTransition);
    return () => {
      registerPageTransitionHandler(null);
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-[#181818] text-white pointer-events-none select-none px-6 border-x-4 border-[#EF4C05]"
    >
      <span className="block overflow-hidden mb-3">
        <span
          ref={subtitleRef}
          className="block font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.22em] text-[#EF4C05]"
        >
          &gt; {subtitle}
        </span>
      </span>

      <span className="block overflow-hidden py-3">
        <span
          ref={titleRef}
          className="block text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white text-center"
        >
          {label}
        </span>
      </span>
    </div>
  );
};
