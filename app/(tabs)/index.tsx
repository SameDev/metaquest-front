import { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { CheckCircle, Star, Clipboard } from 'lucide-react-native';
import { useTasks, useCompleteTask, useDeleteTask } from '@/hooks/use-tasks';
import { useProfile } from '@/hooks/use-profile';
import { xpToNextLevel, xpProgressInLevel } from '@/lib/gamification';
import { XPBar } from '@/components/xp-bar';
import { StatBadge } from '@/components/stat-badge';
import { TaskCard } from '@/components/task-card';
import { ConfettiBlast } from '@/components/confetti-blast';
import { LevelUpToast } from '@/components/level-up-toast';
import { Trophy, Flame, Zap } from 'lucide-react-native';
import { colors, fontSize, spacing, radius } from '@/constants/theme';
import type { TaskWithCompletion, CompleteTaskResult } from '@/types/database';

type Filter = 'all' | 'pending' | 'done';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'done', label: 'Feitas' },
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function getDateStr() {
  const now = new Date();
  return `${WEEKDAYS[now.getDay()]}, ${now.getDate()} de ${MONTHS[now.getMonth()]}`;
}

function getMotivation(pending: number, done: number): string {
  const total = pending + done;
  if (total === 0) return 'Crie sua primeira missão';
  if (done === 0) return `${pending} missão${pending > 1 ? 'ões' : ''} te aguarda`;
  if (pending === 0) return 'Tudo feito! Você arrasou hoje 🏆';
  const pct = Math.round((done / total) * 100);
  if (pct >= 75) return `${pct}% completo — quase lá!`;
  if (pct >= 50) return 'Metade feita, continue!';
  return `${done} de ${total} feitas — vai em frente`;
}

