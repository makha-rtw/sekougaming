import { useEffect, useLayoutEffect, RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { useGSAP } from '@gsap/react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, useGSAP);
}

export { gsap, ScrollTrigger, SplitText, DrawSVGPlugin, useGSAP };

/* ============================================================================
 * 1. LIFECYCLE EVENT BUS (Exact replica of jawoo.io modules 91672 & 332911)
 * ========================================================================== */

let introCompleted = (() => {
  if (typeof window === 'undefined') return false;
  try {
    const swReloadTs = Number(sessionStorage.getItem('sekou_sw_reload_ts') || '0');
    const alreadyDone = sessionStorage.getItem('sekou_intro_done') === '1';
    if (alreadyDone && Date.now() - swReloadTs < 10_000) {
      return true;
    }
  } catch {
    // ignore storage errors
  }
  return false;
})();
const introListeners = new Set<() => void>();

export function isIntroComplete(): boolean {
  return introCompleted;
}

export function markIntroComplete(): void {
  if (introCompleted) return;
  introCompleted = true;
  try {
    sessionStorage.setItem('sekou_intro_done', '1');
  } catch {
    // ignore storage errors
  }
  introListeners.forEach((cb) => {
    try {
      cb();
    } catch (err) {
      console.error(err);
    }
  });
  introListeners.clear();
}

export function onIntroComplete(cb: () => void): () => void {
  if (introCompleted) {
    cb();
    return () => {};
  }
  introListeners.add(cb);
  return () => {
    introListeners.delete(cb);
  };
}

let pageCovered = false;
const pageChangeListeners = new Set<() => void>();
const pageRevealListeners = new Set<() => void>();

export function isPageCovered(): boolean {
  return pageCovered;
}

export function markPageCovered(): void {
  pageCovered = true;
}

export function notifyPageChange(): void {
  pageChangeListeners.forEach((cb) => {
    try {
      cb();
    } catch (err) {
      console.error(err);
    }
  });
}

export function notifyPageReveal(): void {
  pageCovered = false;
  pageRevealListeners.forEach((cb) => {
    try {
      cb();
    } catch (err) {
      console.error(err);
    }
  });
}

export function onPageChange(cb: () => void): () => void {
  pageChangeListeners.add(cb);
  return () => {
    pageChangeListeners.delete(cb);
  };
}

/**
 * Fires immediately if the intro loader is complete and the page transition
 * curtain is not covering the viewport; otherwise waits for either
 * markIntroComplete() or notifyPageReveal().
 */
export function onPageReveal(cb: () => void): () => void {
  if (isIntroComplete() && !pageCovered) {
    cb();
    return () => {};
  }
  const unsubscribeIntro = isIntroComplete() ? null : onIntroComplete(cb);
  pageRevealListeners.add(cb);
  return () => {
    unsubscribeIntro?.();
    pageRevealListeners.delete(cb);
  };
}

/* ============================================================================
 * 2. GLOBAL PAGE TRANSITION CONTROLLER
 * ========================================================================== */

export interface TransitionRequest {
  label: string;
  subtitle?: string;
  onSwap: () => void;
}

type TransitionHandler = (req: TransitionRequest) => void;
let registeredTransitionHandler: TransitionHandler | null = null;

export function registerPageTransitionHandler(handler: TransitionHandler | null): void {
  registeredTransitionHandler = handler;
}

export function triggerJawooTransition(
  label: string,
  onSwap: () => void,
  subtitle?: string
): void {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ) {
    onSwap();
    notifyPageChange();
    notifyPageReveal();
    return;
  }

  if (registeredTransitionHandler) {
    registeredTransitionHandler({ label, subtitle, onSwap });
  } else {
    onSwap();
    notifyPageChange();
    notifyPageReveal();
  }
}

/* ============================================================================
 * 3. FRENCH TYPOGRAPHY NON-BREAKING SPACES & SPLITTEXT (jawoo.io module 616937)
 * ========================================================================== */

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function applyFrenchNonBreakingSpaces(root: HTMLElement): void {
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      node.textContent = node.textContent
        .replace(/ ([;:!?»])/g, '\u00A0$1')
        .replace(/(«) /g, '$1\u00A0');
    } else {
      node.childNodes.forEach(walk);
    }
  };
  root
    .querySelectorAll('h1, h2, h3, p, [data-title], [data-jawoo-title]')
    .forEach(walk);
}

