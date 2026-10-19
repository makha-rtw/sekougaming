import React, { useState, useEffect } from 'react';
import { Vote, Skull, Clock, Play, Pause, RotateCcw, AlertTriangle, CheckCircle2, Volume2, VolumeX } from 'lucide-react';
import { Player } from '../types/game';
import { ROLE_DEFINITIONS } from '../data/roles';
import { narration } from '../utils/narrationAudio';

interface DayVoteViewProps {
  round: number;
  players: Player[];
  corbeauTargetId?: string | null;
  onConfirmElimination: (targetPlayerId: string | null) => void;
}

export const DayVoteView: React.FC<DayVoteViewProps> = ({
  round,
  players,
  corbeauTargetId,
  onConfirmElimination,
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isTieVote, setIsTieVote] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);

  useEffect(() => {
    return narration.subscribe((playing) => {
      setIsPlayingVoice(playing);
      if (playing) {
        setHasPlayedOnce(true);
      }
    });
  }, []);

  useEffect(() => {
    narration.playCouncilDebateStart();
    setHasPlayedOnce(true);

    return () => {
      narration.stop();
    };
  }, [round]);

  const handleTogglePlayVoice = () => {
    if (isPlayingVoice) {
      narration.stop();
    } else {
      narration.playCouncilDebateStart();
    }
  };

  // Discussion timer
  const [timerSeconds, setTimerSeconds] = useState(180); // 3 minutes
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(s => Math.max(0, s - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const alivePlayers = players.filter(p => p.isAlive);
  const targetPlayer = selectedPlayerId
    ? alivePlayers.find(p => p.id === selectedPlayerId)
    : null;

  const handleSelectPlayer = (id: string) => {
    setSelectedPlayerId(id);
    setIsTieVote(false);
  };

  const handleSelectTie = () => {
    setIsTieVote(true);
    setSelectedPlayerId(null);
  };

  const handleOpenConfirm = () => {
    if (selectedPlayerId || isTieVote) {
      setShowConfirmModal(true);
    }
  };

  const handleExecute = () => {
    setShowConfirmModal(false);
    onConfirmElimination(isTieVote ? null : selectedPlayerId);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-6 pb-28">
      {/* Title */}
      <div className="text-center space-y-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#824716] font-display">
          Jour {round} · Assemblée du Village
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#22160c]">
          Débat & Vote du Conseil
        </h1>
        <p className="text-xs text-[#5c4936]">
          Les survivants débattent librement puis votent pour éliminer un suspect.
        </p>
      </div>

      {/* Voice Proclamation Player Bar */}
      <div className="p-3.5 rounded-2xl bg-[#fcf9f2] border border-[#d8c5aa] shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#f8f3e7] border border-[#d8c39b] flex items-center justify-center text-[#9b6b1e]">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#22160c]">Décret d'ouverture du Conseil</div>
            <div className="text-[10px] text-[#6b5643]">
              {isPlayingVoice ? 'Proclamation en cours...' : 'Ouverture des débats du village'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTogglePlayVoice}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            isPlayingVoice
              ? 'bg-[#824716] text-[#fffdf8] shadow-sm active:scale-95'
              : 'bg-[#eee4cf] hover:bg-[#e4d7bf] text-[#4d3826] border border-[#d2c0a4]'
          }`}
        >
          {isPlayingVoice ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-[#ffd799] animate-pulse" />
              <span>Arrêter</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-[#824716]" />
              <span>{hasPlayedOnce ? 'Réécouter' : 'Écouter'}</span>
            </>
          )}
        </button>
      </div>

      {/* Discussion Debate Timer */}
      <div className="bg-[#fcf9f2] border border-[#d8c5aa] rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-[#9b6b1e]" />
          <span className="text-xs text-[#54412f] font-semibold">Temps de débat :</span>
          <span className="font-display font-extrabold text-base text-[#22160c] tabular-nums">
            {formatTimer(timerSeconds)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsTimerRunning(!isTimerRunning)}
            className="p-2 rounded-lg bg-[#efe4cf] hover:bg-[#e4d6be] text-[#362618] border border-[#cfbe9f] transition-colors cursor-pointer"
            title={isTimerRunning ? 'Pause' : 'Démarrer'}
          >
            {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsTimerRunning(false);
              setTimerSeconds(180);
            }}
            className="p-2 rounded-lg bg-[#efe4cf] hover:bg-[#e4d6be] text-[#6d5743] border border-[#cfbe9f] transition-colors cursor-pointer"
            title="Réinitialiser à 3 min"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Voting Target Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-[#634e3b] px-1 font-display">
          <span className="font-bold uppercase tracking-wider">
            Survivants éligibles au vote ({alivePlayers.length})
          </span>
          <span className="text-[11px] font-normal font-sans">
            Sélectionnez le condamné
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {alivePlayers.map(p => {
            const isSelected = selectedPlayerId === p.id;
            const isCorbeauTarget = corbeauTargetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPlayer(p.id)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#7a1818] border-[#4a0b0b] text-[#fdf4f4] font-bold shadow-sm ring-1 ring-[#4a0b0b]'
                    : isCorbeauTarget
                    ? 'bg-[#eaeaf2] border-[#9696bd] text-[#25254d] hover:bg-[#dfdfe8]'
                    : 'bg-[#fcf9f2] border-[#d8c5aa] text-[#362719] hover:bg-[#f6efe1]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm truncate">{p.name}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-[#f5c6c6]' : 'text-[#78644e]'}`}>
                    Siège {p.seatNumber}
                  </span>
                </div>
                {isCorbeauTarget && (
                  <span className={`text-[10px] font-extrabold mt-1 block ${isSelected ? 'text-[#ffd799]' : 'text-[#25254d]'}`}>
                    🪶 +2 votes (Corbeau)
                  </span>
                )}
                {p.hasLostVoteRight && (
                  <span className={`text-[10px] font-bold mt-0.5 block ${isSelected ? 'text-[#f5c6c6]' : 'text-[#8c5215]'}`}>
                    🚫 Sans droit de vote (Idiot)
                  </span>
                )}
                {isSelected && (
                  <span className="text-[10px] text-[#ffdada] font-extrabold mt-1 block">
                    ● Désigné pour l'exécution
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tie vote button */}
        <button
          type="button"
          onClick={handleSelectTie}
          className={`w-full p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
            isTieVote
              ? 'bg-[#5c3e17] border-[#38240a] text-[#fff8ea] shadow-sm ring-1 ring-[#38240a]'
              : 'bg-[#f8f3e7] border-[#d8c6aa] text-[#634e3b] hover:bg-[#f3ebd9]'
          }`}
        >
          Égalité des voix / Aucun joueur éliminé aujourd'hui
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-[#20140a]/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#fcf9f2] border-2 border-[#bfa686] rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#faecea] border border-[#dea299] flex items-center justify-center text-[#871c1c]">
              <Skull className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="font-display text-xl font-bold text-[#22160c]">
                {isTieVote ? 'Confirmer l\'égalité ?' : `Éliminer ${targetPlayer?.name} ?`}
              </h3>
              <p className="text-xs text-[#5e4b37]">
                {isTieVote
                  ? 'Aucun habitant ne sera éliminé. Le village passera directement à la nuit suivante.'
                  : `${targetPlayer?.name} sera exécuté(e) sur la place publique. Ses pouvoirs éventuels s'éteindront.`}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 rounded-xl bg-[#eee3cf] hover:bg-[#e4d5bf] text-[#2c1d10] text-xs font-bold border border-[#cdbc9f] transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleExecute}
                className="flex-1 py-3 rounded-xl bg-[#8a1e1e] hover:bg-[#721717] text-[#fffdf8] text-xs font-bold shadow-md shadow-[#8a1e1e]/25 border border-[#5c1212] transition-colors cursor-pointer"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#f5efe3] via-[#f5efe3]/95 to-transparent z-20">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={handleOpenConfirm}
            disabled={!selectedPlayerId && !isTieVote}
            className="w-full h-12 rounded-xl bg-[#824716] hover:bg-[#6c390f] disabled:opacity-40 disabled:hover:bg-[#824716] text-[#fffdf8] font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#824716]/25 border border-[#542a06] active:scale-[0.99] transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <Vote className="w-4 h-4 text-[#ffd799]" />
            <span>Valider le Vote de l'Assemblée</span>
          </button>
        </div>
      </div>
    </div>
  );
};
