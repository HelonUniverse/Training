import React from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ImageKey } from '@/data/images';
import { screenPadding, tabBarHeight } from '@/theme';

import { CosmicBackground } from './CosmicBackground';

interface Props {
  children: React.ReactNode;
  /** Imagen de fondo atenuada. */
  image?: ImageKey;
  imageIntensity?: number;
  scroll?: boolean;
  /** Reserva espacio para la barra inferior. */
  withTabBar?: boolean;
  /** Aplica el margen horizontal estándar al contenido. */
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  /** Deja asomar el globo por el borde inferior (activado por defecto). */
  horizon?: boolean;
}

export function Screen({
  children,
  image,
  imageIntensity,
  scroll = true,
  withTabBar = false,
  padded = true,
  contentStyle,
  header,
  footer,
  horizon = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const bottomPad = (withTabBar ? tabBarHeight + insets.bottom + 18 : insets.bottom + 28) + 8;

  const inner = (
    <View style={[padded && styles.padded, contentStyle]}>{children}</View>
  );

  return (
    <CosmicBackground image={image} intensity={imageIntensity} horizon={horizon}>
      {header}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {inner}
        </ScrollView>
      ) : (
        <View style={[styles.flex, { paddingBottom: bottomPad }]}>{inner}</View>
      )}
      {footer}
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: screenPadding },
});
