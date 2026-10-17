import React from 'react';
import { Sparkles, Users, ArrowRight, Flame, Moon, Smartphone, ShieldCheck, Volume2 } from 'lucide-react';

interface HubScreenProps {
  onSelectGame: (gameId: 'sekouno' | 'loup_garou') => void;
}

export const HubScreen: React.FC<HubScreenProps> = ({ onSelectGame }) => {
  return (
    <div className="min-h-[100dvh] w-full text-slate-100 flex flex-col justify-between p-3 sm:p-6 overflow-y-auto selection:bg-amber-500/30 selection:text-amber-200">
      {/* Background Decorative Lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[20%] w-[400px] h-[400px] bg-red-600/10 rounded-full blur-[130px]" />
        <div className="absolute top-[40%] right-[10%] w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[30%] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[150px]" />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-4xl mx-auto my-auto flex flex-col items-center">
        {/* Hub Header (Compact for 1-screen fit) */}
        <header className="text-center mb-3 sm:mb-6 flex flex-col items-center">
          <div className="flex items-center gap-3 mb-1.5">
            {/* Studio Logo */}
            <div className="relative group">
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-500 to-indigo-600 opacity-70 blur-sm" />
              <img
                src="/sekouG_logo.jpg"
                alt="SekouGaming Logo"
                className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl object-cover border border-amber-400/80 shadow-lg"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow">
              SEKOU<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-500">GAMING</span>
            </h1>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-inner">
            <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-300">
              Choisissez votre jeu • Gratuit & sans installation
            </span>
          </div>
        </header>

        {/* Game Selection Cards Grid (Both fully visible on 1st screen) */}
        <section className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5 max-w-3xl">
          {/* 1. SEKOUNO CARD */}
          <div
            onClick={() => onSelectGame('sekouno')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelectGame('sekouno');
            }}
            className="group relative rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 border-2 border-slate-800 hover:border-amber-400/80 transition-all duration-200 shadow-lg hover:shadow-amber-500/15 p-4 sm:p-5 flex flex-col justify-between cursor-pointer transform hover:-translate-y-0.5 overflow-hidden"
          >
            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-red-600/20 via-amber-500/10 to-transparent rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-300" />

            <div>
              {/* Card Top: Logo + Name + Player Count */}
              <div className="flex items-center gap-3.5 mb-2.5">
                <img
                  src="/logos/logo_sekouno.jpg"
                  alt="Logo Sekouno"
                  className="w-13 h-13 sm:w-15 sm:h-15 rounded-xl object-cover border border-amber-400/50 shadow-md group-hover:scale-105 transition-transform duration-200 shrink-0"
                  onError={(e) => {
                    // Fallback if image fails to load
                    (e.currentTarget as HTMLElement).src = '/sekouG_logo.jpg';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/80 border border-red-500/40 text-[9px] font-black text-red-300 uppercase tracking-wider">
                      <Flame className="w-2.5 h-2.5 text-amber-400 fill-current" />
                      <span>Multijoueur</span>
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
                      <Users className="w-3 h-3 text-amber-400" />
                      <span>2-15 j.</span>
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-amber-300 transition-colors truncate">
                    SEKOUNO
                  </h2>
                </div>
              </div>

              {/* Single Sentence Description (No check marks) */}
              <p className="text-xs text-slate-300 leading-snug">
                Le jeu de cartes culte en multijoueur temps réel avec vos règles personnalisées.
              </p>
            </div>

            {/* CTA Button */}
            <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400">Salons privés & QR Code</span>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider text-white bg-gradient-to-r from-red-600 via-amber-500 to-orange-500 group-hover:brightness-110 shadow-md shadow-orange-500/25 transition-all transform active:scale-95"
              >
                <span>Jouer</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* 2. LOUP-GAROU CARD */}
          <div
            onClick={() => onSelectGame('loup_garou')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelectGame('loup_garou');
            }}
            className="group relative rounded-2xl bg-gradient-to-b from-stone-900/95 via-stone-900/90 to-stone-950/95 border-2 border-stone-800 hover:border-amber-600/80 transition-all duration-200 shadow-lg hover:shadow-amber-700/15 p-4 sm:p-5 flex flex-col justify-between cursor-pointer transform hover:-translate-y-0.5 overflow-hidden"
          >
            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-amber-700/20 via-stone-700/10 to-transparent rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-300" />

            <div>
              {/* Card Top: Logo + Name + Player Count */}
              <div className="flex items-center gap-3.5 mb-2.5">
                <img
                  src="/logos/logo_loupG.jpg"
                  alt="Logo Loup-Garou"
                  className="w-13 h-13 sm:w-15 sm:h-15 rounded-xl object-cover border border-amber-600/50 shadow-md group-hover:scale-105 transition-transform duration-200 shrink-0"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).src = '/sekouG_logo.jpg';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-950/90 border border-amber-700/40 text-[9px] font-black text-amber-300 uppercase tracking-wider">
                      <Moon className="w-2.5 h-2.5 text-amber-400" />
                      <span>Grimoire</span>
                    </span>
                    <span className="text-[11px] font-bold text-stone-400 flex items-center gap-1 shrink-0">
                      <Users className="w-3 h-3 text-amber-500" />
                      <span>6-18 j.</span>
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-amber-200 transition-colors truncate">
                    LOUPS-GAROUS
                  </h2>
                </div>
              </div>

              {/* Single Sentence Description (No check marks) */}
              <p className="text-xs text-stone-300 leading-snug">
                Jeu d'ambiance et de déduction sociale avec 13 rôles secrets et narration vocale.
              </p>
            </div>

            {/* CTA Button */}
            <div className="mt-3.5 pt-2.5 border-t border-stone-800/80 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-stone-400">Pass & Play / Modérateur</span>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider text-amber-100 bg-gradient-to-r from-stone-800 via-amber-900 to-stone-900 border border-amber-600/40 group-hover:brightness-125 shadow-md shadow-amber-950/40 transition-all transform active:scale-95"
              >
                <span>Lancer</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-amber-300" />
              </button>
            </div>
          </div>
        </section>

        {/* Compact 1-line Feature Pills */}
        <div className="mt-4 sm:mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[11px] text-slate-400">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800/80">
            <Smartphone className="w-3.5 h-3.5 text-amber-400" />
            <span>Mobile First & PWA</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800/80">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Libre & Gratuit</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800/80">
            <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sound Design Intégré</span>
          </div>
        </div>
      </div>

      {/* Bottom Studio Credit */}
      <footer className="relative z-10 text-center py-1 text-[10px] text-slate-500 font-medium">
        Sekou-Gaming Studio © 2026 — Plateforme unifiée de jeux
      </footer>
    </div>
  );
};
