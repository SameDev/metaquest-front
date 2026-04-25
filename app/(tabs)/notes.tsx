import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { useNotesStore } from '@/stores/notes-store';

type NoteType = 'daily' | 'weekly' | 'monthly';

const TABS: { key: NoteType; label: string }[] = [
  { key: 'daily', label: 'Dia' },
  { key: 'weekly', label: 'Semana' },
  { key: 'monthly', label: 'Mês' },
];

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getNoteKey(type: NoteType, offset: number): string {
  const now = new Date();
  if (type === 'daily') {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  }
  if (type === 'weekly') {
    const d = new Date(now);
    d.setDate(d.getDate() + offset * 7);
    const week = getISOWeek(d);
    return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }
  // monthly
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getLabel(type: NoteType, offset: number): string {
  const now = new Date();
  if (type === 'daily') {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    if (offset === 0) return 'Hoje';
    if (offset === -1) return 'Ontem';
    if (offset === 1) return 'Amanhã';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
  if (type === 'weekly') {
    const d = new Date(now);
    d.setDate(d.getDate() + offset * 7);
    const week = getISOWeek(d);
    const label = offset === 0 ? 'Esta semana' : `Semana ${week}`;
    return `${label} · ${d.getFullYear()}`;
  }
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const label = offset === 0 ? 'Este mês' : MONTHS_PT[d.getMonth()];
  return `${label} · ${d.getFullYear()}`;
}

const PLACEHOLDERS: Record<NoteType, string> = {
  daily: '# Nota do dia\n\n## O que quero fazer hoje?\n\n## Insights\n\n## Gratidão\n',
  weekly: '# Revisão semanal\n\n## O que foi bem?\n\n## O que melhorar?\n\n## Prioridades da próxima semana\n',
  monthly: '# Revisão mensal\n\n## Conquistas\n\n## Desafios\n\n## Metas para o próximo mês\n',
};

export default function NotesScreen() {
  const { load, upsert, notes, loaded } = useNotesStore();
  const [type, setType] = useState<NoteType>('daily');
  const [offset, setOffset] = useState(0);
  const [content, setContent] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentKey = useRef('');

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!loaded) return;
    const key = getNoteKey(type, offset);
    currentKey.current = key;
    setContent(notes[key]?.content ?? '');
  }, [type, offset, loaded, notes]);

  const handleChange = useCallback((text: string) => {
    setContent(text);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      upsert(type, currentKey.current, text);
    }, 2000);
  }, [upsert, type]);

  const switchType = (t: NoteType) => {
    setType(t);
    setOffset(0);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Notas</Text>
        <Text style={styles.subtitle}>Markdown · auto-salvo</Text>
      </View>

      {/* Type tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tab, type === t.key && styles.tabActive]}
            onPress={() => switchType(t.key)}
          >
            <Text style={[styles.tabText, type === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Date navigation */}
      <View style={styles.nav}>
        <Pressable style={styles.navBtn} onPress={() => setOffset((o) => o - 1)}>
          <Text style={styles.navArrow}>‹</Text>
        </Pressable>
        <Text style={styles.navLabel}>{getLabel(type, offset)}</Text>
        <Pressable
          style={[styles.navBtn, offset === 0 && styles.navBtnDisabled]}
          onPress={() => setOffset((o) => o + 1)}
          disabled={offset === 0}
        >
          <Text style={[styles.navArrow, offset === 0 && styles.navArrowDisabled]}>›</Text>
        </Pressable>
      </View>

      {/* Editor */}
      <ScrollView style={styles.editorScroll} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.editor}
          multiline
          value={content}
          onChangeText={handleChange}
          placeholder={PLACEHOLDERS[type]}
          placeholderTextColor={colors.textDim}
          textAlignVertical="top"
          autoCorrect={false}
          autoCapitalize="sentences"
        />
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerKey}>{getNoteKey(type, offset)}</Text>
        <Text style={styles.footerChars}>{content.length} chars</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    paddingTop: 56,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.bgPrimary,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navBtnDisabled: { opacity: 0.3 },
  navArrow: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 26,
  },
  navArrowDisabled: { color: colors.textDim },
  navLabel: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  editorScroll: {
    flex: 1,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editor: {
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: 22,
    padding: spacing.md,
    minHeight: 400,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  footerKey: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    fontFamily: 'monospace',
  },
  footerChars: {
    color: colors.textDim,
    fontSize: fontSize.xs,
  },
});
