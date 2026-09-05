import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, isLocale } from './routing';

/**
 * Locale resolution. The app is not locale-prefixed in its URLs; the active
 * locale comes from a cookie (set by the Settings language switcher) and falls
 * back to the default. profiles.locale is the durable store - the cookie is the
 * fast path so a Server Component does not need a database read to pick strings.
 */
export const LOCALE_COOKIE = 'hos-locale';

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
