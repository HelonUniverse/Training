import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { ImageKey, imageSource } from '@/data/images';
import { colors, gradients } from '@/theme';

interface Props {
  image?: ImageKey;
  /** Opacidad de la imagen de fondo (0-1). */
  intensity?: number;
  children?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Fondo azul noche/cósmico compartido por toda la app. Opcionalmente
 * superpone una imagen cinematográfica muy atenuada.
 */
export function CosmicBackground({ image, intensity = 0.5, children, style }: Props) {
  return (
    <View style={[styles.root, style]}>
      <LinearGradient colors={gradients.screen} style={StyleSheet.absoluteFill} />
      {image ? (
        <>
          <Image
            source={imageSource(image)}
            style={[StyleSheet.absoluteFill, { opacity: intensity }]}
            contentFit="cover"
            transition={420}
          />
          <LinearGradient
            colors={['rgba(3,8,20,0.25)', 'rgba(3,8,20,0.72)', 'rgba(3,8,20,0.97)']}
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
});
