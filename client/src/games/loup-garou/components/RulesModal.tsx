import React, { useState } from 'react';
import { X, BookOpen, Moon, Sun, Trophy, ShieldAlert } from 'lucide-react';
import { ROLE_DEFINITIONS } from '../data/roles';
import { RoleIcon } from './RoleIcon';
import { RoleId } from '../types/game';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'roles' | 'night_order' | 'victory'>('roles');

  if (!isOpen) return null;

  const roleList = Object.keys(ROLE_DEFINITIONS) as RoleId[];

  return (
    <div className="fixed inset-0 z-50 bg-[#20140a]/65 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md h-[90vh] bg-[#fcf9f2] border-2 border-[#bfa686] rounded-3xl p-5 flex flex-col justify-between overflow-hidden shadow-2xl">
        <div className="flex flex-col h-full min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#e2d3bd] shrink-0">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-[#824716]" />
              <h2 className="font-display font-bold text-base text-[#22160c]">
                Grimoire des Règles
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#634e3b] hover:text-[#22160c] rounded-lg hover:bg-[#ede2cd] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#efe4cf] rounded-xl my-3 shrink-0 border border-[#d8c5aa]">
            <button
              type="button"
              onClick={() => setTab('roles')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                tab === 'roles' ? 'bg-[#824716] text-[#fffdf8] shadow-xs' : 'text-[#5c4733] hover:text-[#22160c]'
              }`}
            >
              Rôles ({roleList.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('night_order')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                tab === 'night_order' ? 'bg-[#824716] text-[#fffdf8] shadow-xs' : 'text-[#5c4733] hover:text-[#22160c]'
              }`}
            >
              Ordre Nocturne
            </button>
            <button
              type="button"
              onClick={() => setTab('victory')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                tab === 'victory' ? 'bg-[#824716] text-[#fffdf8] shadow-xs' : 'text-[#5c4733] hover:text-[#22160c]'
              }`}
            >
              Victoires
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {tab === 'roles' && (
              <div className="space-y-2.5">
                {roleList.map(roleId => {
                  const role = ROLE_DEFINITIONS[roleId];
                  return (
                    <div
                      key={roleId}
                      className="p-3 rounded-2xl bg-[#fffdfa] border border-[#d8c5aa] space-y-1 text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border ${role.colorScheme.badgeBg} ${role.colorScheme.border} ${role.colorScheme.text}`}>
                          <RoleIcon roleId={roleId} className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-[#22160c] text-sm">{role.name}</span>
                        <span className="text-[10px] text-[#715c48]">
                          ({role.camp === 'loups_garous' ? 'Loups' : role.camp === 'villageois' ? 'Village' : 'Indépendant'})
                        </span>
                      </div>
                      <p className="text-[#523e2c] leading-relaxed pl-8">
                        {role.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {tab === 'night_order' && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#fcf9f2] border border-[#d8c5aa] space-y-2 shadow-2xs">
                  <div className="flex items-center gap-2 text-[#824716] font-bold text-sm font-display">
                    <Moon className="w-4 h-4" />
                    <span>Première Nuit (Ordre officiel)</span>
                  </div>
                  <ol className="list-decimal pl-5 space-y-1 text-[#453322]">
                    <li><strong>Voleur</strong> (dérobe un rôle, la cible devient Simple Villageois)</li>
                    <li><strong>Chien-Loup</strong> (choisit d'être Villageois ou Loup-Garou)</li>
                    <li><strong>Enfant Sauvage</strong> (choisit son modèle secret)</li>
                    <li><strong>Cupidon</strong> (désigne les 2 Amoureux)</li>
                    <li><strong>Reconnaissance des Amoureux</strong> (ouverture discrète des yeux)</li>
                    <li><strong>Insomniaque</strong> (rend visite à un joueur pour bloquer son pouvoir nocturne)</li>
                    <li><strong>Salvateur</strong> (protège 1 joueur)</li>
                    <li><strong>Voyante</strong> (sonde 1 joueur)</li>
                    <li><strong>Renard</strong> (flaire le trio de voisins physiques)</li>
                    <li><strong>Corbeau</strong> (ajoute 2 votes contre un suspect pour demain)</li>
                    <li><strong>Loups-Garous</strong> (Petite Fille peut espionner)</li>
                    <li><strong>Infect Père des Loups</strong> (peut infecter la victime des loups 1x/partie)</li>
                    <li><strong>Grand Méchant Loup</strong> (si aucun loup n'est mort)</li>
                    <li><strong>Pyromane</strong> (huile obligatoirement 1 joueur)</li>
                    <li><strong>Sorcière</strong> (potions de vie et/ou de mort)</li>
                    <li><strong>Résolution & Annonce du Réveil (Montreur d'Ours, Corbeau)</strong></li>
                  </ol>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#fcf9f2] border border-[#d8c5aa] space-y-2 shadow-2xs">
                  <div className="flex items-center gap-2 text-[#9b6b1e] font-bold text-sm font-display">
                    <Sun className="w-4 h-4" />
                    <span>Nuits Suivantes (Nuit 2+)</span>
                  </div>
                  <ol className="list-decimal pl-5 space-y-1 text-[#453322]">
                    <li><strong>Insomniaque</strong> (doit changer de cible chaque nuit)</li>
                    <li><strong>Salvateur</strong> (cible différente de la veille obligatoire)</li>
                    <li><strong>Voyante</strong></li>
                    <li><strong>Renard</strong> (si flair conservé)</li>
                    <li><strong>Corbeau</strong> (ajoute 2 votes contre un suspect)</li>
                    <li><strong>Nécromancien</strong> (communique avec un mort ou réanime 1x/partie)</li>
                    <li><strong>Loups-Garous</strong></li>
                    <li><strong>Infect Père des Loups</strong> (si infection non utilisée)</li>
                    <li><strong>Grand Méchant Loup</strong> (si actif)</li>
                    <li><strong>Loup Blanc</strong> (une nuit sur deux, nuits paires 2, 4...)</li>
                    <li><strong>Pyromane</strong> (huiler ou brûler)</li>
                    <li><strong>Sorcière</strong> (si potions restantes)</li>
                    <li><strong>Résolution des morts & Réveil (Montreur d'Ours, Corbeau)</strong></li>
                  </ol>
                </div>
              </div>
            )}

            {tab === 'victory' && (
              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-[#edf6fa] border border-[#a3ccde] space-y-1 shadow-2xs">
                  <div className="font-bold text-[#1f506b] flex items-center gap-1.5 font-display">
                    <Trophy className="w-4 h-4" />
                    <span>Priorité 1 : Victoire de l'Ange</span>
                  </div>
                  <p className="text-[#3b596b]">
                    Si l'Ange est éliminé par un <strong>VOTE du village</strong>, il gagne immédiatement et seul la partie !
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-[#f2ece4] border border-[#c7b7a4] space-y-1 shadow-2xs">
                  <div className="font-bold text-[#443325] flex items-center gap-1.5 font-display">
                    <Trophy className="w-4 h-4" />
                    <span>Priorité 2 : Victoire du Loup Blanc</span>
                  </div>
                  <p className="text-[#594433]">
                    Le Loup Blanc l'emporte s'il est l'unique et dernier survivant de la partie.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-[#faecf0] border border-[#dfa2b5] space-y-1 shadow-2xs">
                  <div className="font-bold text-[#8c2243] flex items-center gap-1.5 font-display">
                    <Trophy className="w-4 h-4" />
                    <span>Priorité 3 : Victoire des Amoureux</span>
                  </div>
                  <p className="text-[#6d3648]">
                    Si seuls les deux Amoureux survivent jusqu'à la fin, ils remportent ensemble la partie.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-[#fcf0e7] border border-[#e3ad86] space-y-1 shadow-2xs">
                  <div className="font-bold text-[#8c3d0d] flex items-center gap-1.5 font-display">
                    <Trophy className="w-4 h-4" />
                    <span>Priorité 4 : Victoire du Pyromane</span>
                  </div>
                  <p className="text-[#633a1e]">
                    Le Pyromane triomphe s'il est le dernier survivant après avoir embrasé le village.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-[#faecea] border border-[#dea299] space-y-1 shadow-2xs">
                  <div className="font-bold text-[#871c1c] flex items-center gap-1.5 font-display">
                    <Trophy className="w-4 h-4" />
                    <span>Priorité 5 : Victoire des Loups-Garous</span>
                  </div>
                  <p className="text-[#613532]">
                    Nombre de Loups-Garous vivants &gt; nombre de villageois vivants + nombre d'Anges vivants.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-[#edf5ee] border border-[#a7cca9] space-y-1 shadow-2xs">
                  <div className="font-bold text-[#1d592b] flex items-center gap-1.5 font-display">
                    <Trophy className="w-4 h-4" />
                    <span>Priorité 6 : Victoire des Villageois</span>
                  </div>
                  <p className="text-[#305237]">
                    Tous les Loups-Garous et menaces indépendantes sont définitivement éliminés.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full mt-3 py-3 rounded-xl bg-[#eee3cf] hover:bg-[#e4d5bf] text-[#2c1d10] text-xs font-bold border border-[#cdbc9f] transition-colors shrink-0 cursor-pointer"
          >
            Fermer le Grimoire
          </button>
        </div>
      </div>
    </div>
  );
};
