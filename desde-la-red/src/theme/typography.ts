import { TextStyle } from 'react-native';

import { colors } from './colors';

/** Familias tipográficas cargadas en app/_layout.tsx */
export const fonts = {
  display: 'CormorantGaramond_500Medium',
  displayLight: 'CormorantGaramond_300Light',
  displaySemi: 'CormorantGaramond_600SemiBold',
  displayItalic: 'CormorantGaramond_400Regular_Italic',
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
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: 0.3,
    color: colors.text,
  },
  display: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: 0.2,
    color: colors.text,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 27,
    lineHeight: 34,
    letterSpacing: 0.2,
    color: colors.text,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0.3,
    color: colors.text,
  },
  cardTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: 0.2,
    color: colors.text,
  },
  serifBody: {
    fontFamily: fonts.displayLight,
    fontSize: 19,
    lineHeight: 31,
    letterSpacing: 0.15,
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