/**
 * Exact replica of jawoo.io's useScrollReveal hook (module 616937):
 * - Immediately sets autoAlpha: 0 to avoid FOUC
 * - Waits for onPageReveal
 * - Builds paused GSAP timeline and triggers it once when entering viewport
 */
export function useScrollReveal<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  buildTimeline: (el: T) => gsap.core.Timeline | gsap.core.Tween,
  start = 'top 82%'
): void {
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      gsap.set(el, { autoAlpha: 1 });
      return;
    }

    applyFrenchNonBreakingSpaces(el);
    gsap.set(el, { autoAlpha: 0 });
  }, [ref]);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      if (
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ) {
        gsap.set(el, { autoAlpha: 1 });
        return;
      }

      let st: ScrollTrigger | undefined;
      let anim: gsap.core.Timeline | gsap.core.Tween | undefined;

      const cleanup = onPageReveal(() => {
        anim = buildTimeline(el).pause();
        gsap.set(el, { autoAlpha: 1 });
        st = ScrollTrigger.create({
          trigger: el,
          start,
          once: true,
          onEnter: () => {
            anim?.play();
          },
        });
      });

      return () => {
        cleanup();
        st?.kill();
        anim?.kill();
      };
    },
    { scope: ref }
  );
}

/* ============================================================================
 * 4. IMAGE CURTAIN REVEALS & PARALLAX (jawoo.io module 463039)
 * ========================================================================== */

/**
 * Animates image containers with clip-path inset(100% 0 0 0) -> inset(0% 0 0 0)
 * (expo.inOut, 1.2s) and inner <img> scale 1.3 -> 1 (expo.out, 1.6s, delay 0.2s).
 */
export function revealImages(
  container: HTMLElement,
  selector = '[data-image-reveal]',
  timeline?: gsap.core.Timeline,
  position: gsap.Position = 0
): gsap.core.Timeline {
  const tl = timeline ?? gsap.timeline();
  const wrappers = container.querySelectorAll<HTMLElement>(selector);
  if (!wrappers.length) return tl;

  const imgs = Array.from(wrappers)
    .map((w) => w.querySelector('img'))
    .filter((img): img is HTMLImageElement => Boolean(img));

  tl.fromTo(
    wrappers,
    { clipPath: 'inset(100% 0% 0% 0%)' },
    {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: 1.2,
      ease: 'expo.inOut',
      stagger: 0.12,
    },
    position
  );

  if (imgs.length) {
    tl.from(
      imgs,
      {
        scale: 1.3,
        duration: 1.6,
        ease: 'expo.out',
        stagger: 0.12,
      },
      typeof position === 'number' ? position + 0.2 : '+=0.2'
    );
  }

  return tl;
}

const roundPx = (val: string) => `${Math.round(parseFloat(val))}px`;

/**
 * Scroll-scrubbed vertical parallax (jawoo.io useParallax).
 */
export function useParallax<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  intensity = 5
): void {
  useGSAP(() => {
    const el = ref.current;
    if (!el || !intensity) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const trigger = el.parentElement ?? el;
    const getOffset = () => trigger.offsetHeight * (intensity / 100);

    gsap.fromTo(
      el,
      { y: () => -getOffset() },
      {
        y: () => getOffset(),
        ease: 'none',
        force3D: false,
        modifiers: { y: roundPx },
        scrollTrigger: {
          trigger,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
          invalidateOnRefresh: true,
        },
      }
    );
  });
}

/* ============================================================================
 * 5. UNIVERSAL SCREEN ENTER CHOREOGRAPHY FOR ALL SEKOUGAMING GAMES & VIEWS
 * ========================================================================== */

/**
 * Applies jawoo.io's signature entrance choreography to any game screen or sub-view:
 * - [data-jawoo-header]: header reveal (autoAlpha 0 -> 1, y -14 -> 0, expo.out)
 * - [data-jawoo-title]: masked SplitText line/word reveal (yPercent 110 -> 0, expo.out)
 * - [data-jawoo-line]: horizontal rule draw (scaleX 0 -> 1, transformOrigin left, expo.out)
 * - [data-jawoo-card] / [data-jawoo-reveal]: staggered block reveal (y 28 -> 0, autoAlpha 0 -> 1, expo.out)
 * - [data-jawoo-pop]: springy badge/card pop (scale 0.85 -> 1, autoAlpha 0 -> 1, back.out(1.6))
 * - [data-jawoo-image]: clip-path curtain reveal + inner scale 1.3 -> 1
 * - [data-jawoo-counter]: numeric counter interpolation (0 -> data-jawoo-counter value, power2.out)
 */