export default function HomeScreen() {
  const { data: tasks, isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useProfile();
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();
  const completingTaskId = useRef<string | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const [filter, setFilter] = useState<Filter>('all');
  const [showConfetti, setShowConfetti] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(1);

  const isRefreshing = tasksLoading || profileLoading;
  const dateStr = useMemo(() => getDateStr(), []);

  const firstName = useMemo(() => {
    if (!profile) return 'você';
    const name = profile.name ?? profile.email.split('@')[0];
    return name.split(' ')[0];
  }, [profile]);

  const handleRefresh = useCallback(() => {
    refetchTasks();
    refetchProfile();
  }, [refetchTasks, refetchProfile]);

  const handleComplete = useCallback((task: TaskWithCompletion) => {
    if (completingTaskId.current === task.id) return;
    completingTaskId.current = task.id;
    const prevLevel = profileRef.current?.level ?? 1;
    completeTask.mutate(task, {
      onSuccess: (result: CompleteTaskResult) => {
        setShowConfetti(true);
        if (result.user.level > prevLevel) {
          setNewLevel(result.user.level);
          setShowLevelUp(true);
        }
      },
      onSettled: () => { completingTaskId.current = null; },
    });
  }, [completeTask]);

  const handleEdit = useCallback((task: TaskWithCompletion) => {
    router.push({
      pathname: '/(tabs)/create',
      params: {
        editId: task.id,
        editTitle: task.title,
        editType: task.type,
        editDifficulty: task.difficulty,
      },
    });
  }, []);

  const handleDelete = useCallback((task: TaskWithCompletion) => {
    deleteTask.mutate(task.id);
  }, [deleteTask]);

  const level = profile?.level ?? 1;
  const xpProgress = profile ? xpProgressInLevel(profile.xp) : 0;
  const xpNeeded = xpToNextLevel(level);

  const { filtered, pendingCount, doneCount } = useMemo(() => {
    if (!tasks) return { filtered: [], pendingCount: 0, doneCount: 0 };
    const pending = tasks.filter((t) => !t.completed_today);
    const done = tasks.filter((t) => t.completed_today);
    const sorted = [...pending, ...done];
    let filtered: TaskWithCompletion[];
    if (filter === 'pending') filtered = pending;
    else if (filter === 'done') filtered = done;
    else filtered = sorted;
    return { filtered, pendingCount: pending.length, doneCount: done.length };
  }, [tasks, filter]);

  const allDone = pendingCount === 0 && doneCount > 0;

  const renderItem = useCallback(({ item, index }: { item: TaskWithCompletion; index: number }) => (
    <TaskCard
      task={item}
      onComplete={handleComplete}
      onEdit={handleEdit}
      onDelete={handleDelete}
      isCompleting={completingTaskId.current === item.id}
      index={index}
    />
  ), [handleComplete, handleEdit, handleDelete]);

  const keyExtractor = useCallback((item: TaskWithCompletion) => item.id, []);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaView style={styles.container} edges={['top']}>

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).springify().damping(18)} style={styles.header}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>
              {firstName[0]?.toUpperCase() ?? 'U'}
            </Text>
          </View>
          <View style={styles.greetingBlock}>
            <Text style={styles.dateText}>{dateStr}</Text>
            <Text style={styles.greeting}>Olá, {firstName}!</Text>
          </View>
        </Animated.View>

        {/* Motivation subtitle */}
        <Animated.View entering={FadeInDown.delay(40).springify().damping(18)} style={styles.motivationRow}>
          <Text style={styles.motivation}>{getMotivation(pendingCount, doneCount)}</Text>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(80).springify().damping(18)} style={styles.stats}>
          <View style={styles.badges}>
            <StatBadge
              icon={<Trophy size={16} color={colors.levelGold} />}
              label="Level"
              value={level}
              color={colors.levelGold}
              delay={120}
            />
            <StatBadge
              icon={<Flame size={16} color={colors.streakFire} />}
              label="Streak"
              value={`${profile?.streak ?? 0}d`}
              color={colors.streakFire}
              delay={180}
            />
            <StatBadge
              icon={<Zap size={16} color={colors.accentGlow} />}
              label="XP"
              value={profile?.xp ?? 0}
              color={colors.accentGlow}
              delay={240}
            />
          </View>
          <XPBar currentXP={xpProgress} maxXP={xpNeeded} level={level} />
        </Animated.View>

        {/* All done banner */}
        {allDone && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.allDoneBanner}>
            <Text style={styles.allDoneEmoji}>🏆</Text>
            <View style={styles.allDoneText}>
              <Text style={styles.allDoneTitle}>Missão cumprida!</Text>
              <Text style={styles.allDoneSub}>Todas as tarefas de hoje concluídas</Text>
            </View>
          </Animated.View>
        )}

        {/* Section header + filters */}
        <Animated.View entering={FadeInUp.delay(160).springify().damping(18)} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Missões de hoje</Text>
          <View style={styles.filterRow}>
            {FILTERS.map((f, i) => (
              <Animated.View
                key={f.key}
                entering={FadeInDown.delay(200 + i * 50).springify().damping(16)}
              >
                <Pressable
                  style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
                  onPress={() => setFilter(f.key)}
                >
                  <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                    {f.label}
                    {f.key === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
                    {f.key === 'done' && doneCount > 0 ? ` (${doneCount})` : ''}
                  </Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Task list */}
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          ListEmptyComponent={
            <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.empty}>
              <View style={styles.emptyIcon}>
                {filter === 'done'
                  ? <CheckCircle size={52} color={colors.textDim} />
                  : filter === 'pending'
                  ? <Star size={52} color={colors.textDim} />
                  : <Clipboard size={52} color={colors.textDim} />}
              </View>
              <Text style={styles.emptyTitle}>
                {filter === 'done'
                  ? 'Nada concluído ainda hoje'
                  : filter === 'pending'
                  ? 'Tudo feito! Incrível'
                  : 'Nenhuma missão criada'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'all' ? 'Comece pequeno. Uma missão por dia.' : ''}
              </Text>
              {filter === 'all' && (
                <Pressable style={styles.emptyBtn} onPress={() => router.push('/(tabs)/create')}>
                  <Text style={styles.emptyBtnText}>Criar primeira missão</Text>
                </Pressable>
              )}
            </Animated.View>
          }
        />
      </SafeAreaView>

      {showConfetti && (
        <ConfettiBlast onFinish={() => setShowConfetti(false)} />
      )}
      {showLevelUp && (
        <LevelUpToast level={newLevel} onFinish={() => setShowLevelUp(false)} />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.bgPrimary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 4,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accent + '22',
    borderWidth: 2,
    borderColor: colors.accent + '60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: colors.accent,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  greetingBlock: {
    gap: 1,
  },
  dateText: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  greeting: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  motivationRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  motivation: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },

  stats: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  allDoneBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.success + '15',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.success + '40',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  allDoneEmoji: { fontSize: 28 },
  allDoneText: { gap: 2 },
  allDoneTitle: {
    color: colors.success,
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  allDoneSub: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },

  sectionHeader: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  filterBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '20',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  filterText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },

  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  separator: { height: spacing.sm },

  empty: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    gap: spacing.sm,
  },
  emptyIcon: { marginBottom: spacing.sm, opacity: 0.4 },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyBtnText: { color: '#FFF', fontWeight: '700', fontSize: fontSize.sm },
});
