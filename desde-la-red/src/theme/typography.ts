import { TextStyle } from 'react-native';

import { colors } from './colors';

/**
 * Tipografía del key art: Exo 2 para titulares (geométrica, ancha y
 * tecnológica, en la línea del logotipo) e Inter para la interfaz.
 */
export const fonts = {
  display: 'Exo2_500Medium',
  displayLight: 'Exo2_300Light',
  displaySemi: 'Exo2_600SemiBold',
  displayBold: 'Exo2_700Bold',
  displayItalic: 'Exo2_300Light_Italic',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyLight: 'Inter_300Light',
} as const;

type Variant =
  | 'hero'
  | 'display'
  | 'title'
  | 'sectionTitle'
  | 'cardTitle'
  | 'serifBody'
  | 'body'
  | 'bodySmall'
  | 'label'
  | 'overline'
  | 'caption'
  | 'button';

export const type: Record<Variant, TextStyle> = {
  hero: {
    fontFamily: fonts.displayLight,
    fontSize: 40,
    lineHeight: 47,
    letterSpacing: 0.4,
    color: colors.text,
  },
  display: {
    fontFamily: fonts.displayLight,
    fontSize: 31,
    lineHeight: 39,
    letterSpacing: 0.3,
    color: colors.text,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 25,
    lineHeight: 32,
    letterSpacing: 0.3,
    color: colors.text,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 21,
    lineHeight: 27,
    letterSpacing: 0.4,
    color: colors.text,
  },
  cardTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0.25,
    color: colors.text,
  },
  /** Cuerpo de lectura: Exo 2 Light, generoso y aireado. */
  serifBody: {
    fontFamily: fonts.displayLight,
    fontSize: 17,
    lineHeight: 29,
    letterSpacing: 0.2,
    color: colors.textSoft,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14.5,
    lineHeight: 22,
    color: colors.textSoft,
  },
  bodySmall: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSoft,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
  overline: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: colors.cyan,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.textMuted,
  },
  button: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.4,
  },
};
