/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Moon, Volume2, Image as ImageIcon, AlertTriangle, RotateCcw, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PreloadProgress } from '../utils/assetPreloader';

interface InitialLoadingScreenProps {
  progress: PreloadProgress;
  onRetry: () => void;
  onSkip?: () => void;
}

export const InitialLoadingScreen: React.FC<InitialLoadingScreenProps> = ({
  progress,
  onRetry,
  onSkip,
}) => {
  const {
    stage,
    currentLabel,
    currentSubLabel,
    percent,
    loadedBytes,
    totalBytes,
    loadedImagesCount,
    totalImagesCount,
    loadedAudioCount,
    totalAudioCount,
    failedItems,
  } = progress;

  const totalLoadedMB = (loadedBytes / (1024 * 1024)).toFixed(1);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center px-4 py-8 relative overflow-hidden bg-[#F5EFE3] selection:bg-[#7C4714] selection:text-[#FAF5EA]">
      {/* Decorative Grimoire Background Accents */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'radial-gradient(ellipse at 50% 20%, #FAF5EA 0%, #EFE5D0 60%, #E2D3B8 100%)',
        }}
      />

      {/* Medieval Corner Filigree Borders (Visual Flourish) */}
      <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-[#bfa98d]/60 pointer-events-none" />
      <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-[#bfa98d]/60 pointer-events-none" />
      <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-[#bfa98d]/60 pointer-events-none" />
      <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-[#bfa98d]/60 pointer-events-none" />

      {/* 1. Header with Exact Title */}
      <header className="relative z-10 w-full max-w-md text-center pt-2">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-1"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eee4cf] border border-[#d2bea3] text-[11px] font-semibold text-[#6e5338] tracking-widest uppercase mb-1">
            <Moon className="w-3 h-3 text-[#7c4714]" />
            <span>Édition Maître du Jeu</span>
          </div>

          <h1 className="font-display font-black text-xl sm:text-2xl text-[#22160C] tracking-wide uppercase drop-shadow-xs">
            Sekou-Gaming — Variante Loup-Garou
          </h1>

          <p className="text-xs sm:text-sm text-[#7e6b57] font-medium italic">
            Préparation du village & des grimoires secrets
          </p>
        </motion.div>
      </header>

      {/* 2. Main Central Parchment Loading Card */}
      <main className="relative z-10 w-full max-w-md my-auto py-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-[#FCF9F2] border-2 border-[#D8C7AD] rounded-3xl p-6 shadow-xl shadow-[#4a3420]/10 relative overflow-hidden"
        >
          {/* Inner ornamental border line */}
          <div className="absolute inset-1.5 rounded-[22px] border border-[#bfa98d]/30 pointer-events-none" />

          {/* Sceau / Medieval Icon */}
          <div className="flex justify-center mb-5">
            <motion.div
              animate={stage !== 'error' ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="w-16 h-16 rounded-2xl bg-radial from-[#F5EFE3] to-[#E9DCBE] border-2 border-[#7C4714]/40 flex items-center justify-center shadow-md shadow-[#7c4714]/15"
            >
              {stage === 'error' ? (
                <AlertTriangle className="w-8 h-8 text-[#8A1E1E]" />
              ) : stage === 'images' ? (
                <ImageIcon className="w-8 h-8 text-[#7C4714]" />
              ) : stage === 'audio' ? (
                <Volume2 className="w-8 h-8 text-[#9B6B1E]" />
              ) : (
                <BookOpen className="w-8 h-8 text-[#7C4714]" />
              )}
            </motion.div>
          </div>

          {/* Error View or Progress View */}
          {stage === 'error' ? (
            <div className="space-y-4 text-center">
              <div className="p-3.5 rounded-xl bg-[#faecea] border border-[#dea299] text-[#871c1c] text-xs">
                <p className="font-bold text-sm mb-1">Connexion instable ou ressource inaccessible</p>
                <p className="text-[11px] text-[#7a2222]">
                  {failedItems.length} fichier(s) n'ont pas pu être téléchargés.
                </p>
                {failedItems.length > 0 && (
                  <div className="mt-2 text-left bg-white/70 p-2 rounded-lg border border-[#e8bbb5] max-h-24 overflow-y-auto text-[10px] space-y-1">
                    {failedItems.slice(0, 4).map((f, i) => (
                      <div key={i} className="truncate">
                        • {f.item.name} ({f.error})
                      </div>
                    ))}
                    {failedItems.length > 4 && (
                      <div className="italic text-[#993b3b]">
                        + {failedItems.length - 4} autre(s) fichier(s)
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={onRetry}
                  className="w-full h-11 rounded-xl bg-[#7C4714] hover:bg-[#65360c] text-[#FAF5EA] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Réessayer le chargement</span>
                </button>

                {onSkip && (
                  <button
                    type="button"
                    onClick={onSkip}
                    className="w-full py-2.5 rounded-xl bg-[#eee4cf] hover:bg-[#e4d7bf] border border-[#cdbda0] text-[#554231] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>Continuer malgré tout</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5 text-center">
              {/* Step title & Subtitle */}
              <div className="space-y-1 min-h-[50px] flex flex-col justify-center">
                <div className="font-display font-bold text-base sm:text-lg text-[#22160C] tracking-wide">
                  {currentLabel}
                </div>
                <div className="text-xs text-[#7E6B57] truncate font-medium">
                  {currentSubLabel}
                </div>
              </div>

              {/* Real Percentage Display */}
              <div className="flex items-baseline justify-center gap-1 text-[#7C4714]">
                <span className="font-display font-black text-4xl sm:text-5xl tracking-tight">
                  {percent}
                </span>
                <span className="font-display text-lg sm:text-xl font-bold opacity-80">%</span>
              </div>

              {/* Styled Parchment Progress Bar */}
              <div className="w-full bg-[#EADDC6] rounded-full h-3.5 p-0.5 border border-[#C5B396] shadow-inner relative overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-linear-to-r from-[#7C4714] via-[#9B6B1E] to-[#C88E33] relative shadow-sm"
                  style={{ width: `${Math.max(4, percent)}%` }}
                  transition={{ ease: 'easeOut', duration: 0.3 }}
                >
                  {/* Subtle Shimmer highlight */}
                  <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
                </motion.div>
              </div>

              {/* Resource Badges */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2 rounded-xl bg-[#F5EFE3] border border-[#D8C7AD] flex flex-col items-center">
                  <div className="flex items-center gap-1 text-[10px] text-[#7E6B57] font-semibold uppercase">
                    <ImageIcon className="w-3 h-3 text-[#7C4714]" />
                    <span>Icônes</span>
                  </div>
                  <div className="font-display font-bold text-xs text-[#22160C] mt-0.5">
                    {loadedImagesCount} / {totalImagesCount}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-[#F5EFE3] border border-[#D8C7AD] flex flex-col items-center">
                  <div className="flex items-center gap-1 text-[10px] text-[#7E6B57] font-semibold uppercase">
                    <Volume2 className="w-3 h-3 text-[#9B6B1E]" />
                    <span>Voix</span>
                  </div>
                  <div className="font-display font-bold text-xs text-[#22160C] mt-0.5">
                    {loadedAudioCount} / {totalAudioCount}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-[#F5EFE3] border border-[#D8C7AD] flex flex-col items-center">
                  <div className="flex items-center gap-1 text-[10px] text-[#7E6B57] font-semibold uppercase">
                    <CheckCircle2 className="w-3 h-3 text-[#396d3d]" />
                    <span>Taille</span>
                  </div>
                  <div className="font-display font-bold text-xs text-[#22160C] mt-0.5">
                    {totalLoadedMB} / {totalMB} Mo
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      {/* 3. Footer Note */}
      <footer className="relative z-10 w-full max-w-md text-center pb-2">
        <p className="text-[11px] sm:text-xs text-[#8c7863] leading-relaxed">
          Les cartes et sentences vocales sont préchargées en mémoire afin de garantir une animation fluide et instantanée pendant la partie.
        </p>
      </footer>
    </div>
  );
};
