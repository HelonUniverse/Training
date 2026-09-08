/**
 * Paleta oficial de Desde la Red.
 * Azul noche / cósmico como base, cyan elegante como acento vivo,
 * dorado cálido como acento sagrado.
 */
export const colors = {
  // Fondos
  night: '#04070F',
  nightDeep: '#02040A',
  nightSoft: '#081326',
  nightLift: '#0B1B33',

  // Superficies (tarjetas oscuras con bordes finos)
  surface: 'rgba(255, 255, 255, 0.045)',
  surfaceStrong: 'rgba(255, 255, 255, 0.075)',
  surfaceSunken: 'rgba(2, 6, 16, 0.55)',
  border: 'rgba(127, 211, 224, 0.16)',
  borderSoft: 'rgba(255, 255, 255, 0.08)',
  borderGold: 'rgba(231, 194, 125, 0.32)',

  // Acentos
  cyan: '#6FD8E6',
  cyanDeep: '#2C8FA8',
  cyanGlow: 'rgba(111, 216, 230, 0.18)',
  gold: '#E7C27D',
  goldDeep: '#B98F45',
  goldGlow: 'rgba(231, 194, 125, 0.16)',
  violet: '#8E8DE0',

  // Texto
  text: '#F4F8FB',
  textSoft: 'rgba(226, 240, 247, 0.74)',
  textMuted: 'rgba(198, 218, 232, 0.48)',
  textOnLight: '#04070F',

  // Estados
  live: '#FF6B6B',
  success: '#79D6A8',

  overlay: 'rgba(3, 6, 14, 0.72)',
  transparent: 'transparent',
} as const;

/** Degradados reutilizables (siempre tuplas de al menos 2 colores). */
export const gradients = {
  screen: ['#04070F', '#071120', '#04070F'] as const,
  card: ['rgba(111,216,230,0.10)', 'rgba(255,255,255,0.02)'] as const,
  gold: ['#F0D8A4', '#E7C27D', '#C9A05B'] as const,
  cyan: ['#8FE6F2', '#6FD8E6', '#2C8FA8'] as const,
  scrim: ['transparent', 'rgba(4,7,15,0.55)', 'rgba(4,7,15,0.96)'] as const,
  scrimSoft: ['transparent', 'rgba(4,7,15,0.82)'] as const,
  topFade: ['rgba(4,7,15,0.92)', 'rgba(4,7,15,0.0)'] as const,
  tabBar: ['rgba(6,11,22,0.86)', 'rgba(4,7,15,0.98)'] as const,
} as const;
