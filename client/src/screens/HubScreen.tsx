import React, { useRef, useState } from 'react';
import {
  ArrowUpRight,
  UsersThree,
  WifiHigh,
  DeviceMobile,
  Trophy,
  Fire,
  Plus,
  Sparkle,
  Lightning,
  QrCode,
  Play,
} from '@phosphor-icons/react';
import {
  gsap,
  SplitText,
   useGSAP,
  onIntroComplete,
  useScrollReveal,
  revealImages,
  useParallax,
} from '../animations/jawooEngine.js';
import { TextMask } from '../components/jawoo/TextMask.js';
import { sounds } from '../utils/sound.js';

export type GameId = 'sekouno' | 'loup_garou' | 'polychess' | 'sekou_bomb';

interface HubScreenProps {
  onSelectGame: (gameId: GameId) => void;
  onOpenMenu?: () => void;
  onQuickJoinRoom?: (gameId: GameId, roomCode: string) => void;
}

interface GameCatalogItem {
  id: GameId;
  index: string;
  title: string;
  subtitle: string;
  pitch: string;
  image: string;
  accentBg: string;
  focus: string;
  players: string;
  mode: string;
  highlights: string[];
  icon: React.ElementType;
}

const GAMES_CATALOG: GameCatalogItem[] = [
  {
    id: 'sekouno',
    index: '01',
    title: 'Sekouno',
    subtitle: 'Salon de cartes en ligne',
    pitch:
      'Cumul de pénalités +2 et +4, Contre-UNO en direct et interdiction de finir sur une carte noire.',
    image: '/hub/sekouno.jpg',
    accentBg: '#D92D20',
    focus: '50% 42%',
    players: '2 à 15 joueurs',
    mode: 'Temps réel',
    highlights: ['Cumul +2/+4', 'Contre-UNO', 'Pioche secrète'],
    icon: WifiHigh,
  },
  {
    id: 'loup_garou',
    index: '02',
    title: 'Loups-Garous',
    subtitle: 'Grimoire narré sur un téléphone',
    pitch:
      'Distribution secrète, narration vocale automatique de la nuit et 21 rôles configurables.',
    image: '/hub/loupgarou.jpg',
    accentBg: '#2F4ACB',
    focus: '55% 28%',
    players: '6 à 18 joueurs',
    mode: '1 seul téléphone',
    highlights: ['Voix narrée', '21 rôles', 'Zéro papier'],
    icon: DeviceMobile,
  },
  {
    id: 'polychess',
    index: '03',
    title: 'Polychess',
    subtitle: 'Échecs FIDE & Classement Elo',
    pitch:
      'Duel sur le même écran ou en ligne avec pendule officielle, classement Elo et historique.',
    image: '/hub/polychess.jpg',
    accentBg: '#099250',
    focus: '50% 48%',
    players: '2 joueurs',
    mode: 'En ligne & Local',
    highlights: ['Classé Elo', 'Cadences FIDE', 'Pass & Play'],
    icon: Trophy,
  },
  {
    id: 'sekou_bomb',
    index: '04',
    title: 'Sekou Bomb',
    subtitle: 'Survie lexicale sous haute tension',
    pitch:
      'Trouvez un mot valide contenant la syllabe imposée avant que la mèche n’atteigne zéro.',
    image: '/hub/sekoubomb.jpg',
    accentBg: '#EF4C05',
    focus: '50% 42%',
    players: '2 à 16 joueurs',
    mode: 'FR & EN en direct',
    highlights: ['Frappe en direct', 'Vie bonus A-Z', 'Dictionnaire FR/EN'],
    icon: Fire,
  },
];

const ParallaxArtwork: React.FC<{
  src: string;
  focus: string;
  fallbackColor: string;
  priority?: boolean;
}> = ({ src, focus, fallbackColor, priority }) => {
  const parallaxRef = useRef<HTMLDivElement>(null);
  useParallax(parallaxRef, 6);

  return (
    <div
      data-image-reveal=""
      style={{ backgroundColor: fallbackColor }}
      className="relative aspect-[16/10] w-full overflow-hidden border-b-2 border-[#181818]"
    >
      <div ref={parallaxRef} className="absolute inset-x-0 -top-[6%] h-[112%] w-full">
        <img
          src={src}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          style={{ objectPosition: focus }}
          className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:scale-105"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    </div>
  );
};

