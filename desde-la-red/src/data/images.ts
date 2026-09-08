import { ImageSourcePropType } from 'react-native';

/**
 * Los `require` deben ser estáticos para que Metro los empaquete, así que
 * todas las imágenes viven en este registro y el resto de la app las
 * referencia por clave.
 */
export const images = {
  'teaching-silence': require('../../assets/images/teaching-silence.png'),
  'teaching-light': require('../../assets/images/teaching-light.png'),
  'teaching-water': require('../../assets/images/teaching-water.png'),
  'teaching-threshold': require('../../assets/images/teaching-threshold.png'),
  'teaching-roots': require('../../assets/images/teaching-roots.png'),
  'teaching-breath': require('../../assets/images/teaching-breath.png'),
  'teaching-fire': require('../../assets/images/teaching-fire.png'),
  'teaching-return': require('../../assets/images/teaching-return.png'),
  'live-ceremony': require('../../assets/images/live-ceremony.png'),
  'live-meditation': require('../../assets/images/live-meditation.png'),
  'circle-luna': require('../../assets/images/circle-luna.png'),
  'circle-fuego': require('../../assets/images/circle-fuego.png'),
  'circle-raiz': require('../../assets/images/circle-raiz.png'),
  'bg-auth': require('../../assets/images/bg-auth.png'),
  'bg-path': require('../../assets/images/bg-path.png'),
  'bg-network': require('../../assets/images/bg-network.png'),
} satisfies Record<string, ImageSourcePropType>;

export type ImageKey = keyof typeof images;

export const imageSource = (key: ImageKey): ImageSourcePropType => images[key];
