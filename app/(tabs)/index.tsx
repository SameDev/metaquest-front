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
import { Trophy, Flame, Zap, CheckCircle, Star, Clipboard } from 'lucide-react-native';
import { useTasks, useCompleteTask, useDeleteTask } from '@/hooks/use-tasks';
import { useProfile } from '@/hooks/use-profile';
import { useAuth } from '@/hooks/use-auth';
import { xpToNextLevel, xpProgressInLevel } from '@/lib/gamification';
import { XPBar } from '@/components/xp-bar';
import { StatBadge } from '@/components/stat-badge';
import { TaskCard } from '@/components/task-card';
import { colors, fontSize, spacing, radius } from '@/constants/theme';
import type { TaskWithCompletion } from '@/types/database';

type Filter = 'all' | 'pending' | 'done';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'done', label: 'Feitas' },
];

function getMotivation(pending: number, done: number): string {
  const total = pending + done;
  if (total === 0) return 'Crie sua primeira missão';
  if (done === 0) {
    const word = pending === 1 ? 'missão' : 'missões';
    const verb = pending === 1 ? 'te aguarda' : 'te aguardam';
    return `${pending} ${word} ${verb}`;
  }
  if (pending === 0) return 'Tudo feito! Você arrasou hoje';
  const pct = Math.round((done / total) * 100);
  if (pct >= 75) return `${pct}% completo — quase lá!`;
  if (pct >= 50) return `Metade feita, continue!`;
  return `${done} de ${total} ${done === 1 ? 'feita' : 'feitas'} — vai em frente`;
}

export default function HomeScreen() {
  const { data: tasks, isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useProfile();
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();
  const { signOut } = useAuth();
  const completingTaskId = useRef<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const isRefreshing = tasksLoading || profileLoading;

  const handleRefresh = useCallback(() => {
    refetchTasks();
    refetchProfile();
  }, [refetchTasks, refetchProfile]);

  const handleComplete = useCallback((task: TaskWithCompletion) => {
    if (completingTaskId.current === task.id) return;
    completingTaskId.current = task.id;
    completeTask.mutate(task, {
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

    // pending first, done at bottom
    const sorted = [...pending, ...done];

    let filtered: TaskWithCompletion[];
    if (filter === 'pending') filtered = pending;
    else if (filter === 'done') filtered = done;
    else filtered = sorted;

    return { filtered, pendingCount: pending.length, doneCount: done.length };
  }, [tasks, filter]);

  const renderItem = useCallback(({ item }: { item: TaskWithCompletion }) => (
    <TaskCard
      task={item}
      onComplete={handleComplete}
      onEdit={handleEdit}
      onDelete={handleDelete}
      isCompleting={completingTaskId.current === item.id}
    />
  ), [handleComplete, handleEdit, handleDelete]);

  const keyExtractor = useCallback((item: TaskWithCompletion) => item.id, []);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.heroTitle}>DisciplineOS</Text>
            <Text style={styles.motivation}>
              {getMotivation(pendingCount, doneCount)}
            </Text>
          </View>
          <Pressable onPress={signOut} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Sair</Text>
          </Pressable>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.badges}>
            <StatBadge icon={<Trophy size={20} color={colors.levelGold} />} label="Level" value={level} color={colors.levelGold} />
            <StatBadge
              icon={<Flame size={20} color={colors.streakFire} />}
              label="Streak"
              value={`${profile?.streak ?? 0}d`}
              color={colors.streakFire}
            />
            <StatBadge
              icon={<Zap size={20} color={colors.accentGlow} />}
              label="XP Total"
              value={profile?.xp ?? 0}
              color={colors.accentGlow}
            />
          </View>
          <XPBar currentXP={xpProgress} maxXP={xpNeeded} level={level} />
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
                {f.key === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
                {f.key === 'done' && doneCount > 0 ? ` (${doneCount})` : ''}
              </Text>
            </Pressable>
          ))}
        </View>

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
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                {filter === 'done'
                  ? <CheckCircle size={48} color={colors.textDim} />
                  : filter === 'pending'
                  ? <Star size={48} color={colors.textDim} />
                  : <Clipboard size={48} color={colors.textDim} />}
              </View>
              <Text style={styles.emptyText}>
                {filter === 'done'
                  ? 'Nada concluído ainda hoje'
                  : filter === 'pending'
                  ? 'Tudo feito! Incrível'
                  : 'Nenhuma tarefa criada'}
              </Text>
              {filter === 'all' && (
                <Pressable style={styles.emptyBtn} onPress={() => router.push('/(tabs)/create')}>
                  <Text style={styles.emptyBtnText}>Criar primeira missão</Text>
                </Pressable>
              )}
            </View>
          }
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTitle: {
    color: colors.text,
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  motivation: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  logoutBtn: {
    paddingVertical: spacing.xs,
    paddingLeft: spacing.md,
  },
  logoutText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '600',
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  filterBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  filterBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '20',
  },
  filterText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.accent,
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
  emptyIcon: { marginBottom: spacing.xs },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  emptyBtnText: { color: '#FFF', fontWeight: '600', fontSize: fontSize.sm },
});
