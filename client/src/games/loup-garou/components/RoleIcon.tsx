import React from 'react';
import {
  Swords,
  Skull,
  Biohazard,
  Ghost,
  User,
  Eye,
  Binoculars,
  ScanSearch,
  FlaskConical,
  ShieldPlus,
  Crown,
  Bird,
  Trees,
  Smile,
  PawPrint,
  Wand2,
  MoonStar,
  Feather,
  Target,
  Heart,
  VenetianMask,
  Flame,
  Dog,
  HelpCircle,
} from 'lucide-react';
import { RoleId } from '../types/game';

interface RoleIconProps {
  roleId: RoleId;
  className?: string;
  size?: number;
}

export const RoleIcon: React.FC<RoleIconProps> = ({ roleId, className = 'w-5 h-5', size }) => {
  const iconProps = { className, size };

  switch (roleId) {
    case 'loup_garou':
      return <Swords {...iconProps} />;
    case 'grand_mechant_loup':
      return <Skull {...iconProps} />;
    case 'infect_pere_des_loups':
      return <Biohazard {...iconProps} />;
    case 'loup_blanc':
      return <Ghost {...iconProps} />;
    case 'villageois':
      return <User {...iconProps} />;
    case 'voyante':
      return <Eye {...iconProps} />;
    case 'petite_fille':
      return <Binoculars {...iconProps} />;
    case 'renard':
      return <ScanSearch {...iconProps} />;
    case 'sorciere':
      return <FlaskConical {...iconProps} />;
    case 'salvateur':
      return <ShieldPlus {...iconProps} />;
    case 'ancien':
      return <Crown {...iconProps} />;
    case 'corbeau':
      return <Bird {...iconProps} />;
    case 'enfant_sauvage':
      return <Trees {...iconProps} />;
    case 'idiot_du_village':
      return <Smile {...iconProps} />;
    case 'montreur_ours':
      return <PawPrint {...iconProps} />;
    case 'necromancien':
      return <Wand2 {...iconProps} />;
    case 'insomniaque':
      return <MoonStar {...iconProps} />;
    case 'ange':
      return <Feather {...iconProps} />;
    case 'chasseur':
      return <Target {...iconProps} />;
    case 'cupidon':
      return <Heart {...iconProps} />;
    case 'voleur':
      return <VenetianMask {...iconProps} />;
    case 'pyromane':
      return <Flame {...iconProps} />;
    case 'chien_loup':
      return <Dog {...iconProps} />;
    default:
      return <HelpCircle {...iconProps} />;
  }
};

