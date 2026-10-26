import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Users, Wifi, Smartphone, Trophy, Flame } from 'lucide-react';

/*
 * Hub "Nuit de jeu"
 * Palette : nuit #0A0F1E · surface #121A2E · ivoire #F3EEE3 · brume #8E97AD · lampe (accent unique) #FFC93C
 * Typo    : Bricolage Grotesque (titres) + Plus Jakarta Sans (texte)
 * Rayons  : affiches 28px, boutons en pilule.
 */

type GameId = 'sekouno' | 'loup_garou' | 'polychess' | 'sekou_bomb';

interface HubScreenProps {
  onSelectGame: (gameId: GameId) => void;
}

interface GameEntry {
  id: GameId;
  title: string;
  pitch: string;
  image: string;
  fallback: string; // gradient affiché sous l'illustration (ou si elle manque)
  shade: string; // teinte du voile de lisibilité
  focus: string; // point focal de l'illustration (object-position)
  meta: { icon: React.ElementType; label: string }[];
}

const GAMES: GameEntry[] = [
  {
    id: 'sekouno',
    title: 'Sekouno',
    pitch: 'Le jeu de cartes culte, en ligne, avec tes propres règles de pénalité.',
    image: '/hub/sekouno.jpg',
    fallback: 'linear-gradient(160deg,#e23b2e 0%,#f5b921 45%,#1f8f4e 75%,#1d4fd8 100%)',
    shade: '10,6,6',
    focus: '50% 42%',
    meta: [
      { icon: Users, label: '2 à 15 joueurs' },
      { icon: Wifi, label: 'En ligne' },
    ],
  },
  {
    id: 'loup_garou',
    title: 'Loups-Garous',
    pitch: 'Le village s’endort. Rôles secrets, meneur guidé et voix qui raconte la nuit.',
    image: '/hub/loupgarou.jpg',
    fallback: 'radial-gradient(circle at 70% 20%,#e9e4c9 0 8%,#3b4f86 9%,#131c3d 55%,#070b18 100%)',
    shade: '5,9,24',
    focus: '55% 28%',
    meta: [
      { icon: Users, label: '6 à 18 joueurs' },
      { icon: Smartphone, label: 'Un seul téléphone' },
    ],
  },
  {
    id: 'polychess',
    title: 'Polychess',
    pitch: 'Affronte tes amis aux échecs, en local ou en ligne, avec un vrai classement Elo.',
    image: '/hub/polychess.jpg',
    fallback: 'linear-gradient(160deg,#e9e2cf 0%,#3f7d5c 50%,#0b2418 100%)',
    shade: '4,14,10',
    focus: '50% 48%',
    meta: [
      { icon: Users, label: '2 joueurs' },
      { icon: Trophy, label: 'Classement Elo' },
    ],
  },
  {
    id: 'sekou_bomb',
    title: 'Sekou Bomb',
    pitch: 'Trouve un mot contenant les lettres imposées et passe la bombe avant qu’elle n’explose.',
    image: '/hub/sekoubomb.jpg',
    fallback: 'radial-gradient(circle at 50% 35%,#ff9f1c 0%,#ff334b 45%,#1c1116 80%,#0b080a 100%)',
    shade: '14,8,10',
    focus: '50% 42%',
    meta: [
      { icon: Users, label: '2 à 16 joueurs' },
      { icon: Flame, label: 'FR & EN • En ligne' },
    ],
  },
];

const DISPLAY = "font-['Bricolage_Grotesque',_'Plus_Jakarta_Sans',_sans-serif]";