export const HubScreen: React.FC<HubScreenProps> = ({
  onSelectGame,
  onOpenMenu,
  onQuickJoinRoom,
}) => {
  const headerRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const gamesRef = useRef<HTMLElement>(null);
  const bentoRef = useRef<HTMLElement>(null);
  const statsRef = useRef<HTMLElement>(null);
  const stepsRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  const [quickGame, setQuickGame] = useState<GameId>('sekouno');
  const [quickCode, setQuickCode] = useState('');

  // 1. Header Entrance on Intro Complete (exact jawoo.io module 545872)
  useGSAP(
    () => {
      const header = headerRef.current;
      if (!header) return;

      const logo = header.querySelector('[data-header-logo]');
      const reveals = header.querySelectorAll('[data-header-reveal] [data-reveal]');

      if (
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ) {
        return;
      }

      gsap.set(logo, { autoAlpha: 0 });
      gsap.set(reveals, { yPercent: 110 });

      return onIntroComplete(() => {
        gsap.to(logo, {
          autoAlpha: 1,
          duration: 1.1,
          ease: 'power2.out',
        });
        gsap.to(reveals, {
          yPercent: 0,
          duration: 1.2,
          ease: 'expo.out',
          stagger: 0.06,
        });
      });
    },
    { scope: headerRef }
  );

  // 2. Hero Scroll/Page Reveal (exact jawoo.io module 322504)
  useScrollReveal(
    heroRef,
    (el) => {
      const titleEl = el.querySelector<HTMLElement>('[data-hero-title]');
      const subEl = el.querySelector<HTMLElement>('[data-hero-sub]');
      const ctas = el.querySelectorAll<HTMLElement>('[data-hero-cta] [data-reveal]');
      const cursorBadge = el.querySelector<HTMLElement>('[data-hero-cursor]');
      const quickPanel = el.querySelector<HTMLElement>('[data-hero-panel]');

      const tl = gsap.timeline();

      if (titleEl) {
        const splitTitle = SplitText.create(titleEl, {
          type: 'lines,words',
          mask: 'lines',
        });
        tl.from(
          splitTitle.words,
          {
            yPercent: 110,
            duration: 1.2,
            ease: 'expo.out',
            stagger: 0.08,
          },
          0
        );
      }

      if (subEl) {
        const splitSub = SplitText.create(subEl, {
          type: 'lines',
          mask: 'lines',
        });
        tl.from(
          splitSub.lines,
          {
            yPercent: 110,
            duration: 1.0,
            ease: 'expo.out',
            stagger: 0.08,
          },
          0.35
        );
      }

      if (ctas.length) {
        tl.from(
          ctas,
          {
            yPercent: 110,
            duration: 1.0,
            ease: 'expo.out',
            stagger: 0.08,
          },
          0.45
        );
      }

      if (quickPanel) {
        tl.from(
          quickPanel,
          {
            y: 36,
            autoAlpha: 0,
            duration: 1.0,
            ease: 'expo.out',
          },
          0.3
        );
      }

      if (cursorBadge) {
        tl.from(
          cursorBadge,
          {
            scale: 0.8,
            autoAlpha: 0,
            duration: 0.55,
            ease: 'back.out(1.8)',
          },
          0.75
        );
      }

      return tl;
    },
    'top 92%'
  );

  // 3. Games Catalogue Reveal (exact jawoo.io module 165769 + revealImages)
  useScrollReveal(gamesRef, (el) => {
    const heading = el.querySelector<HTMLElement>('[data-games-title]');
    const cards = el.querySelectorAll<HTMLElement>('[data-game-card]');
    const tl = gsap.timeline();

    if (heading) {
      const split = SplitText.create(heading, { type: 'lines,words', mask: 'lines' });
      tl.from(
        split.words,
        {
          yPercent: 110,
          duration: 1.1,
          ease: 'expo.out',
          stagger: 0.06,
        },
        0
      );
    }

    tl.from(
      cards,
      {
        y: 40,
        autoAlpha: 0,
        duration: 1.0,
        ease: 'expo.out',
        stagger: 0.12,
      },
      0.15
    );

    revealImages(el, '[data-image-reveal]', tl, 0.2);

    return tl;
  });

  // 4. Interactive Bento Showcase Reveal (exact jawoo.io module 87148)
  useScrollReveal(bentoRef, (el) => {
    const title = el.querySelector<HTMLElement>('[data-bento-title]');
    const cells = el.querySelectorAll<HTMLElement>('[data-bento-cell]');
    const codeText = el.querySelector<HTMLElement>('[data-bento-typed]');
    const codeCursor = el.querySelector<HTMLElement>('[data-bento-caret]');
    const svgCursor = el.querySelector<HTMLElement>('[data-bento-pointer]');
    const joinBtn = el.querySelector<HTMLElement>('[data-bento-join-btn]');
    const playerTags = el.querySelectorAll<HTMLElement>('[data-bento-player]');
    const fanCards = el.querySelectorAll<HTMLElement>('[data-bento-fan]');
    const drawPaths = el.querySelectorAll<SVGPathElement>('[data-bento-draw]');
    const bars = el.querySelectorAll<HTMLElement>('[data-bento-bar]');
    const gauge = el.querySelector<HTMLElement>('[data-bento-gauge]');

    const tl = gsap.timeline();

    if (title) {
      const split = SplitText.create(title, { type: 'lines,words', mask: 'lines' });
      tl.from(
        split.words,
        { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.06 },
        0
      );
    }

    tl.from(
      cells,
      {
        y: 36,
        autoAlpha: 0,
        duration: 0.95,
        ease: 'expo.out',
        stagger: 0.1,
      },
      0.15
    );

    // Cell 1 Micro-Scene: Character-by-character room code typing + cursor click + player tags pop
    const sampleCode = 'SEKOU9';
    if (codeText) {
      codeText.textContent = '';
      sampleCode.split('').forEach((_, idx) => {
        tl.to(
          {},
          {
            duration: 0.08,
            onComplete: () => {
              if (codeText) codeText.textContent = sampleCode.slice(0, idx + 1);
            },
          },
          0.55 + idx * 0.08
        );
      });
    }

    if (codeCursor) {
      tl.to(
        codeCursor,
        { opacity: 0, repeat: 5, yoyo: true, duration: 0.25, ease: 'steps(1)' },
        0.5
      );
    }

    if (svgCursor) {
      tl.fromTo(
        svgCursor,
        { x: 48, y: 36, autoAlpha: 0 },
        { x: 0, y: 0, autoAlpha: 1, duration: 0.65, ease: 'power3.out' },
        1.05
      );
    }

    if (joinBtn) {
      tl.to(joinBtn, { scale: 0.94, duration: 0.1, ease: 'power2.in' }, 1.55).to(
        joinBtn,
        { scale: 1, backgroundColor: '#EF4C05', color: '#FFFFFF', duration: 0.2, ease: 'back.out(2)' },
        1.65
      );
    }

    if (playerTags.length) {
      tl.from(
        playerTags,
        {
          scale: 0,
          y: 12,
          autoAlpha: 0,
          duration: 0.45,
          ease: 'back.out(1.7)',
          stagger: 0.08,
        },
        1.72
      );
    }

    // Cell 2 Micro-Scene: 4 Game Artifacts fan out + SVG trajectory draw
    if (fanCards.length) {
      tl.from(
        fanCards,
        {
          scale: 0.6,
          y: 24,
          rotation: 0,
          autoAlpha: 0,
          duration: 0.65,
          ease: 'back.out(1.6)',
          stagger: 0.08,
        },
        0.65
      );
    }

    if (drawPaths.length) {
      tl.from(
        drawPaths,
        {
          drawSVG: '0%',
          duration: 0.9,
          ease: 'power2.inOut',
          stagger: 0.15,
        },
        0.8
      );
    }

    // Cell 3 Micro-Scene: Latency bars + progress gauge
    if (bars.length) {
      tl.from(
        bars,
        {
          scaleY: 0,
          transformOrigin: 'bottom',
          duration: 0.55,
          ease: 'back.out(1.5)',
          stagger: 0.06,
        },
        0.7
      );
    }

    if (gauge) {
      tl.from(
        gauge,
        {
          scaleX: 0,
          transformOrigin: 'left',
          duration: 1.1,
          ease: 'expo.out',
        },
        0.75
      );
    }

    return tl;
  });

  // 5. Stats Counters & Handwritten Arrow Reveal (exact jawoo.io module 779420)
  useScrollReveal(statsRef, (el) => {
    const cards = el.querySelectorAll<HTMLElement>('[data-stat-card]');
    const counters = el.querySelectorAll<HTMLElement>('[data-stat-num]');
    const arrowPath = el.querySelectorAll<SVGPathElement>('[data-stat-arrow]');
    const note = el.querySelector<HTMLElement>('[data-stat-note]');

    const tl = gsap.timeline();

    tl.from(
      cards,
      {
        y: 36,
        autoAlpha: 0,
        duration: 0.9,
        ease: 'expo.out',
        stagger: 0.1,
      },
      0
    );

    counters.forEach((node) => {
      const target = parseInt(node.getAttribute('data-target') || '0', 10);
      const suffix = node.getAttribute('data-suffix') || '';
      const obj = { val: 0 };
      tl.to(
        obj,
        {
          val: target,
          duration: 2.0,
          ease: 'power2.out',
          onUpdate: () => {
            node.textContent = `${Math.round(obj.val)}${suffix}`;
          },
        },
        0.2
      );
    });

    if (note) {
      tl.from(note, { autoAlpha: 0, y: 8, duration: 0.4, ease: 'power2.out' }, 0.85);
    }

    if (arrowPath.length) {
      tl.from(
        arrowPath,
        {
          drawSVG: '0%',
          duration: 0.6,
          ease: 'power2.out',
          stagger: 0.15,
        },
        0.95
      );
    }

    return tl;
  });

  // 6. 3-Step Process Rows Reveal (exact jawoo.io module 361220)
  useScrollReveal(stepsRef, (el) => {
    const title = el.querySelector<HTMLElement>('[data-steps-title]');
    const lines = el.querySelectorAll<HTMLElement>('[data-step-line]');
    const rows = el.querySelectorAll<HTMLElement>('[data-step-row]');

    const tl = gsap.timeline();

    if (title) {
      const split = SplitText.create(title, { type: 'lines,words', mask: 'lines' });
      tl.from(
        split.words,
        { yPercent: 110, duration: 1.0, ease: 'expo.out', stagger: 0.06 },
        0
      );
    }

    tl.from(
      lines,
      {
        scaleX: 0,
        transformOrigin: 'left',
        duration: 1.1,
        ease: 'expo.out',
        stagger: 0.1,
      },
      0.15
    );

    tl.from(
      rows,
      {
        y: 28,
        autoAlpha: 0,
        duration: 0.85,
        ease: 'expo.out',
        stagger: 0.1,
      },
      0.25
    );

    return tl;
  });

  // 7. Footer Reveal (exact jawoo.io module 44604)
  useScrollReveal(
    footerRef,
    (el) => {
      const items = el.querySelectorAll<HTMLElement>('[data-footer-reveal]');
      return gsap.from(items, {
        y: 28,
        autoAlpha: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.08,
      });
    },
    'top 92%'
  );

  const handleQuickJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.buttonClick();
    const trimmed = quickCode.trim().toUpperCase();
    if (trimmed.length === 6 && onQuickJoinRoom) {
      onQuickJoinRoom(quickGame, trimmed);
    } else {
      onSelectGame(quickGame);
    }
  };

  const scrollToSection = (id: string) => {
    sounds.buttonClick();
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="jawoo-portal-world min-h-[100dvh] w-full overflow-x-hidden select-none">
      {/* ==================== HEADER (Exact jawoo.io module 545872) ==================== */}
      <header
        ref={headerRef}
        className="sticky top-0 z-40 h-16 sm:h-20 w-full border-b-2 border-[#181818] bg-white/95 backdrop-blur-sm px-4 sm:px-8 md:px-12"
      >
        <div className="mx-auto flex h-full w-full max-w-[1380px] items-center justify-between gap-4">
          {/* Brand Logo */}
          <a
            href="#top"
            data-header-logo=""
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-3 text-left"
          >
            <div className="h-9 w-9 overflow-hidden border-2 border-[#181818] bg-[#181818] shadow-[2px_2px_0_0_#EF4C05] shrink-0">
              <img
                src="/sekouG_logo.jpg"
                alt="SekouGaming"
                className="h-full w-full object-cover"
              />
            </div>
            <span className="font-['Bricolage_Grotesque',_sans-serif] text-xl sm:text-2xl font-black tracking-tight text-[#181818]">
              SekouGaming
            </span>
          </a>

          {/* Single-Line Desktop Nav Links */}
          <nav aria-label="Navigation principale" className="hidden lg:flex items-center gap-8">
            <TextMask data-header-reveal="">
              <button
                type="button"
                onClick={() => scrollToSection('catalogue')}
                className="text-sm font-bold text-[#181818] hover:text-[#EF4C05] transition-colors cursor-pointer"
              >
                Les 4 Jeux
              </button>
            </TextMask>
            <TextMask data-header-reveal="">
              <button
                type="button"
                onClick={() => scrollToSection('experience')}
                className="text-sm font-bold text-[#181818] hover:text-[#EF4C05] transition-colors cursor-pointer"
              >
                L’Expérience
              </button>
            </TextMask>
            <TextMask data-header-reveal="">
              <button
                type="button"
                onClick={() => scrollToSection('chiffres')}
                className="text-sm font-bold text-[#181818] hover:text-[#EF4C05] transition-colors cursor-pointer"
              >
                Chiffres
              </button>
            </TextMask>
            <TextMask data-header-reveal="">
              <button
                type="button"
                onClick={() => scrollToSection('etapes')}
                className="text-sm font-bold text-[#181818] hover:text-[#EF4C05] transition-colors cursor-pointer"
              >
                Comment jouer
              </button>
            </TextMask>
          </nav>

          {/* Right Actions: Quick Launch + Fullscreen Menu Trigger */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <TextMask data-header-reveal="" className="hidden sm:block">
              <button
                type="button"
                onClick={() => scrollToSection('catalogue')}
                className="jawoo-rise-btn inline-flex h-10 items-center gap-2 border-2 border-[#181818] bg-white px-4 text-xs font-black uppercase tracking-wider text-[#181818] hover:text-white cursor-pointer"
              >
                <span>Choisir un jeu</span>
                <ArrowUpRight weight="bold" className="h-4 w-4" />
              </button>
            </TextMask>

            {onOpenMenu && (
              <TextMask data-header-reveal="">
                <button
                  type="button"
                  onClick={() => {
                    sounds.buttonClick();
                    onOpenMenu();
                  }}
                  aria-label="Ouvrir le menu plein écran"
                  className="jawoo-rise-btn inline-flex h-10 items-center gap-2 border-2 border-[#181818] bg-[#181818] px-4 text-xs font-black uppercase tracking-wider text-white cursor-pointer"
                >
                  <span>Menu</span>
                  <Plus weight="bold" className="h-4 w-4" />
                </button>
              </TextMask>
            )}
          </div>
        </div>
      </header>

      {/* ==================== SECTION 1: HERO (Exact jawoo.io module 322504) ==================== */}
      <section
        id="top"
        ref={heroRef}
        className="relative mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[1380px] flex-col justify-center px-4 sm:px-8 md:px-12 pt-8 pb-12 lg:py-14"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: SplitText Headline + Figma Selection Box + Subtext + Primary CTA */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <h1
              data-hero-title=""
              className="font-['Bricolage_Grotesque',_sans-serif] text-[2.65rem] sm:text-6xl xl:text-[4.35rem] font-black tracking-tight leading-[1.06] text-[#181818]"
            >
              Quatre jeux cultes.{' '}
              <span className="block mt-1">
                Un salon{' '}
                <span className="relative inline-block border-2 border-[#181818] bg-[#FFF0D8] px-3 pb-1 text-[#EF4C05] align-baseline">
                  instantané.
                  {/* 4 Figma Selection Handles */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-1.5 -left-1.5 h-2.5 w-2.5 border-2 border-[#181818] bg-white"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-1.5 -right-1.5 h-2.5 w-2.5 border-2 border-[#181818] bg-white"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-1.5 -left-1.5 h-2.5 w-2.5 border-2 border-[#181818] bg-white"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-1.5 -right-1.5 h-2.5 w-2.5 border-2 border-[#181818] bg-white"
                  />
                  {/* Floating Animated SVG Cursor Badge */}
                  <span
                    data-hero-cursor=""
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-6 -bottom-8 z-20 hidden sm:inline-flex items-center gap-1 border-2 border-[#181818] bg-[#F5C542] px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#181818] shadow-[3px_3px_0_0_#181818]"
                  >
                    <svg
                      viewBox="0 0 18 18"
                      fill="none"
                      className=" -ml-1 -mt-3 h-4 w-4 text-[#181818]"
                    >
                      <path
                        d="M2 2L8.2 15.5L10.5 9.8L16.2 7.5L2 2Z"
                        fill="#EF4C05"
                        stroke="#181818"
                        strokeWidth="1.8"
                      />
                    </svg>
                    <span>2 à 18 joueurs</span>
                  </span>
                </span>
              </span>
            </h1>

            <p
              data-hero-sub=""
              className="mt-6 max-w-[46ch] text-base sm:text-lg font-medium leading-relaxed text-[#181818]/75"
            >
              Ouvrez une table en trois secondes sur téléphone ou ordinateur et partagez le code à vos amis.
            </p>

            {/* Primary CTA + Direct Game Buttons */}
            <div data-hero-cta="" className="mt-8 flex flex-wrap items-center gap-3.5">
              <TextMask>
                <button
                  type="button"
                  onClick={() => scrollToSection('catalogue')}
                  className="jawoo-rise-btn group inline-flex h-13 items-center gap-3 border-2 border-[#181818] bg-[#181818] px-6 text-sm font-black uppercase tracking-wider text-white shadow-[5px_5px_0_0_#EF4C05] cursor-pointer"
                >
                  <span>Choisir un jeu</span>
                  <ArrowUpRight
                    weight="bold"
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5"
                  />
                </button>
              </TextMask>

              <TextMask>
                <button
                  type="button"
                  onClick={() => onSelectGame('sekouno')}
                  className="jawoo-rise-btn inline-flex h-13 items-center gap-2 border-2 border-[#181818] bg-white px-5 text-sm font-black uppercase tracking-wider text-[#181818] hover:text-white cursor-pointer"
                >
                  <span>Lancer Sekouno</span>
                </button>
              </TextMask>
            </div>
          </div>

          {/* Right Column: Direct Quick-Switch & Room Code Ticket Box */}
          <div className="lg:col-span-5">
            <div
              data-hero-panel=""
              className="border-2 border-[#181818] bg-[#F7F7F7] p-5 sm:p-6 shadow-[8px_8px_0_0_#181818]"
            >
              <div className="flex items-center justify-between border-b-2 border-[#181818] pb-3.5">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#181818]">
                  &gt; ACCÈS DIRECT AU SALON
                </span>
                <span className="border border-[#181818] bg-[#F5C542] px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-[#181818]">
                  EN LIGNE
                </span>
              </div>

              {/* 4 Instant Game Selector Buttons */}
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {GAMES_CATALOG.map((g) => {
                  const selected = quickGame === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        sounds.buttonClick();
                        setQuickGame(g.id);
                      }}
                      onDoubleClick={() => onSelectGame(g.id)}
                      className={`group flex flex-col items-start justify-between border-2 border-[#181818] p-3 text-left transition-all cursor-pointer ${
                        selected
                          ? 'bg-[#181818] text-white shadow-[3px_3px_0_0_#EF4C05]'
                          : 'bg-white text-[#181818] hover:bg-[#FFF0D8]'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span
                          className={`font-mono text-[10px] font-bold ${
                            selected ? 'text-[#EF4C05]' : 'text-[#181818]/60'
                          }`}
                        >
                          /{g.index}
                        </span>
                        <span
                          className="h-2.5 w-2.5 border border-[#181818]"
                          style={{ backgroundColor: g.accentBg }}
                        />
                      </div>
                      <span className="mt-1.5 font-['Bricolage_Grotesque',_sans-serif] text-base font-extrabold tracking-tight">
                        {g.title}
                      </span>
                      <span
                        className={`text-[11px] font-medium ${
                          selected ? 'text-white/75' : 'text-[#181818]/65'
                        }`}
                      >
                        {g.players}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Launch or Room Code Input */}
              <form onSubmit={handleQuickJoinSubmit} className="mt-4 space-y-3">
                <div>
                  <label
                    htmlFor="portal-room-code"
                    className="block font-mono text-[11px] font-bold uppercase tracking-wider text-[#181818] mb-1.5"
                  >
                    Code de table (optionnel pour rejoindre)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="portal-room-code"
                      type="text"
                      maxLength={6}
                      value={quickCode}
                      onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
                      placeholder="EX: K7X9Q2"
                      className="h-11 w-full border-2 border-[#181818] bg-white px-3 font-mono text-sm font-bold uppercase tracking-widest text-[#181818] placeholder:text-[#181818]/35 focus:outline-none focus:ring-2 focus:ring-[#EF4C05]"
                    />
                    <button
                      type="submit"
                      className="jawoo-rise-btn shrink-0 border-2 border-[#181818] bg-[#EF4C05] jawoo-rise-btn-dark px-4 h-11 font-mono text-xs font-black uppercase tracking-wider text-white cursor-pointer"
                    >
                      {quickCode.trim().length === 6 ? 'Rejoindre' : 'Ouvrir'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Direct Launch Bar */}
              <div className="mt-4 pt-3 border-t border-[#181818]/15 flex items-center justify-between text-xs font-semibold text-[#181818]/75">
                <span>Sélection : {GAMES_CATALOG.find((g) => g.id === quickGame)?.title}</span>
                <button
                  type="button"
                  onClick={() => onSelectGame(quickGame)}
                  className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase text-[#EF4C05] hover:underline cursor-pointer"
                >
                  <span>Entrer dans le jeu</span>
                  <ArrowUpRight weight="bold" className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION 2: LES 4 JEUX (Portfolio Grid + Curtain Reveal + Parallax) ==================== */}
      <section
        id="catalogue"
        ref={gamesRef}
        className="border-t-2 border-[#181818] bg-[#F7F7F7] py-16 sm:py-24 px-4 sm:px-8 md:px-12"
      >
        <div className="mx-auto w-full max-w-[1380px]">
          {/* Section Header (Stacked vertically per Split-Header Ban) */}
          <div className="mb-10 sm:mb-14">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#EF4C05] block mb-2">
              &gt; CATALOGUE OFFICIEL
            </span>
            <h2
              data-games-title=""
              className="font-['Bricolage_Grotesque',_sans-serif] text-3xl sm:text-5xl font-black tracking-tight text-[#181818]"
            >
              Choisissez votre table de jeu.
            </h2>
            <p className="mt-3 max-w-[54ch] text-base text-[#181818]/75">
              Chaque jeu possède son propre univers graphique, ses règles maison et sa connexion instantanée par code ou QR.
            </p>
          </div>

          {/* 2x2 Architectural Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-7 sm:gap-9">
            {GAMES_CATALOG.map((game, idx) => {
              const IconComp = game.icon;
              return (
                <article
                  key={game.id}
                  data-game-card=""
                  onClick={() => onSelectGame(game.id)}
                  className="group relative flex flex-col justify-between border-2 border-[#181818] bg-white shadow-[6px_6px_0_0_#181818] transition-shadow duration-300 hover:shadow-[10px_10px_0_0_#EF4C05] cursor-pointer"
                >
                  {/* Top Index & Meta Strip */}
                  <div className="flex items-center justify-between border-b-2 border-[#181818] bg-[#F7F7F7] px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 border border-[#181818]"
                        style={{ backgroundColor: game.accentBg }}
                      />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#181818]">
                        /{game.index} · {game.subtitle}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#181818]">
                      <UsersThree weight="bold" className="h-3.5 w-3.5 text-[#EF4C05]" />
                      <span>{game.players}</span>
                    </span>
                  </div>

                  {/* Artwork with Clip-Path Curtain Reveal + Scroll Parallax */}
                  <ParallaxArtwork
                    src={game.image}
                    focus={game.focus}
                    fallbackColor={game.accentBg}
                    priority={idx < 2}
                  />

                  {/* Card Body */}
                  <div className="flex flex-1 flex-col justify-between p-5 sm:p-7">
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-['Bricolage_Grotesque',_sans-serif] text-2xl sm:text-3xl font-black tracking-tight text-[#181818] group-hover:text-[#EF4C05] transition-colors">
                          {game.title}
                        </h3>
                        <span className="inline-flex items-center gap-1 border border-[#181818] bg-[#FFF0D8] px-2.5 py-1 font-mono text-[11px] font-bold uppercase text-[#181818] shrink-0">
                          <IconComp weight="bold" className="h-3.5 w-3.5 text-[#EF4C05]" />
                          <span>{game.mode}</span>
                        </span>
                      </div>

                      <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#181818]/80">
                        {game.pitch}
                      </p>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t-2 border-[#181818]/10 pt-4">
                      {/* Highlights pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {game.highlights.map((tag) => (
                          <span
                            key={tag}
                            className="border border-[#181818] bg-[#F7F7F7] px-2.5 py-1 font-mono text-[11px] font-bold uppercase text-[#181818]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* RiseBand Action Button */}
                      <span className="jawoo-rise-btn inline-flex h-10 items-center gap-2 border-2 border-[#181818] bg-[#181818] px-4 font-mono text-xs font-black uppercase tracking-wider text-white">
                        <span>Lancer</span>
                        <ArrowUpRight
                          weight="bold"
                          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        />
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================== SECTION 3: INTERACTIVE BENTO SHOWCASE (Exact jawoo.io module 87148) ==================== */}
      <section
        id="experience"
        ref={bentoRef}
        className="border-t-2 border-[#181818] bg-white py-16 sm:py-24 px-4 sm:px-8 md:px-12"
      >
        <div className="mx-auto w-full max-w-[1380px]">
          <div className="mb-10 sm:mb-14">
            <h2
              data-bento-title=""
              className="font-['Bricolage_Grotesque',_sans-serif] text-3xl sm:text-5xl font-black tracking-tight text-[#181818]"
            >
              Conçu pour les vraies soirées entre amis.
            </h2>
            <p className="mt-3 max-w-[54ch] text-base text-[#181818]/75">
              Pas de compte obligatoire, pas d’application à télécharger. Tout fonctionne directement dans le navigateur.
            </p>
          </div>

          {/* 4-Cell Bento Grid with Diverse Backgrounds & Choreographed SVG Micro-Scenes */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* CELL 1 (5 Cols - Dark #181818): Live Room Code Typing & Cursor Click */}
            <div
              data-bento-cell=""
              className="md:col-span-5 flex flex-col justify-between border-2 border-[#181818] bg-[#181818] p-6 sm:p-7 text-white shadow-[6px_6px_0_0_#EF4C05]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#F5C542]">
                    01 // CONNEXION EXPRESS
                  </span>
                  <QrCode weight="bold" className="h-5 w-5 text-[#EF4C05]" />
                </div>
                <h3 className="mt-2 font-['Bricolage_Grotesque',_sans-serif] text-2xl font-black tracking-tight">
                  Code à 6 lettres ou QR Code.
                </h3>
                <p className="mt-2 text-sm text-white/75 leading-relaxed">
                  Un joueur ouvre la table et affiche son billet d’invitation. Les autres rejoignent en un scan.
                </p>
              </div>

              {/* Animated Micro-Scene: Typing Code + Clicking Cursor + Popping Player Tags */}
              <div className="relative mt-6 border-2 border-white/20 bg-[#222222] p-4">
                <div className="flex items-center justify-between gap-2 border-2 border-white bg-[#181818] px-3 py-2">
                  <div className="flex items-center font-mono text-lg font-black tracking-[0.22em] text-[#F5C542]">
                    <span data-bento-typed="">SEKOU9</span>
                    <span
                      data-bento-caret=""
                      className="ml-0.5 inline-block h-5 w-[2px] bg-[#EF4C05]"
                    />
                  </div>
                  <span
                    data-bento-join-btn=""
                    className="border border-white bg-white px-2.5 py-1 font-mono text-[10px] font-black uppercase text-[#181818]"
                  >
                    REJOINDRE
                  </span>
                </div>

                {/* Connected Players Popping In */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    data-bento-player=""
                    className="inline-flex items-center gap-1.5 border border-white/30 bg-[#2F4ACB] px-2.5 py-1 font-mono text-[11px] font-bold text-white"
                  >
                    <span className="h-2 w-2 bg-[#4ADE80]" />
                    <span>+ Inès (Hôte)</span>
                  </span>
                  <span
                    data-bento-player=""
                    className="inline-flex items-center gap-1.5 border border-white/30 bg-[#EF4C05] px-2.5 py-1 font-mono text-[11px] font-bold text-white"
                  >
                    <span className="h-2 w-2 bg-[#F5C542]" />
                    <span>+ Mehdi</span>
                  </span>
                  <span
                    data-bento-player=""
                    className="inline-flex items-center gap-1.5 border border-white/30 bg-[#099250] px-2.5 py-1 font-mono text-[11px] font-bold text-white"
                  >
                    <span className="h-2 w-2 bg-white" />
                    <span>+ Lucas</span>
                  </span>
                </div>

                {/* Animated SVG Pointer */}
                <div
                  data-bento-pointer=""
                  aria-hidden="true"
                  className="pointer-events-none absolute right-6 top-9 z-10"
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6 drop-shadow">
                    <path
                      d="M4 3L11 20L14 13L21 10L4 3Z"
                      fill="#F5C542"
                      stroke="#181818"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* CELL 2 (7 Cols - Crisp White): 4 Physical Worlds Fan & DrawSVG */}
            <div
              data-bento-cell=""
              className="md:col-span-7 flex flex-col justify-between border-2 border-[#181818] bg-white p-6 sm:p-7 shadow-[6px_6px_0_0_#181818]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#EF4C05]">
                    02 // QUATRE UNIVERS PHYSIQUES
                  </span>
                  <Sparkle weight="bold" className="h-5 w-5 text-[#181818]" />
                </div>
                <h3 className="mt-2 font-['Bricolage_Grotesque',_sans-serif] text-2xl sm:text-3xl font-black tracking-tight text-[#181818]">
                  Chaque jeu possède sa propre identité visuelle.
                </h3>
                <p className="mt-2 max-w-[52ch] text-sm text-[#181818]/75 leading-relaxed">
                  Salon feutré à quatre couleurs pour Sekouno, parchemin narré pour Loups-Garous, échiquier de tournoi pour Polychess et affiche pop pour Sekou Bomb.
                </p>
              </div>

              {/* Choreographed SVG + Artifacts Scene */}
              <div className="relative mt-6 overflow-hidden border-2 border-[#181818] bg-[#F7F7F7] p-4 sm:p-5">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 500 90"
                  fill="none"
                  className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-20 opacity-50"
                >
                  <path
                    data-bento-draw=""
                    d="M 20 65 Q 140 10, 250 45 T 480 25"
                    stroke="#EF4C05"
                    strokeWidth="3"
                    strokeDasharray="6 6"
                    strokeLinecap="round"
                  />
                </svg>

                <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    type="button"
                    data-bento-fan=""
                    onClick={() => onSelectGame('sekouno')}
                    className="border-2 border-[#181818] bg-[#D92D20] p-3 text-left text-white shadow-[3px_3px_0_0_#181818] hover:-translate-y-1 transition-transform cursor-pointer"
                  >
                    <span className="font-mono text-[10px] font-bold uppercase block opacity-80">
                      CARTE
                    </span>
                    <span className="mt-2 block text-2xl font-black">+4</span>
                    <span className="mt-1 block font-mono text-[11px] font-bold">Sekouno</span>
                  </button>

                  <button
                    type="button"
                    data-bento-fan=""
                    onClick={() => onSelectGame('loup_garou')}
                    className="border-2 border-[#181818] bg-[#2F4ACB] p-3 text-left text-white shadow-[3px_3px_0_0_#181818] hover:-translate-y-1 transition-transform cursor-pointer"
                  >
                    <span className="font-mono text-[10px] font-bold uppercase block opacity-80">
                      GRIMOIRE
                    </span>
                    <span className="mt-2 block text-2xl font-black">NUIT 1</span>
                    <span className="mt-1 block font-mono text-[11px] font-bold">Loups-Garous</span>
                  </button>

                  <button
                    type="button"
                    data-bento-fan=""
                    onClick={() => onSelectGame('polychess')}
                    className="border-2 border-[#181818] bg-[#099250] p-3 text-left text-white shadow-[3px_3px_0_0_#181818] hover:-translate-y-1 transition-transform cursor-pointer"
                  >
                    <span className="font-mono text-[10px] font-bold uppercase block opacity-80">
                      FIDE ELO
                    </span>
                    <span className="mt-2 block text-2xl font-black">1500</span>
                    <span className="mt-1 block font-mono text-[11px] font-bold">Polychess</span>
                  </button>

                  <button
                    type="button"
                    data-bento-fan=""
                    onClick={() => onSelectGame('sekou_bomb')}
                    className="border-2 border-[#181818] bg-[#F5C542] p-3 text-left text-[#181818] shadow-[3px_3px_0_0_#181818] hover:-translate-y-1 transition-transform cursor-pointer"
                  >
                    <span className="font-mono text-[10px] font-bold uppercase block opacity-80">
                      SYLLABE
                    </span>
                    <span className="mt-2 block text-2xl font-black">[TRE]</span>
                    <span className="mt-1 block font-mono text-[11px] font-bold">Sekou Bomb</span>
                  </button>
                </div>
              </div>
            </div>

            {/* CELL 3 (7 Cols - Warm Yellow #F5C542): Real-Time Engine & Latency Bars */}
            <div
              data-bento-cell=""
              className="md:col-span-7 flex flex-col justify-between border-2 border-[#181818] bg-[#F5C542] p-6 sm:p-7 text-[#181818] shadow-[6px_6px_0_0_#181818]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#181818]">
                    03 // MOTEUR TEMPS RÉEL
                  </span>
                  <Lightning weight="bold" className="h-5 w-5 text-[#181818]" />
                </div>
                <h3 className="mt-2 font-['Bricolage_Grotesque',_sans-serif] text-2xl sm:text-3xl font-black tracking-tight">
                  Synchronisation serveur et reconnexion automatique.
                </h3>
                <p className="mt-2 max-w-[50ch] text-sm text-[#181818]/85 leading-relaxed">
                  Si votre téléphone verrouille son écran en pleine manche, votre session reprend instantanément à la même carte.
                </p>
              </div>

              <div className="mt-6 border-2 border-[#181818] bg-white p-4">
                <div className="flex items-end justify-between gap-2 h-14">
                  {[45, 70, 55, 90, 65, 100, 80, 95, 75, 100, 88, 96].map((h, i) => (
                    <div
                      key={i}
                      data-bento-bar=""
                      style={{ height: `${h}%` }}
                      className={`flex-1 border border-[#181818] ${
                        i % 3 === 0 ? 'bg-[#EF4C05]' : 'bg-[#181818]'
                      }`}
                    />
                  ))}
                </div>
                <div className="mt-3 h-2.5 w-full border border-[#181818] bg-[#F7F7F7] overflow-hidden">
                  <div data-bento-gauge="" className="h-full w-full bg-[#099250]" />
                </div>
                <div className="mt-2 flex items-center justify-between font-mono text-[11px] font-bold uppercase">
                  <span>CHRONO SERVEUR AUTORITAIRE</span>
                  <span className="text-[#099250]">SYNCHRONISÉ · 60 FPS</span>
                </div>
              </div>
            </div>

            {/* CELL 4 (5 Cols - Cobalt Blue #2F4ACB): Mobile + Desktop PWA */}
            <div
              data-bento-cell=""
              className="md:col-span-5 flex flex-col justify-between border-2 border-[#181818] bg-[#2F4ACB] p-6 sm:p-7 text-white shadow-[6px_6px_0_0_#181818]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#F5C542]">
                    04 // MULTI-SUPPORTS
                  </span>
                  <DeviceMobile weight="bold" className="h-5 w-5 text-[#F5C542]" />
                </div>
                <h3 className="mt-2 font-['Bricolage_Grotesque',_sans-serif] text-2xl font-black tracking-tight">
                  Jouable à une main sur mobile comme sur PC.
                </h3>
                <p className="mt-2 text-sm text-white/80 leading-relaxed">
                  Interface pensée pour iOS Safari, Android Chrome et les écrans d’ordinateur, installable en un geste sur l’écran d’accueil.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-2 border-white bg-[#181818] p-4">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase text-[#F5C542] block">
                    MODE APPLICATION PWA
                  </span>
                  <span className="text-sm font-bold text-white">
                    Plein écran sans barre d’adresse
                  </span>
                </div>
                <span className="border-2 border-white bg-[#EF4C05] px-3 py-1 font-mono text-xs font-black uppercase text-white">
                  PRÊT
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION 4: ANIMATED STATS COUNTERS (Exact jawoo.io module 779420) ==================== */}
      <section
        id="chiffres"
        ref={statsRef}
        className="border-t-2 border-[#181818] bg-[#F7F7F7] py-16 sm:py-20 px-4 sm:px-8 md:px-12"
      >
        <div className="mx-auto w-full max-w-[1380px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div
              data-stat-card=""
              className="border-2 border-[#181818] bg-white p-6 shadow-[5px_5px_0_0_#181818]"
            >
              <span className="font-mono text-xs font-bold uppercase text-[#181818]/60">
                /01 · UNIVERS
              </span>
              <div
                data-stat-num=""
                data-target="4"
                data-suffix=""
                className="mt-3 font-['Bricolage_Grotesque',_sans-serif] text-5xl sm:text-6xl font-black tracking-tight text-[#181818] tabular-nums"
              >
                4
              </div>
              <p className="mt-2 text-sm font-semibold text-[#181818]/80">
                Jeux multijoueurs complets réunis sous le même toit.
              </p>
            </div>

            <div
              data-stat-card=""
              className="border-2 border-[#181818] bg-white p-6 shadow-[5px_5px_0_0_#181818]"
            >
              <span className="font-mono text-xs font-bold uppercase text-[#181818]/60">
                /02 · CAPACITÉ
              </span>
              <div
                data-stat-num=""
                data-target="18"
                data-suffix=""
                className="mt-3 font-['Bricolage_Grotesque',_sans-serif] text-5xl sm:text-6xl font-black tracking-tight text-[#181818] tabular-nums"
              >
                18
              </div>
              <p className="mt-2 text-sm font-semibold text-[#181818]/80">
                Joueurs maximum autour d’une même partie de Loups-Garous.
              </p>
            </div>

            <div
              data-stat-card=""
              className="border-2 border-[#181818] bg-white p-6 shadow-[5px_5px_0_0_#181818]"
            >
              <span className="font-mono text-xs font-bold uppercase text-[#181818]/60">
                /03 · VITESSE
              </span>
              <div
                data-stat-num=""
                data-target="3"
                data-suffix="s"
                className="mt-3 font-['Bricolage_Grotesque',_sans-serif] text-5xl sm:text-6xl font-black tracking-tight text-[#EF4C05] tabular-nums"
              >
                3s
              </div>
              <p className="mt-2 text-sm font-semibold text-[#181818]/80">
                Temps moyen pour ouvrir une salle et inviter sa table.
              </p>
            </div>

            {/* Highlighted Card with SVG Handwritten Arrow (exact jawoo.io About highlight card) */}
            <div
              data-stat-card=""
              className="relative border-2 border-[#181818] bg-[#181818] p-6 text-white shadow-[6px_6px_0_0_#EF4C05]"
            >
              <span className="font-mono text-xs font-bold uppercase text-[#F5C542]">
                /04 · ACCÈS LIBRE
              </span>
              <div
                data-stat-num=""
                data-target="100"
                data-suffix="%"
                className="mt-3 font-['Bricolage_Grotesque',_sans-serif] text-5xl sm:text-6xl font-black tracking-tight text-white tabular-nums"
              >
                100%
              </div>
              <p className="mt-2 text-sm font-semibold text-white/80">
                Gratuit, sans publicité intrusive ni téléchargement.
              </p>

              {/* Animated SVG Note & Drawn Arrow */}
              <div className="mt-3 flex items-center gap-2">
                <span
                  data-stat-note=""
                  className="font-mono text-[11px] font-bold text-[#F5C542]"
                >
                  Zéro friction
                </span>
                <svg viewBox="0 0 60 24" fill="none" className="h-5 w-12">
                  <path
                    data-stat-arrow=""
                    d="M2 18 C 20 18, 35 6, 54 8"
                    stroke="#EF4C05"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <path
                    data-stat-arrow=""
                    d="M47 3 L 55 8 L 48 14"
                    stroke="#EF4C05"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION 5: 3-STEP PROCESS (Exact jawoo.io Services module 361220) ==================== */}
      <section
        id="etapes"
        ref={stepsRef}
        className="border-t-2 border-[#181818] bg-white py-16 sm:py-24 px-4 sm:px-8 md:px-12"
      >
        <div className="mx-auto w-full max-w-[1380px]">
          <div className="mb-10 sm:mb-12">
            <h2
              data-steps-title=""
              className="font-['Bricolage_Grotesque',_sans-serif] text-3xl sm:text-5xl font-black tracking-tight text-[#181818]"
            >
              Trois secondes pour lancer la soirée.
            </h2>
          </div>

          <div>
            <div data-step-line="" className="h-[2px] w-full bg-[#181818]" />

            {[
              {
                num: '01',
                title: 'Sélectionnez votre jeu',
                desc: 'Cliquez sur Sekouno, Loups-Garous, Polychess ou Sekou Bomb selon la taille de votre groupe.',
                actionLabel: 'Ouvrir Sekouno',
                game: 'sekouno' as GameId,
              },
              {
                num: '02',
                title: 'Partagez le billet de table',
                desc: 'Affichez le QR Code ou dictez le code à 6 caractères à vos amis présents ou en vocal.',
                actionLabel: 'Ouvrir Sekou Bomb',
                game: 'sekou_bomb' as GameId,
              },
              {
                num: '03',
                title: 'Lancez la manche en direct',
                desc: 'La synchronisation temps réel gère les tours, la pioche secrète, les chronos et les classements.',
                actionLabel: 'Ouvrir Polychess',
                game: 'polychess' as GameId,
              },
            ].map((step) => (
              <div key={step.num}>
                <div
                  data-step-row=""
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6 sm:py-8 transition-colors hover:bg-[#FFF0D8]/50 px-2"
                >
                  <div className="flex items-baseline gap-4 sm:gap-8">
                    <span className="font-mono text-sm font-black text-[#EF4C05]">
                      /{step.num}
                    </span>
                    <div>
                      <h3 className="font-['Bricolage_Grotesque',_sans-serif] text-xl sm:text-2xl font-black tracking-tight text-[#181818]">
                        {step.title}
                      </h3>
                      <p className="mt-1 max-w-[56ch] text-sm sm:text-base text-[#181818]/75">
                        {step.desc}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectGame(step.game)}
                    className="jawoo-rise-btn self-start sm:self-center shrink-0 inline-flex items-center gap-2 border-2 border-[#181818] bg-white px-4 py-2 font-mono text-xs font-black uppercase tracking-wider text-[#181818] hover:text-white cursor-pointer"
                  >
                    <Play weight="fill" className="h-3.5 w-3.5" />
                    <span>{step.actionLabel}</span>
                  </button>
                </div>
                <div data-step-line="" className="h-[2px] w-full bg-[#181818]" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== SECTION 6: FOOTER (Exact jawoo.io module 44604) ==================== */}
      <footer
        ref={footerRef}
        className="border-t-2 border-[#181818] bg-[#181818] text-white px-4 sm:px-8 md:px-12 pt-14 pb-10"
      >
        <div className="mx-auto w-full max-w-[1380px]">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-12 border-b border-white/15">
            <div data-footer-reveal="" className="md:col-span-6">
              <div className="inline-flex items-center gap-3">
                <span className="inline-block h-3.5 w-3.5 bg-[#EF4C05]" />
                <span className="font-['Bricolage_Grotesque',_sans-serif] text-2xl font-black tracking-tight">
                  SekouGaming
                </span>
              </div>
              <p className="mt-3 max-w-[42ch] text-sm text-white/70 leading-relaxed">
                Portail multijoueur temps réel regroupant Sekouno, Loups-Garous, Polychess et Sekou Bomb. Jouable gratuitement sur tous vos écrans.
              </p>
            </div>

            <div data-footer-reveal="" className="md:col-span-3">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#F5C542] block mb-3">
                Lancer un jeu
              </span>
              <ul className="space-y-2 text-sm font-bold">
                {GAMES_CATALOG.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => onSelectGame(g.id)}
                      className="text-white/80 hover:text-[#EF4C05] transition-colors cursor-pointer"
                    >
                      /{g.index} {g.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div data-footer-reveal="" className="md:col-span-3">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#F5C542] block mb-3">
                Astuce Mobile
              </span>
              <p className="text-xs text-white/70 leading-relaxed">
                Sur iPhone ou Android, utilisez « Partager » puis « Sur l’écran d’accueil » pour installer SekouGaming en mode plein écran.
              </p>
            </div>
          </div>

          {/* Monumental Bottom Signature */}
          <div
            data-footer-reveal=""
            className="mt-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4"
          >
            <span className="font-['Bricolage_Grotesque',_sans-serif] text-[clamp(2.4rem,8vw,6rem)] font-black leading-none tracking-tight text-white">
              SEKOUGAMING<span className="text-[#EF4C05]">.</span>
            </span>
            <span className="font-mono text-xs uppercase tracking-widest text-white/50 pb-2">
              © 2026 Sekou-Gaming Studio · Tous droits réservés
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
