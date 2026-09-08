import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { NetworkPost } from '@/data/types';
import * as haptics from '@/lib/haptics';
import { colors, fonts, radius } from '@/theme';

import { Avatar } from './Avatar';

interface Props {
  post: NetworkPost;
  resonated?: boolean;
  onResonate: () => void;
}

export function PostCard({ post, resonated, onResonate }: Props) {
  const count = post.resonances + (resonated ? 1 : 0);
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar initials={post.authorInitials} accent={post.accent} size={42} />
        <View style={styles.headerBody}>
          <Text style={styles.name}>{post.authorName}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.role}>{post.role}</Text>
            <View style={styles.dot} />
            <Text style={styles.time}>{post.timeAgo}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.text}>{post.text}</Text>

      {post.circleName ? (
        <View style={styles.circleTag}>
          <Feather name="circle" size={10} color={colors.cyan} />
          <Text style={styles.circleText}>{post.circleName}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: !!resonated }}
          accessibilityLabel="Resonar con esta publicación"
          onPress={() => {
            haptics.tap();
            onResonate();
          }}
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Feather
            name="feather"
            size={14}
            color={resonated ? colors.glow : colors.textMuted}
          />
          <Text style={[styles.actionText, resonated && { color: colors.glow }]}>{count}</Text>
        </Pressable>

        <View style={styles.action}>
          <Feather name="message-circle" size={14} color={colors.textMuted} />
          <Text style={styles.actionText}>{post.replies}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerBody: { flex: 1, gap: 3 },
  name: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.text,
    letterSpacing: 0.2,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  role: { fontFamily: fonts.body, fontSize: 11, color: colors.cyan },
  time: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textMuted },
  text: {
    fontFamily: fonts.bodyLight,
    fontSize: 15,
    lineHeight: 24,
    color: colors.textSoft,
    marginTop: 14,
  },
  circleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.cyanGlow,
  },
  circleText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10.5,
    letterSpacing: 0.6,
    color: colors.cyan,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  actionText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textMuted },
});
