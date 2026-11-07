import React, { useEffect, useRef } from 'react';
import { useLenis } from 'lenis/react';
import { ArrowUpRight, X } from '@phosphor-icons/react';
import { gsap, useGSAP, onPageChange } from '../../animations/jawooEngine.js';
import { TextMask } from './TextMask.js';
import type { ActiveGame } from '../../App.js';

interface MenuEntry {
  id: ActiveGame;
  index: string;
  label: string;
  subtitle: string;
  players: string;
  cards: [
    { image: string; badge: string; bg: string },
    { image: string; badge: string; bg: string }
  ];
}

const MENU_ENTRIES: MenuEntry[] = [
  {
    id: 'hub',
    index: '00',
    label: 'Portail Principal',
    subtitle: 'Catalogue & Accès Rapide',
    players: '4 Jeux',
    cards: [
      { image: '/hub/sekouno.jpg', badge: 'SALON MULTI-JEUX', bg: '#EF4C05' },
      { image: '/hub/sekoubomb.jpg', badge: 'SANS INSTALLATION', bg: '#F5C542' },
    ],
  },
  {
    id: 'sekouno',
    index: '01',
    label: 'Sekouno',
    subtitle: 'Cartes en Ligne & Surenchère +2/+4',
    players: '2–15 Joueurs',
    cards: [
      { image: '/hub/sekouno.jpg', badge: 'CUMUL +2 / +4', bg: '#D92D20' },
      { image: '/sekouG_logo.jpg', badge: 'CONTRE-UNO', bg: '#155EEF' },
    ],
  },
  {
    id: 'loup_garou',
    index: '02',
    label: 'Loups-Garous',
    subtitle: 'Grimoire Narré & Rôles Secrets',
    players: '6–18 Joueurs',
    cards: [
      { image: '/hub/loupgarou.jpg', badge: 'VOIX NARRÉE', bg: '#2F4ACB' },
      { image: '/sekouG_logo.jpg', badge: '1 TÉLÉPHONE', bg: '#181818' },
    ],
  },
  {
    id: 'polychess',
    index: '03',
    label: 'Polychess',
    subtitle: 'Échecs FIDE, Classé Elo & Local',
    players: '2 Joueurs',
    cards: [
      { image: '/hub/polychess.jpg', badge: 'CLASSEMENT ELO', bg: '#099250' },
      { image: '/sekouG_logo.jpg', badge: 'CADENCES FIDE', bg: '#F5C542' },
    ],
  },
  {
    id: 'sekou_bomb',
    index: '04',
    label: 'Sekou Bomb',
    subtitle: 'Survie Lexicale FR/EN & Bombe Chrono',
    players: '2–16 Joueurs',
    cards: [
      { image: '/hub/sekoubomb.jpg', badge: 'SYLLABES EN DIRECT', bg: '#EF4C05' },
      { image: '/sekouG_logo.jpg', badge: 'FR & EN', bg: '#F5C542' },
    ],
  },
];

interface JawooMenuDrawerProps {
  isOpen: boolean;
  activeGame: ActiveGame;
  onClose: () => void;
  onSelectGame: (game: ActiveGame) => void;
}

/**
 * Exact replica of jawoo.io's Fullscreen Menu (module 545872):
 * - Slides up from bottom (yPercent: 100 -> 0, duration: 0.9, ease: "expo.inOut")
 * - Closes at 1.8x speed (tl.timeScale(1.8).reverse())
 * - Masked link reveals (yPercent: 110 -> 0, duration: 1, ease: "expo.out", stagger: 0.05)
 * - Horizontal rule draw ([data-menu-line] scaleX: 0 -> 1, transformOrigin: "left")
 * - Fan-out tilted preview cards on hover (-rotate-8 and rotate-6 delay-100, cubic-bezier(0.19,1,0.22,1))
 */