export const HubScreen: React.FC<HubScreenProps> = ({ onSelectGame }) => {
  const reduce = useReducedMotion();

  const rise = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 28 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay: 0.08 + i * 0.09, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#0A0F1E] text-[#F3EEE3] font-['Plus_Jakarta_Sans',_sans-serif] selection:bg-[#FFC93C] selection:text-[#0A0F1E]"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 1rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1rem)',
      }}
    >
      {/* Lumière de lampe au-dessus de la table */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(60rem 36rem at 12% -8%, rgba(255,201,60,0.10), transparent 60%), radial-gradient(50rem 40rem at 110% 110%, rgba(64,96,190,0.14), transparent 60%)',
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-[1320px] flex-col px-4 sm:px-8">
        {/* En-tête */}
        <motion.header {...rise(0)} className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/sekouG_logo.jpg"
              alt=""
              className="h-9 w-9 rounded-xl object-cover ring-1 ring-white/15"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <span className={`${DISPLAY} text-xl font-bold tracking-tight`}>SekouGaming</span>
          </div>
          <span className="hidden text-sm text-[#8E97AD] sm:block">Gratuit, sans installation</span>
        </motion.header>

        {/* Accroche */}
        <section className="pt-6 pb-7 sm:pt-12 sm:pb-10">
          <motion.h1
            {...rise(1)}
            className={`${DISPLAY} max-w-[14ch] text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-7xl`}
          >
            Ce soir, on joue à quoi&nbsp;?
          </motion.h1>
          <motion.p {...rise(2)} className="mt-4 max-w-[46ch] text-base leading-relaxed text-[#B7BDCC] sm:text-lg">
            Quatre jeux à lancer en un geste entre amis, sur téléphone comme sur ordinateur.
          </motion.p>
        </section>

        {/* Affiches des jeux */}
        <section
          aria-label="Choisir un jeu"
          className="grid flex-1 grid-cols-1 gap-3 sm:gap-4 lg:flex lg:min-h-[520px] lg:max-h-[640px]"
        >
          {GAMES.map((game, i) => (
            <motion.button
              key={game.id}
              type="button"
              {...rise(3 + i)}
              onClick={() => onSelectGame(game.id)}
              aria-label={`Jouer à ${game.title}`}
              className="group relative isolate h-[15.5rem] overflow-hidden rounded-[28px] text-left ring-1 ring-white/10 outline-none transition-[flex-grow,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:ring-2 focus-visible:ring-[#FFC93C] active:scale-[0.99] sm:h-[19rem] lg:h-auto lg:flex-1 lg:hover:flex-[1.85] lg:focus-visible:flex-[1.85]"
              style={{ background: game.fallback }}
            >
              {/* Illustration */}
              <img
                src={game.image}
                alt=""
                loading={i === 0 ? 'eager' : 'lazy'}
                style={{ objectPosition: game.focus }}
                className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />

              {/* Voile de lisibilité */}
              <div
                aria-hidden
                className="absolute inset-0 -z-10"
                style={{
                  background: `linear-gradient(to top, rgba(${game.shade},0.94) 0%, rgba(${game.shade},0.62) 38%, rgba(${game.shade},0.08) 72%, rgba(${game.shade},0) 100%)`,
                }}
              />

              {/* Contenu */}
              <div className="flex h-full flex-col justify-end p-5 sm:p-7">
                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <h2
                      className={`${DISPLAY} text-[2rem] font-extrabold leading-none tracking-[-0.03em] sm:text-[2.6rem] lg:text-5xl`}
                    >
                      {game.title}
                    </h2>

                    <p className="mt-2.5 max-w-[38ch] text-sm leading-snug text-[#E3E0D6]/90 line-clamp-2 sm:text-[0.95rem] lg:max-h-0 lg:opacity-0 lg:transition-all lg:duration-500 lg:group-hover:max-h-20 lg:group-hover:opacity-100 lg:group-focus-visible:max-h-20 lg:group-focus-visible:opacity-100">
                      {game.pitch}
                    </p>

                    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.8rem] font-medium text-[#C9CCD6]">
                      {game.meta.map(({ icon: Icon, label }) => (
                        <li key={label} className="inline-flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 opacity-80" strokeWidth={2} />
                          {label}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <span className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-[#FFC93C] pl-4 pr-3 text-sm font-bold text-[#0A0F1E] shadow-[0_8px_24px_-8px_rgba(255,201,60,0.55)] transition-transform duration-300 group-hover:-translate-y-0.5">
                    Jouer
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.4} />
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </section>

        {/* Pied de page */}
        <footer className="mt-8 flex flex-col gap-1 pb-2 text-xs text-[#6F7890] sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Sekou-Gaming Studio</span>
          <span>Astuce iPhone : Partager, puis « Sur l’écran d’accueil » pour l’installer.</span>
        </footer>
      </div>
    </div>
  );
};
