import React from 'react';
import {
  Swords,
  Skull,
  Ghost,
  User,
  Eye,
  Binoculars,
  ScanSearch,
  FlaskConical,
  ShieldPlus,
  Feather,
  Target,
  Heart,
  VenetianMask,
  Flame,
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
    default:
      return <HelpCircle {...iconProps} />;
  }
};
