import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import { colors, fontSize, radius, spacing } from '@/constants/theme';

interface LevelUpToastProps {
  level: number;
  onFinish?: () => void;
}

export function LevelUpToast({ level, onFinish }: LevelUpToastProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.6);
  const badgeScale = useSharedValue(0.8);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 220 });
    scale.value = withSpring(1, { damping: 11, stiffness: 200 });
    badgeScale.value = withDelay(
      280,
      withSequence(
        withSpring(1.25, { damping: 7 }),
        withSpring(1, { damping: 14 }),
      ),
    );

    const hideAt = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 280 });
      scale.value = withTiming(0.85, { duration: 280 });
      setTimeout(() => onFinish?.(), 290);
    }, 2300);

    return () => clearTimeout(hideAt);
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]} pointerEvents="none">
      <Animated.View style={[styles.card, cardStyle]}>
        <Text style={styles.lightning}>⚡</Text>
        <Text style={styles.title}>LEVEL UP!</Text>
        <Animated.View style={[styles.badge, badgeStyle]}>
          <Text style={styles.badgeText}>NV. {level}</Text>
        </Animated.View>
        <Text style={styles.sub}>Você evoluiu. Continue assim.</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    zIndex: 999,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 2,
    borderColor: colors.levelGold,
    shadowColor: colors.levelGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 28,
    elevation: 18,
    minWidth: 240,
  },
  lightning: {
    fontSize: 52,
  },
  title: {
    color: colors.levelGold,
    fontSize: fontSize['2xl'],
    fontWeight: '900',
    letterSpacing: 3,
  },
  badge: {
    backgroundColor: colors.levelGold,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  badgeText: {
    color: colors.bgPrimary,
    fontSize: fontSize.xl,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sub: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});