export function useScreenEnterChoreography<T extends HTMLElement = HTMLElement>(
  containerRef: RefObject<T | null>,
  deps: readonly unknown[] = []
): void {
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    applyFrenchNonBreakingSpaces(root);

    let ctx: gsap.Context | null = null;

    const runChoreography = () => {
      ctx?.revert();
      ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { overwrite: 'auto' } });

        // 1. Header bar
        const headers = root.querySelectorAll<HTMLElement>('[data-jawoo-header]');
        if (headers.length) {
          tl.fromTo(
            headers,
            { autoAlpha: 0, y: -16 },
            { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.06 },
            0
          );
        }

        // 2. Masked titles with SplitText
        const titles = root.querySelectorAll<HTMLElement>('[data-jawoo-title]');
        titles.forEach((titleEl, i) => {
          try {
            const split = SplitText.create(titleEl, {
              type: 'lines,words',
              mask: 'lines',
            });
            tl.from(
              split.words,
              {
                yPercent: 110,
                duration: 1.05,
                ease: 'expo.out',
                stagger: 0.04,
              },
              0.05 + i * 0.08
            );
          } catch {
            tl.fromTo(
              titleEl,
              { autoAlpha: 0, y: 24 },
              { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out' },
              0.05 + i * 0.08
            );
          }
        });

        // 3. Horizontal divider lines
        const lines = root.querySelectorAll<HTMLElement>('[data-jawoo-line]');
        if (lines.length) {
          tl.fromTo(
            lines,
            { scaleX: 0, transformOrigin: 'left center' },
            { scaleX: 1, duration: 1.0, ease: 'expo.out', stagger: 0.07 },
            0.12
          );
        }

        // 4. Image curtain reveals
        const images = root.querySelectorAll<HTMLElement>('[data-jawoo-image]');
        if (images.length) {
          revealImages(root, '[data-jawoo-image]', tl, 0.15);
        }

        // 5. Cards & structural blocks
        const cards = root.querySelectorAll<HTMLElement>(
          '[data-jawoo-card], [data-jawoo-reveal]'
        );
        if (cards.length) {
          tl.fromTo(
            cards,
            { autoAlpha: 0, y: 28 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.95,
              ease: 'expo.out',
              stagger: 0.06,
              clearProps: 'transform',
            },
            0.14
          );
        }

        // 6. Pop badges / interactive specimens
        const pops = root.querySelectorAll<HTMLElement>('[data-jawoo-pop]');
        if (pops.length) {
          tl.fromTo(
            pops,
            { autoAlpha: 0, scale: 0.82, y: 12 },
            {
              autoAlpha: 1,
              scale: 1,
              y: 0,
              duration: 0.65,
              ease: 'back.out(1.6)',
              stagger: 0.05,
              clearProps: 'transform',
            },
            0.25
          );
        }

        // 7. Animated numerical counters
        const counters = root.querySelectorAll<HTMLElement>('[data-jawoo-counter]');
        counters.forEach((counterEl) => {
          const targetRaw = counterEl.getAttribute('data-jawoo-counter');
          const suffix = counterEl.getAttribute('data-jawoo-suffix') || '';
          const prefix = counterEl.getAttribute('data-jawoo-prefix') || '';
          const targetVal = targetRaw ? parseFloat(targetRaw) : NaN;
          if (!Number.isNaN(targetVal)) {
            const state = { val: 0 };
            tl.to(
              state,
              {
                val: targetVal,
                duration: 1.6,
                ease: 'power2.out',
                onUpdate: () => {
                  counterEl.textContent = `${prefix}${Math.round(state.val)}${suffix}`;
                },
              },
              0.2
            );
          }
        });
      }, root);
    };

    const unsub = onPageReveal(runChoreography);

    return () => {
      unsub();
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
