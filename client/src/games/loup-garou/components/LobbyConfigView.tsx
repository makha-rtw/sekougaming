import React, { useMemo } from 'react';
import { Users, AlertCircle, CheckCircle2, Plus, Minus, Sparkles } from 'lucide-react';
import { RoleId } from '../types/game';
import { getDefaultRoleConfig, ROLE_DEFINITIONS } from '../data/roles';
import { RoleIcon } from './RoleIcon';

interface LobbyConfigViewProps {
  totalPlayers: number;
  roleConfig: Record<RoleId, number>;
  onTotalPlayersChange: (count: number) => void;
  onRoleConfigChange: (config: Record<RoleId, number>) => void;
  onStartDistribution: () => void;
}

export const LobbyConfigView: React.FC<LobbyConfigViewProps> = ({
  totalPlayers,
  roleConfig,
  onTotalPlayersChange,
  onRoleConfigChange,
  onStartDistribution,
}) => {
  // Calculate total configured cards
  const totalCards = useMemo(() => {
    return Object.values(roleConfig).reduce((sum, count) => sum + count, 0);
  }, [roleConfig]);

  // Werewolf count
  const werewolfCount = roleConfig.loup_garou || 0;
  const gmlCount = roleConfig.grand_mechant_loup || 0;
  const infectCount = roleConfig.infect_pere_des_loups || 0;
  const loupBlancCount = roleConfig.loup_blanc || 0;
  const chienLoupCount = roleConfig.chien_loup || 0;
  const totalWolfCamp = werewolfCount + gmlCount + infectCount + loupBlancCount + chienLoupCount;

  // Validation
  const isValid = totalCards === totalPlayers && totalWolfCamp > 0;

  // Presets
  const applyPreset = (count: number) => {
    onTotalPlayersChange(count);
    const newConfig = getDefaultRoleConfig(count);
    onRoleConfigChange(newConfig);
  };

  const handleToggleUniqueRole = (roleId: RoleId) => {
    const current = roleConfig[roleId] || 0;
    const nextVal = current > 0 ? 0 : 1;
    const newConfig = { ...roleConfig, [roleId]: nextVal };

    // Auto-balance villagers if possible
    const otherCount = Object.entries(newConfig)
      .filter(([k]) => k !== 'villageois')
      .reduce((sum, [, v]) => sum + v, 0);

    newConfig.villageois = Math.max(0, totalPlayers - otherCount);
    onRoleConfigChange(newConfig);
  };

  const handleAdjustRole = (roleId: RoleId, delta: number) => {
    const current = roleConfig[roleId] || 0;
    const next = Math.max(0, current + delta);
    const newConfig = { ...roleConfig, [roleId]: next };

    // Auto-adjust villagers if modifying wolves or villagers
    if (roleId !== 'villageois') {
      const otherCount = Object.entries(newConfig)
        .filter(([k]) => k !== 'villageois')
        .reduce((sum, [, v]) => sum + v, 0);
      newConfig.villageois = Math.max(0, totalPlayers - otherCount);
    }

    onRoleConfigChange(newConfig);
  };

  const handlePlayerCountChange = (count: number) => {
    const clamped = Math.max(4, Math.min(24, count));
    onTotalPlayersChange(clamped);

    // Rebalance villagers to match new total
    const specialCount = Object.entries(roleConfig)
      .filter(([k]) => k !== 'villageois')
      .reduce((sum, [, v]) => sum + v, 0);

    onRoleConfigChange({
      ...roleConfig,
      villageois: Math.max(0, clamped - specialCount),
    });
  };

  // Special roles list
  const specialRoles: RoleId[] = [
    'grand_mechant_loup',
    'infect_pere_des_loups',
    'loup_blanc',
    'voyante',
    'sorciere',
    'salvateur',
    'ancien',
    'corbeau',
    'enfant_sauvage',
    'idiot_du_village',
    'montreur_ours',
    'necromancien',
    'insomniaque',
    'renard',
    'petite_fille',
    'chasseur',
    'cupidon',
    'chien_loup',
    'ange',
    'voleur',
    'pyromane',
  ];

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-6 pb-28">
      {/* Title & Introduction */}
      <div className="text-center space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#22160c]">
          Création de la Partie
        </h1>
        <p className="text-xs text-[#5c4936]">
          Configurez les participants et l'attribution des cartes secrètes dans le grimoire.
        </p>
      </div>

      {/* Quick Presets */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => applyPreset(8)}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#efe4cf] border border-[#cfbe9f] text-[#3d2b1b] hover:bg-[#e4d6bd] transition-colors shrink-0 cursor-pointer shadow-2xs"
        >
          8 Joueurs
        </button>
        <button
          type="button"
          onClick={() => applyPreset(10)}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#efe4cf] border border-[#cfbe9f] text-[#3d2b1b] hover:bg-[#e4d6bd] transition-colors shrink-0 cursor-pointer shadow-2xs"
        >
          10 Joueurs
        </button>
        <button
          type="button"
          onClick={() => applyPreset(12)}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#efe4cf] border border-[#cfbe9f] text-[#3d2b1b] hover:bg-[#e4d6bd] transition-colors shrink-0 cursor-pointer shadow-2xs"
        >
          12 Joueurs
        </button>
      </div>

      {/* Total Players Selector */}
      <div className="bg-[#fcf9f2] border border-[#d8c5aa] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#f7e6e3] border border-[#dfaba2] flex items-center justify-center text-[#871c1c]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#24170d]">Nombre de Joueurs</h2>
              <p className="text-[11px] text-[#614e3b]">Autour de la table (4 à 24)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handlePlayerCountChange(totalPlayers - 1)}
              disabled={totalPlayers <= 4}
              className="w-9 h-9 rounded-xl bg-[#eee3cf] hover:bg-[#e3d5bd] disabled:opacity-35 text-[#2c1d10] border border-[#cfbe9f] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Moins de joueurs"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-display font-extrabold text-xl text-[#22160c] tabular-nums w-8 text-center">
              {totalPlayers}
            </span>
            <button
              type="button"
              onClick={() => handlePlayerCountChange(totalPlayers + 1)}
              disabled={totalPlayers >= 24}
              className="w-9 h-9 rounded-xl bg-[#eee3cf] hover:bg-[#e3d5bd] disabled:opacity-35 text-[#2c1d10] border border-[#cfbe9f] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Plus de joueurs"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Base Roles: Loups-Garous & Simple Villageois */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#695542] px-1 font-display">
          Rôles de Base
        </h2>

        {/* Loup-Garou Counter */}
        <div className="bg-[#faecea] border border-[#dea299] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#f4d5d0] border border-[#dea299] flex items-center justify-center text-[#871c1c]">
              <RoleIcon roleId="loup_garou" className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#871c1c]">Loups-Garous Ordinaires</div>
              <p className="text-[11px] text-[#6b4742]">Chassent en meute chaque nuit</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAdjustRole('loup_garou', -1)}
              disabled={werewolfCount <= 1}
              className="w-8 h-8 rounded-lg bg-[#ebd2ce] hover:bg-[#e4c4bf] disabled:opacity-35 text-[#871c1c] border border-[#dea299] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-display font-extrabold text-base text-[#871c1c] tabular-nums w-6 text-center">
              {werewolfCount}
            </span>
            <button
              type="button"
              onClick={() => handleAdjustRole('loup_garou', 1)}
              className="w-8 h-8 rounded-lg bg-[#ebd2ce] hover:bg-[#e4c4bf] text-[#871c1c] border border-[#dea299] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Simple Villageois Counter */}
        <div className="bg-[#fcf7ec] border border-[#d8c39b] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#ede0c3] border border-[#d8c39b] flex items-center justify-center text-[#63431a]">
              <RoleIcon roleId="villageois" className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#63431a]">Simples Villageois</div>
              <p className="text-[11px] text-[#71532f]">Complètent l'effectif du village</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAdjustRole('villageois', -1)}
              disabled={(roleConfig.villageois || 0) <= 0}
              className="w-8 h-8 rounded-lg bg-[#e7d8b8] hover:bg-[#deccaa] disabled:opacity-35 text-[#63431a] border border-[#d8c39b] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-display font-extrabold text-base text-[#63431a] tabular-nums w-6 text-center">
              {roleConfig.villageois || 0}
            </span>
            <button
              type="button"
              onClick={() => handleAdjustRole('villageois', 1)}
              className="w-8 h-8 rounded-lg bg-[#e7d8b8] hover:bg-[#deccaa] text-[#63431a] border border-[#d8c39b] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Special Roles Toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#695542] font-display">
            Rôles Spéciaux & Pouvoirs
          </h2>
          <span className="text-[11px] text-[#7d6853]">
            Cochez pour inclure
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {specialRoles.map(roleId => {
            const role = ROLE_DEFINITIONS[roleId];
            const isIncluded = (roleConfig[roleId] || 0) > 0;

            return (
              <button
                key={roleId}
                type="button"
                onClick={() => handleToggleUniqueRole(roleId)}
                className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                  isIncluded
                    ? `${role.colorScheme.bg} ${role.colorScheme.border} shadow-xs`
                    : 'bg-[#f8f3e8]/70 border-[#ded0b9] opacity-75 hover:opacity-100 hover:bg-[#f6efe1]'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      isIncluded
                        ? `${role.colorScheme.badgeBg} ${role.colorScheme.border} ${role.colorScheme.text}`
                        : 'bg-[#ede3ce] border-[#d4c3a7] text-[#735e47]'
                    }`}
                  >
                    <RoleIcon roleId={roleId} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold truncate ${isIncluded ? role.colorScheme.text : 'text-[#39291b]'}`}>
                        {role.name}
                      </span>
                      {roleId === 'loup_blanc' && (
                        <span className="text-[10px] uppercase font-bold text-[#6a427f] tracking-wide">
                          Optionnel
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#614e3b] line-clamp-1 mt-0.5">
                      {role.shortPower}
                    </p>
                  </div>
                </div>

                <div className="pt-1 shrink-0">
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                      isIncluded
                        ? 'bg-[#824716] border-[#542a06] text-white shadow-2xs'
                        : 'border-[#c4b399] bg-[#f0e7d5]'
                    }`}
                  >
                    {isIncluded && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Validation & Status Banner */}
      <div
        className={`p-4 rounded-2xl border transition-colors ${
          isValid
            ? 'bg-[#edf5ee] border-[#a7cca9] text-[#1d592b]'
            : 'bg-[#faecea] border-[#dea299] text-[#871c1c]'
        }`}
      >
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-semibold">
            {isValid ? (
              <CheckCircle2 className="w-4 h-4 text-[#256c35]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#871c1c]" />
            )}
            <span>
              {isValid
                ? 'Configuration équilibrée et prête'
                : totalCards !== totalPlayers
                ? `Cartes (${totalCards}) ≠ Joueurs (${totalPlayers})`
                : 'Au moins 1 Loup-Garou requis'}
            </span>
          </div>

          <span className="font-display font-extrabold text-sm tabular-nums">
            {totalCards} / {totalPlayers}
          </span>
        </div>

        {totalCards !== totalPlayers && (
          <p className="text-[11px] text-[#664b44] mt-2">
            {totalCards < totalPlayers
              ? `Ajoutez ${totalPlayers - totalCards} carte(s) (ou villageois) pour atteindre l'effectif.`
              : `Retirez ${totalCards - totalPlayers} carte(s) pour correspondre au nombre de joueurs.`}
          </p>
        )}
      </div>

      {/* Floating Bottom Sticky CTA Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#f5efe3] via-[#f5efe3]/95 to-transparent z-20">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={onStartDistribution}
            disabled={!isValid}
            className="w-full h-12 rounded-xl bg-[#824716] hover:bg-[#6c390f] disabled:opacity-40 disabled:hover:bg-[#824716] text-[#fffdf8] font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#824716]/25 border border-[#542a06] active:scale-[0.99] transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            <span>Commencer la Distribution Secrète</span>
          </button>
        </div>
      </div>
    </div>
  );
};
