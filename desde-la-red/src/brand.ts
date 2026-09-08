import { ImageSourcePropType } from 'react-native';

/**
 * Interruptores de los assets oficiales de marca.
 *
 * Pon los archivos reales en `assets/brand/` (ver su README) y cambia estos
 * valores a `true`. Mientras estén en `false` la app usa la reconstrucción
 * provisional: el logotipo dibujado en SVG y el globo generado por código.
 */
export const brand = {
  useOfficialLogo: false,
  useOfficialKeyArt: false,
} as const;

export const brandAssets = {
  logo: require('../assets/brand/logo.png') as ImageSourcePropType,
  keyart: require('../assets/brand/keyart.png') as ImageSourcePropType,
};
