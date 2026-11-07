import React, { useEffect, useRef } from 'react';
import { ReactLenis, useLenis } from 'lenis/react';
import type { LenisRef } from 'lenis/react';
import { gsap, ScrollTrigger } from '../../animations/jawooEngine.js';

function ScrollTriggerSync() {
  useLenis(ScrollTrigger.update);
  return null;
}

interface SmoothScrollProps {
  children: React.ReactNode;
  enabled?: boolean;
}

/**
 * Exact replica of jawoo.io's SmoothScroll component (module 852504).
 * Connects Lenis smooth scrolling to GSAP's ticker and ScrollTrigger.
 */
export const SmoothScroll: React.FC<SmoothScrollProps> = ({ children, enabled = true }) => {
  const lenisRef = useRef<LenisRef | null>(null);

  useEffect(() => {
    function update(time: number) {
      if (enabled) {
        lenisRef.current?.lenis?.raf(time * 1000);
      }
    }
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(update);
    };
  }, [enabled]);

  return (
    <ReactLenis
      root
      options={{ autoRaf: false, allowNestedScroll: true }}
      ref={lenisRef}
    >
      <ScrollTriggerSync />
      {children}
    </ReactLenis>
  );
};
