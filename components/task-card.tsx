import { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Pencil, Trash2, Repeat2, Check, Play } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  runOnJS,
  FadeInDown,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { colors, fontSize, radius, spacing, difficultyColors, difficultyLabels } from '@/constants/theme';
import { getXPByDifficulty } from '@/lib/gamification';
import type { TaskWithCompletion, Difficulty } from '@/types/database';

interface TaskCardProps {
  task: TaskWithCompletion;
  onComplete: (task: TaskWithCompletion) => void;
  onEdit: (task: TaskWithCompletion) => void;
  onDelete: (task: TaskWithCompletion) => void;
  isCompleting: boolean;
  index?: number;
}

const SWIPE_THRESHOLD = 60;
const ACTION_WIDTH = 130;

export function TaskCard({ task, onComplete, onEdit, onDelete, isCompleting, index = 0 }: TaskCardProps) {
  const [showXP, setShowXP] = useState(false);
  const xpOpacity = useSharedValue(0);
  const xpTranslateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const btnScale = useSharedValue(1);

  const diffColor = difficultyColors[task.difficulty] ?? colors.textMuted;
  const diffLabel = difficultyLabels[task.difficulty] ?? task.difficulty;
  const xpReward = getXPByDifficulty(task.difficulty as Difficulty);
  const isHabit = task.type === 'daily';

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      if (e.translationX < 0) {
        translateX.value = Math.max(e.translationX, -ACTION_WIDTH);
      } else {
        translateX.value = Math.min(e.translationX, ACTION_WIDTH);
      }
    })
    .onEnd(() => {
      if (translateX.value > -SWIPE_THRESHOLD && translateX.value < SWIPE_THRESHOLD) {
        translateX.value = withSpring(0);
      }
    });

  const closeSwipe = useCallback(() => {
    translateX.value = withSpring(0);
  }, [translateX]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
  }));

  const leftActionOpacity = useAnimatedStyle(() => ({
    opacity: translateX.value > 20 ? 1 : 0,
  }));

  const rightActionOpacity = useAnimatedStyle(() => ({
    opacity: translateX.value < -20 ? 1 : 0,
  }));

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const handleComplete = useCallback(() => {
    if (task.completed_today || isCompleting) return;
    closeSwipe();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setShowXP(true);
    xpOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(1, { duration: 800 }),
      withTiming(0, { duration: 350 }),
    );
    xpTranslateY.value = withSequence(
      withTiming(0, { duration: 0 }),
      withTiming(-72, { duration: 1300 }),
    );
    scale.value = withSequence(withSpring(0.95), withSpring(1, { damping: 8 }));
    btnScale.value = withSequence(
      withSpring(0.6, { damping: 8 }),
      withSpring(1.3, { damping: 8 }),
      withSpring(1, { damping: 12 }),
    );
    setTimeout(() => runOnJS(setShowXP)(false), 1450);

    onComplete(task);
  }, [task, isCompleting, onComplete, closeSwipe, xpOpacity, xpTranslateY, scale, btnScale]);

  const handleEdit = useCallback(() => {
    closeSwipe();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEdit(task);
  }, [task, onEdit, closeSwipe]);

  const handleDelete = useCallback(() => {
    closeSwipe();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Excluir tarefa',
      `"${task.title}" será removida e o XP ganho será devolvido.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => onDelete(task) },
      ],
    );
  }, [task, onDelete, closeSwipe]);

  const xpAnimStyle = useAnimatedStyle(() => ({
    opacity: xpOpacity.value,
    transform: [{ translateY: xpTranslateY.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify().damping(16)}
      style={styles.wrapper}
    >
      {/* Left action */}
      <Animated.View style={[styles.actionLeft, leftActionOpacity]}>
        <Pressable style={styles.editAction} onPress={handleEdit}>
          <Pencil size={22} color={colors.accent} />
          <Text style={styles.actionLabel}>Editar</Text>
        </Pressable>
      </Animated.View>

      {/* Right action */}
      <Animated.View style={[styles.actionRight, rightActionOpacity]}>
        <Pressable style={styles.deleteAction} onPress={handleDelete}>
          <Trash2 size={22} color={colors.danger} />
          <Text style={styles.actionLabelDanger}>Excluir</Text>
        </Pressable>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, cardStyle, task.completed_today && styles.cardDone]}>
          {/* Difficulty accent strip */}
          <View style={[styles.diffStrip, { backgroundColor: diffColor }]} />

          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.titleRow}>
                {isHabit && <Repeat2 size={13} color={colors.textDim} />}
                <Text
                  style={[styles.title, task.completed_today && styles.titleDone]}
                  numberOfLines={2}
                >
                  {task.title}
                </Text>
              </View>
              <View style={[styles.diffBadge, { backgroundColor: diffColor + '18', borderColor: diffColor + '50' }]}>
                <Text style={[styles.diffText, { color: diffColor }]}>{diffLabel}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.xpLabel, task.completed_today && styles.xpDone]}>
                +{xpReward} XP
              </Text>
              {isHabit && (task.month_completions ?? 0) > 0 && (
                <Text style={styles.monthCount}>
                  {task.month_completions}× este mês
                </Text>
              )}
              {task.completed_today && (
                <Text style={styles.doneTag}>✓ feito hoje</Text>
              )}
            </View>
          </View>

          <Animated.View style={btnStyle}>
            <Pressable
              style={[
                styles.completeBtn,
                { shadowColor: diffColor },
                task.completed_today && styles.completedBtn,
              ]}
              onPress={handleComplete}
              onPressIn={() => {
                if (!task.completed_today) {
                  btnScale.value = withSpring(0.88, { damping: 12 });
                }
              }}
              onPressOut={() => {
                if (!task.completed_today) {
                  btnScale.value = withSpring(1, { damping: 10 });
                }
              }}
              disabled={task.completed_today || isCompleting}
            >
              {task.completed_today
                ? <Check size={20} color={colors.success} />
                : <Play size={18} color="#FFF" fill="#FFF" />}
            </Pressable>
          </Animated.View>

          {showXP && (
            <Animated.View style={[styles.xpPopup, xpAnimStyle]} pointerEvents="none">
              <Text style={[styles.xpPopupText, { color: diffColor, textShadowColor: diffColor }]}>
                +{xpReward} XP
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  actionLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: ACTION_WIDTH,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: spacing.md,
  },
  actionRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: ACTION_WIDTH,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: spacing.md,
  },
  editAction: { alignItems: 'center', gap: 2 },
  deleteAction: { alignItems: 'center', gap: 2 },
  actionLabel: { color: colors.accent, fontSize: fontSize.xs, fontWeight: '700' },
  actionLabelDanger: { color: colors.danger, fontSize: fontSize.xs, fontWeight: '700' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  cardDone: {
    opacity: 0.65,
  },
  diffStrip: {
    width: 5,
    alignSelf: 'stretch',
    opacity: 1,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
    flex: 1,
    letterSpacing: -0.2,
  },
  titleDone: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  diffBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  diffText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  xpLabel: {
    color: colors.accentGlow,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  xpDone: { color: colors.textDim },
  monthCount: { color: colors.textMuted, fontSize: fontSize.xs },
  doneTag: { color: colors.success, fontSize: fontSize.xs, fontWeight: '600' },
  completeBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginLeft: spacing.xs,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 4,
  },
  completedBtn: {
    backgroundColor: colors.success + '20',
    borderWidth: 1.5,
    borderColor: colors.success,
    shadowOpacity: 0,
    elevation: 0,
  },
  xpPopup: {
    position: 'absolute',
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
    top: -4,
    zIndex: 10,
  },
  xpPopupText: {
    fontSize: fontSize['2xl'],
    fontWeight: '900',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
});
