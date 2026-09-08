import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient as SvgGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { colors, fonts } from '@/theme';

/**
 * Nodos y enlaces que viven dentro de la contraforma de la "D",
 * tal como en el logotipo de marca.
 */
const NODES: [number, number, number][] = [
  // x, y, radio
  [22, 30, 4.2],
  [22, 52, 4.2],
  [22, 74, 4.2],
  [46, 24, 3.4],
  [48, 44, 5.2],
  [44, 66, 3.4],
  [64, 34, 3.2],
  [66, 56, 3.8],
  [58, 78, 3.0],
];

const LINKS: [number, number][] = [
  [0, 3],
  [0, 4],
  [1, 4],
  [2, 4],
  [2, 5],
  [3, 4],
  [3, 6],
  [4, 5],
  [4, 6],
  [4, 7],
  [5, 7],
  [5, 8],
  [6, 7],
  [7, 8],
];

interface MarkProps {
  size: number;
}

/** La "D" de red: arco luminoso más el racimo de nodos. */
export function BrandMark({ size }: MarkProps) {
  const scale = size / 100;
  return (
    <Svg width={92 * scale} height={size} viewBox="0 0 92 100">
      <Defs>
        <SvgGradient id="markStroke" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.45" stopColor="#8FE3FF" />
          <Stop offset="1" stopColor="#1C7FD6" />
        </SvgGradient>
      </Defs>

      {/* Arco de la D */}
      <Path
        d="M30 6 H44 A44 44 0 0 1 44 94 H30"
        stroke="url(#markStroke)"
        strokeWidth={11}
        strokeLinecap="round"
        fill="none"
      />
      {/* Halo suave del arco */}
      <Path
        d="M30 6 H44 A44 44 0 0 1 44 94 H30"
        stroke="#4FC9F8"
        strokeWidth={20}
        strokeLinecap="round"
        strokeOpacity={0.18}
        fill="none"
      />

      <G>
        {LINKS.map(([a, b], i) => (
          <Line
            key={i}
            x1={NODES[a][0]}
            y1={NODES[a][1]}
            x2={NODES[b][0]}
            y2={NODES[b][1]}
            stroke="#7FD9FA"
            strokeWidth={1.1}
            strokeOpacity={0.75}
          />
        ))}
        {NODES.map(([x, y, r], i) => (
          <G key={i}>
            <Circle cx={x} cy={y} r={r * 2.4} fill="#4FC9F8" fillOpacity={0.18} />
            <Circle cx={x} cy={y} r={r} fill="#FFFFFF" />
          </G>
        ))}
      </G>
    </Svg>
  );
}

interface Props {
  /** Altura de la "D". El resto del logotipo escala con ella. */
  size?: number;
  tagline?: string;
  align?: 'left' | 'center';
  style?: ViewStyle;
}

/** Logotipo completo de Desde la Red. */
export function BrandLogo({ size = 76, tagline, align = 'center', style }: Props) {
  const s = size / 76;
  return (
    <View style={[align === 'center' ? styles.center : styles.left, style]}>
      <View style={styles.rowOne}>
        <BrandMark size={size} />
        <Text style={[styles.word, { fontSize: 54 * s, marginLeft: -6 * s }]}>esde</Text>
      </View>
      <View style={[styles.rowTwo, { marginTop: -6 * s }]}>
        <Text style={[styles.small, { fontSize: 32 * s }]}>la </Text>
        <View>
          <Text style={[styles.word, { fontSize: 58 * s }]}>Red</Text>
          {/* Antena y nodo encendido sobre la "d", como en el logotipo. */}
          <View
            style={[
              styles.antenna,
              { right: 6 * s, top: -9 * s, height: 13 * s, width: Math.max(1, 1.4 * s) },
            ]}
          />
          <View
            style={[
              styles.node,
              {
                right: 2.5 * s,
                top: -15 * s,
                width: 9 * s,
                height: 9 * s,
                borderRadius: 5 * s,
              },
            ]}
          />
        </View>
      </View>
      {tagline ? (
        <Text style={[styles.tagline, { fontSize: 15 * s, marginTop: 14 * s }]}>{tagline}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  left: { alignItems: 'flex-start' },
  rowOne: { flexDirection: 'row', alignItems: 'center' },
  rowTwo: { flexDirection: 'row', alignItems: 'baseline' },
  word: {
    fontFamily: fonts.displaySemi,
    color: '#EAF7FF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(79,201,248,0.75)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
    includeFontPadding: false,
  },
  small: {
    fontFamily: fonts.display,
    color: '#DCEFFB',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(79,201,248,0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
    includeFontPadding: false,
  },
  antenna: {
    position: 'absolute',
    backgroundColor: '#8FE3FF',
    opacity: 0.9,
  },
  node: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    shadowColor: '#4FC9F8',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  tagline: {
    fontFamily: fonts.body,
    color: colors.textSoft,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