export const JawooMenuDrawer: React.FC<JawooMenuDrawerProps> = ({
  isOpen,
  activeGame,
  onClose,
  onSelectGame,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

  useGSAP(
    () => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      gsap.set(dialog, { autoAlpha: 0, yPercent: 100 });

      const revealEls = dialog.querySelectorAll('[data-menu-reveal] [data-reveal]');
      const lineEls = dialog.querySelectorAll('[data-menu-line]');
      const fadeEls = dialog.querySelectorAll('[data-menu-fade]');

      const tl = gsap.timeline({
        paused: true,
        onReverseComplete: () => {
          gsap.set(dialog, { autoAlpha: 0 });
          document.documentElement.style.overflow = '';
          lenisRef.current?.start();
        },
      });

      tl.set(dialog, { autoAlpha: 1 })
        .fromTo(
          dialog,
          { yPercent: 100 },
          { yPercent: 0, duration: 0.9, ease: 'expo.inOut' }
        )
        .from(
          revealEls,
          {
            yPercent: 110,
            duration: 1,
            ease: 'expo.out',
            stagger: 0.05,
          },
          0.5
        )
        .from(
          lineEls,
          {
            scaleX: 0,
            transformOrigin: 'left',
            duration: 1,
            ease: 'expo.out',
            stagger: 0.05,
          },
          0.55
        )
        .from(
          fadeEls,
          {
            autoAlpha: 0,
            y: 16,
            duration: 0.6,
            ease: 'power3.out',
            stagger: 0.05,
          },
          0.65
        );

      tlRef.current = tl;
    },
    { scope: dialogRef }
  );

  useEffect(() => {
    const tl = tlRef.current;
    if (!tl) return;

    if (isOpen) {
      lenisRef.current?.stop();
      document.documentElement.style.overflow = 'hidden';
      tl.timeScale(1).play();
    } else if (tl.progress() > 0) {
      tl.timeScale(1.8).reverse();
    }
  }, [isOpen]);

  // Close menu automatically when page changes
  useEffect(() => {
    return onPageChange(() => {
      if (isOpen) {
        onClose();
      }
    });
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal={isOpen}
      aria-hidden={!isOpen}
      aria-label="Menu de navigation SekouGaming"
      className={`fixed inset-0 z-[85] flex flex-col justify-between overflow-y-auto bg-[#181818] text-white px-4 sm:px-8 md:px-14 py-5 sm:py-7 select-none ${
        isOpen ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      {/* Top Bar */}
      <div className="mx-auto flex w-full max-w-[1380px] items-center justify-between">
        <button
          type="button"
          onClick={() => {
            onClose();
            if (activeGame !== 'hub') {
              onSelectGame('hub');
            }
          }}
          className="inline-flex items-center gap-3 text-left cursor-pointer"
        >
          <span className="inline-block h-3.5 w-3.5 bg-[#EF4C05]" />
          <span className="text-xl sm:text-2xl font-black tracking-tight text-white">
            SekouGaming
          </span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="jawoo-rise-btn inline-flex items-center gap-2 border-2 border-white bg-white px-4 py-2 text-xs sm:text-sm font-black uppercase tracking-wider text-[#181818] hover:text-white cursor-pointer"
        >
          <span>Fermer</span>
          <X weight="bold" className="h-4 w-4" />
        </button>
      </div>

      {/* Main Navigation Links with Fan-Out Hover Preview Cards */}
      <nav aria-label="Choisir un univers" className="mx-auto my-auto w-full max-w-[1380px] py-6">
        <div data-menu-line="" className="h-[2px] w-full bg-white/15" />

        {MENU_ENTRIES.map((item) => {
          const isCurrent = activeGame === item.id;
          return (
            <div key={item.id}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (activeGame !== item.id) {
                    onSelectGame(item.id);
                  }
                }}
                className="group relative flex w-full items-center justify-between gap-4 py-4 sm:py-5 md:py-6 text-left cursor-pointer"
              >
                <div className="flex items-baseline gap-4 sm:gap-7 min-w-0">
                  <TextMask
                    data-menu-reveal=""
                    className="font-mono text-xs sm:text-sm font-bold text-[#EF4C05] shrink-0"
                  >
                    /{item.index}
                  </TextMask>

                  <div className="min-w-0">
                    <TextMask
                      data-menu-reveal=""
                      innerClassName="pb-1"
                      className={`text-3xl sm:text-5xl md:text-6xl font-black tracking-tight transition-colors duration-300 ${
                        isCurrent
                          ? 'text-[#EF4C05]'
                          : 'text-white group-hover:text-[#EF4C05]'
                      }`}
                    >
                      {item.label}
                    </TextMask>
                    <TextMask
                      data-menu-reveal=""
                      className="mt-1 text-xs sm:text-sm text-white/60 font-medium"
                    >
                      {item.subtitle}
                    </TextMask>
                  </div>
                </div>

                {/* Fan-out Tilted Preview Cards on Desktop Hover (Exact jawoo.io CSS & cubic-bezier) */}
                <div
                  aria-hidden="true"
                  style={{ clipPath: 'inset(-300% 0 0 0)' }}
                  className="pointer-events-none absolute right-36 bottom-0 hidden h-full w-64 lg:block"
                >
                  {/* Card 1 (-rotate-8) */}
                  <div
                    style={{ backgroundColor: item.cards[0].bg }}
                    className="absolute bottom-0 left-2 h-36 w-28 overflow-hidden border-2 border-white shadow-[4px_4px_0_0_#000] translate-y-[140%] -rotate-8 transition-[translate,rotate] duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:translate-y-[10%]"
                  >
                    <img
                      src={item.cards[0].image}
                      alt=""
                      className="h-full w-full object-cover opacity-90"
                    />
                    <span className="absolute bottom-1.5 left-1.5 right-1.5 bg-[#181818] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-white truncate">
                      {item.cards[0].badge}
                    </span>
                  </div>

                  {/* Card 2 (rotate-6 delay-100) */}
                  <div
                    style={{ backgroundColor: item.cards[1].bg }}
                    className="absolute bottom-0 left-24 h-36 w-28 overflow-hidden border-2 border-white shadow-[4px_4px_0_0_#000] translate-y-[140%] rotate-6 delay-100 transition-[translate,rotate] duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:translate-y-[15%]"
                  >
                    <img
                      src={item.cards[1].image}
                      alt=""
                      className="h-full w-full object-cover opacity-90"
                    />
                    <span className="absolute bottom-1.5 left-1.5 right-1.5 bg-[#EF4C05] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-white truncate">
                      {item.cards[1].badge}
                    </span>
                  </div>
                </div>

                {/* Right Meta, Mobile Tilted Preview Cards & Arrow */}
                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                  {/* Mobile Miniature Fan-Out Tilted Cards */}
                  <div
                    data-menu-fade=""
                    aria-hidden="true"
                    className="relative flex items-center h-11 w-16 lg:hidden pointer-events-none"
                  >
                    <div
                      style={{ backgroundColor: item.cards[0].bg }}
                      className="absolute left-0 top-0.5 h-10 w-8 overflow-hidden border border-white shadow-[2px_2px_0_0_#000] -rotate-8 transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-active:-translate-y-1.5"
                    >
                      <img
                        src={item.cards[0].image}
                        alt=""
                        className="h-full w-full object-cover opacity-90"
                      />
                    </div>
                    <div
                      style={{ backgroundColor: item.cards[1].bg }}
                      className="absolute left-5 top-1 h-10 w-8 overflow-hidden border border-white shadow-[2px_2px_0_0_#000] rotate-6 transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-active:-translate-y-1.5"
                    >
                      <img
                        src={item.cards[1].image}
                        alt=""
                        className="h-full w-full object-cover opacity-90"
                      />
                    </div>
                  </div>

                  <TextMask
                    data-menu-reveal=""
                    className="hidden sm:block font-mono text-xs uppercase tracking-wider text-white/55"
                  >
                    {item.players}
                  </TextMask>
                  <span className="inline-flex h-10 w-10 items-center justify-center border-2 border-white/25 bg-white/5 text-white transition-all duration-300 group-hover:border-[#EF4C05] group-hover:bg-[#EF4C05] group-active:border-[#EF4C05] group-active:bg-[#EF4C05]">
                    <ArrowUpRight
                      weight="bold"
                      className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </span>
                </div>
              </button>

              <div data-menu-line="" className="h-[2px] w-full bg-white/15" />
            </div>
          );
        })}
      </nav>

      {/* Bottom Footer Info */}
      <div className="mx-auto flex w-full max-w-[1380px] flex-wrap items-center justify-between gap-4 text-xs text-white/60">
        <span data-menu-fade="" className="font-mono uppercase tracking-wider">
          &gt; SEKOUGAMING STUDIO // ACCÈS INSTANTANÉ SUR MOBILE &amp; ORDINATEUR
        </span>
        <span data-menu-fade="" className="font-mono uppercase tracking-wider text-[#F5C542]">
          ZÉRO TÉLÉCHARGEMENT · CODES SALON 6 LETTRES
        </span>
      </div>
    </div>
  );
};
