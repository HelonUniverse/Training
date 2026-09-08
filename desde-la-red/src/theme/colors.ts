/**
 * Paleta oficial de Desde la Red, tomada del key art de marca:
 * espacio azul noche, globo de red en azul eléctrico, nodos y líneas
 * en cyan brillante y destellos blanco-hielo.
 */
export const colors = {
  // Fondos — el negro azulado del espacio profundo
  night: '#030814',
  nightDeep: '#01050E',
  nightSoft: '#061024',
  nightLift: '#0A1B38',

  // Superficies (tarjetas oscuras con bordes finos)
  surface: 'rgba(255, 255, 255, 0.045)',
  surfaceStrong: 'rgba(255, 255, 255, 0.075)',
  surfaceSunken: 'rgba(1, 6, 18, 0.6)',
  border: 'rgba(79, 201, 248, 0.18)',
  borderSoft: 'rgba(255, 255, 255, 0.08)',
  /** Borde de énfasis: el cyan encendido de los nodos. */
  borderGlow: 'rgba(143, 227, 255, 0.42)',

  // Acentos
  cyan: '#4FC9F8',
  cyanDeep: '#1C7FD6',
  cyanGlow: 'rgba(79, 201, 248, 0.16)',
  /** Azul eléctrico de las líneas de la malla. */
  electric: '#2E7DF0',
  /** Blanco-hielo de los nodos encendidos: el acento de mayor jerarquía. */
  glow: '#BFE9FF',
  glowSoft: 'rgba(191, 233, 255, 0.14)',

  // Texto
  text: '#F2F8FC',
  textSoft: 'rgba(219, 236, 248, 0.74)',
  textMuted: 'rgba(186, 212, 232, 0.48)',
  textOnLight: '#03101E',

  // Estados
  live: '#FF5C6E',
  success: '#5FE3C0',

  overlay: 'rgba(2, 7, 18, 0.72)',
  transparent: 'transparent',
} as const;

/** Degradados reutilizables (siempre tuplas de al menos 2 colores). */
export const gradients = {
  screen: ['#030814', '#061024', '#030814'] as const,
  card: ['rgba(79,201,248,0.10)', 'rgba(255,255,255,0.02)'] as const,
  /** Degradado principal de marca: hielo → cyan → azul eléctrico. */
  brand: ['#DCF4FF', '#6FD6FA', '#1C7FD6'] as const,
  cyan: ['#8FE3FF', '#4FC9F8', '#1C7FD6'] as const,
  electric: ['#5AA6FF', '#2E7DF0', '#1348A8'] as const,
  scrim: ['transparent', 'rgba(3,8,20,0.55)', 'rgba(3,8,20,0.96)'] as const,
  scrimSoft: ['transparent', 'rgba(3,8,20,0.82)'] as const,
  topFade: ['rgba(3,8,20,0.92)', 'rgba(3,8,20,0.0)'] as const,
  tabBar: ['rgba(5,13,28,0.86)', 'rgba(3,8,20,0.98)'] as const,
} as const;
