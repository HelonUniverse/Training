import { Platform, ViewStyle } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

/** Margen horizontal común de todas las pantallas. */
export const screenPadding = 22;

/** Altura de la barra inferior sin el safe-area inset. */
export const tabBarHeight = 64;

export const shadows: Record<'soft' | 'lifted' | 'glow', ViewStyle> = {
  soft: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.45,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
    },
    default: { elevation: 6 },
  }) as ViewStyle,
  lifted: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.6,
      shadowRadius: 30,
      shadowOffset: { width: 0, height: 18 },
    },
    default: { elevation: 12 },
  }) as ViewStyle,
  glow: Platform.select({
    ios: {
      shadowColor: '#6FD8E6',
      shadowOpacity: 0.35,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 8 },
    },
    default: { elevation: 8 },
  }) as ViewStyle,
};
