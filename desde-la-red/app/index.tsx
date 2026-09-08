import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { imageSource } from '@/data/images';
import { useApp } from '@/store/app-store';
import { colors, fonts } from '@/theme';

/** Pantalla 1 — Splash. Constelación que respira antes de entrar. */
export default function SplashRoute() {
  const router = useRouter();
  const { state, hydrated } = useApp();

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(18)).current;
  const halo = useRef(new Animated.Value(0.85)).current;
  const line = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rise, {
          toValue: 0,
          duration: 1100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(line, {
        toValue: 1,
        duration: 700,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(halo, {
          toValue: 1.06,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(halo, {
          toValue: 0.9,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [fade, rise, halo, line]);

  useEffect(() => {
    if (!hydrated) return;
    const timeout = setTimeout(() => {
      router.replace(state.user ? '/(tabs)/hoy' : '/(auth)/login');
    }, 1900);
    return () => clearTimeout(timeout);
  }, [hydrated, state.user, router]);

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: halo }] }]}>
        <Image
          source={imageSource('bg-network')}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      </Animated.View>
      <LinearGradient
        colors={['rgba(4,7,15,0.5)', 'rgba(4,7,15,0.86)', '#04070F']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[styles.center, { opacity: fade, transform: [{ translateY: rise }] }]}
      >
        <Text style={styles.overline}>Helonium</Text>
        <Text style={styles.title}>Desde{'\n'}la Red</Text>
        <Animated.View
          style={[
            styles.rule,
            {
              width: line.interpolate({ inputRange: [0, 1], outputRange: [0, 84] }),
            },
          ]}
        />
        <Text style={styles.tagline}>Enseñanza viva para el alma contemporánea</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  overline: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10.5,
    letterSpacing: 5,
    textTransform: 'uppercase',
    color: colors.cyan,
    marginBottom: 22,
  },
  title: {
    fontFamily: fonts.displayLight,
    fontSize: 58,
    lineHeight: 62,
    letterSpacing: 1,
    textAlign: 'center',
    color: colors.text,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.gold,
    marginTop: 26,
    marginBottom: 22,
  },
  tagline: {
    fontFamily: fonts.displayItalic,
    fontSize: 16,
    letterSpacing: 0.4,
    textAlign: 'center',
    color: colors.textSoft,
  },
});
