import React from 'react';
import * as LucideIcons from 'lucide-react';
import { LucideProps } from 'lucide-react';

interface GamificationIconProps extends LucideProps {
  /** The icon name (e.g. 'star', 'trophy') or an emoji */
  name: string | null;
  /** Fallback icon if the name is not found */
  fallback?: React.ReactNode;
}

/**
 * A component that renders a Lucide icon based on a string name,
 * or falls back to rendering the string as-is if it's an emoji.
 */
const GamificationIcon: React.FC<GamificationIconProps> = ({ name, fallback, ...props }) => {
  if (!name) return fallback ? <>{fallback}</> : null;

  // 0. Emoji mapping for backward compatibility with emoji-based data
  const EMOJI_MAP: Record<string, string> = {
    '⭐': 'Star',
    '🏅': 'Medal',
    '🎖️': 'Medal',
    '🏆': 'Trophy',
    '👑': 'Crown',
    '✨': 'Sparkles',
    '🔥': 'Flame',
    '📚': 'BookOpen',
    '🎓': 'GraduationCap',
    '🎯': 'Target',
    '🚀': 'Rocket',
    '⚡': 'Zap',
    '💎': 'Gem',
    '🎨': 'Palette',
    '🧪': 'Beaker',
    '🧬': 'Dna',
    '🌍': 'Globe',
    '📍': 'MapPin',
  };

  const resolvedName = EMOJI_MAP[name] || name;

  // 1. Try to find the Lucide icon
  // Convert kebab-case (egg-bowl) or snake_case to PascalCase (EggBowl)
  const pascalName = resolvedName
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  const IconComponent = (LucideIcons as any)[pascalName] || (LucideIcons as any)[resolvedName];

  if (IconComponent) {
    return <IconComponent {...props} />;
  }

  // 2. If not a Lucide icon, use a default fallback icon (no raw emojis allowed)
  return <LucideIcons.Medal {...props} />;

  // 3. Last fallback
  return fallback ? <>{fallback}</> : null;
};

export default GamificationIcon;
