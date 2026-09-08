import { Feather } from '@expo/vector-icons';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radius, shadows } from '@/theme';

interface ToastMessage {
  text: string;
  icon?: keyof typeof Feather.glyphMap;
}

const ToastContext = createContext<(message: ToastMessage | string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(24)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback(
    (next: ToastMessage | string) => {
      setMessage(typeof next === 'string' ? { text: next } : next);
      if (timer.current) clearTimeout(timer.current);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translate, { toValue: 0, useNativeDriver: true, damping: 16 }),
      ]).start();
      timer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }),
          Animated.timing(translate, { toValue: 24, duration: 260, useNativeDriver: true }),
        ]).start(() => setMessage(null));
      }, 2200);
    },
    [opacity, translate],
  );

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wrap,
            shadows.lifted,
            { bottom: insets.bottom + 96, opacity, transform: [{ translateY: translate }] },
          ]}
        >
          <View style={styles.inner}>
            <Feather name={message.icon ?? 'check'} size={14} color={colors.gold} />
            <Text style={styles.text}>{message.text}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderGold,
    backgroundColor: 'rgba(9,17,32,0.96)',
  },
  text: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 0.2,
    color: colors.text,
  },
});
