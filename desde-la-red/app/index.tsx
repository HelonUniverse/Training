import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/BrandLogo';
import { imageSource } from '@/data/images';
import { useApp } from '@/store/app-store';
import { colors, fonts } from '@/theme';

/** Pantalla 1 — Splash. El globo de la Red asciende y la marca aparece. */
export default function SplashRoute() {
  const router = useRouter();
  const { state, hydrated } = useApp();

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(20)).current;
  const globeRise = useRef(new Animated.Value(46)).current;
  const globeFade = useRef(new Animated.Value(0)).current;
  const line = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(globeFade, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(globeRise, {
        toValue: 0,
        duration: 2000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(260),
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rise, {
          toValue: 0,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(line, {
        toValue: 1,
        duration: 620,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.03,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.98,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [fade, rise, globeFade, globeRise, line, pulse]);

  useEffect(() => {
    if (!hydrated) return;
    const timeout = setTimeout(() => {
      router.replace(state.user ? '/(tabs)/hoy' : '/(auth)/login');
    }, 2200);
    return () => clearTimeout(timeout);
  }, [hydrated, state.user, router]);

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: globeFade, transform: [{ translateY: globeRise }, { scale: pulse }] },
        ]}
      >
        <Image
          source={imageSource('bg-auth')}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      </Animated.View>
      <LinearGradient
        colors={['rgba(3,8,20,0.55)', 'rgba(3,8,20,0.15)', 'rgba(3,8,20,0.0)']}
        style={styles.topScrim}
        pointerEvents="none"
      />

      <Animated.View style={[styles.brand, { opacity: fade, transform: [{ translateY: rise }] }]}>
        <Text style={styles.overline}>Helonium</Text>
        <BrandLogo size={82} />
        <Animated.View
          style={[
            styles.rule,
            { width: line.interpolate({ inputRange: [0, 1], outputRange: [0, 108] }) },
          ]}
        />
        <Text style={styles.tagline}>Nos daremos a conocer muy pronto</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: '52%' },
  brand: {
    position: 'absolute',
    top: '16%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  overline: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10.5,
    letterSpacing: 5,
    textTransform: 'uppercase',
    color: colors.cyan,
    marginBottom: 20,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.cyan,
    marginTop: 24,
    marginBottom: 18,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 15,
    letterSpacing: 0.4,
    textAlign: 'center',
    color: colors.textSoft,
  },
});
