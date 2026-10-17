import ange from '../icones/ange.png';
import chasseur from '../icones/chasseur.png';
import cupidon from '../icones/cupidon.png';
import grandMechantLoup from '../icones/grand_mechant_loup.png';
import loupGarou from '../icones/Loup_garou.png';
import petiteFille from '../icones/Petite_fille.png';
import pyromane from '../icones/pyromane.png';
import renard from '../icones/renard.png';
import salvateur from '../icones/salvateur.png';
import villageois from '../icones/simple_villageois.png';
import sorciere from '../icones/sorciere.png';
import voleur from '../icones/voleur.png';
import voyante from '../icones/voyante.png';
import { RoleId } from '../types/game';

export const ROLE_CUSTOM_ICONS: Partial<Record<RoleId, string>> = {
  ange,
  chasseur,
  cupidon,
  grand_mechant_loup: grandMechantLoup,
  loup_garou: loupGarou,
  petite_fille: petiteFille,
  pyromane,
  renard,
  salvateur,
  villageois,
  sorciere,
  voleur,
  voyante,
};

export function getRoleCustomIcon(roleId?: RoleId): string | null {
  if (!roleId) return null;
  return ROLE_CUSTOM_ICONS[roleId] || null;
}
