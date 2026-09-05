export const locales = ['en-US', 'es-US'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en-US';

export const localeNames: Record<Locale, string> = {
  'en-US': 'English',
  'es-US': 'Español',
};

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
