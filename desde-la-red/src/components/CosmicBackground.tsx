import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { ImageKey, imageSource } from '@/data/images';
import { colors, gradients } from '@/theme';

interface Props {
  image?: ImageKey;
  /** Opacidad de la imagen de fondo (0-1). */
  intensity?: number;
  /**
   * Deja asomar el globo de la Red por el borde inferior, como en el key art.
   * Es el fondo por defecto de la app: la marca siempre está presente.
   */
  horizon?: boolean;
  children?: React.ReactNode;
  style?: ViewStyle;
}

/** Fondo de espacio profundo compartido por toda la app. */
export function CosmicBackground({
  image,
  intensity = 0.5,
  horizon = false,
  children,
  style,
}: Props) {
  return (
    <View style={[styles.root, style]}>
      <LinearGradient colors={gradients.screen} style={StyleSheet.absoluteFill} />

      {horizon && !image ? (
        <View style={styles.horizon} pointerEvents="none">
          <Image
            source={imageSource('bg-auth')}
            style={[StyleSheet.absoluteFill, { opacity: 0.42 }]}
            contentFit="cover"
            contentPosition="bottom"
          />
          <LinearGradient
            colors={['#01050D', 'rgba(1,5,13,0.82)', 'rgba(1,5,13,0.45)']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>
      ) : null}

      {image ? (
        <>
          <Image
            source={imageSource(image)}
            style={[StyleSheet.absoluteFill, { opacity: intensity }]}
            contentFit="cover"
            transition={420}
          />
          <LinearGradient
            colors={['rgba(1,5,13,0.25)', 'rgba(1,5,13,0.72)', 'rgba(1,5,13,0.97)']}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : null}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.night,
  },
  /** El globo ocupa el tercio inferior y se funde con el fondo. */
  horizon: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '34%',
  },
});
