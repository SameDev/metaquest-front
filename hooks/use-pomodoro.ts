import { useCallback, useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import * as KeepAwake from 'expo-keep-awake';

export type PomodoroPhase = 'focus' | 'short_break' | 'long_break';

export interface PomodoroSettings {
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  roundsBeforeLongBreak: number;
}

export const DEFAULT_SETTINGS: PomodoroSettings = {
  focusDuration: 25 * 60,
  shortBreakDuration: 5 * 60,
  longBreakDuration: 15 * 60,
  roundsBeforeLongBreak: 4,
};

const PHASE_LABELS: Record<PomodoroPhase, string> = {
  focus: 'Foco',
  short_break: 'Pausa Curta',
  long_break: 'Pausa Longa',
};

const PHASE_EMOJIS: Record<PomodoroPhase, string> = {
  focus: '🎯',
  short_break: '☕',
  long_break: '🌿',
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getDuration(phase: PomodoroPhase, settings: PomodoroSettings): number {
  if (phase === 'focus') return settings.focusDuration;
  if (phase === 'short_break') return settings.shortBreakDuration;
  return settings.longBreakDuration;
}

function nextPhase(
  current: PomodoroPhase,
  round: number,
  settings: PomodoroSettings,
): { phase: PomodoroPhase; round: number } {
  if (current !== 'focus') return { phase: 'focus', round: current === 'long_break' ? 1 : round + 1 };
  if (round % settings.roundsBeforeLongBreak === 0) return { phase: 'long_break', round };
  return { phase: 'short_break', round };
}

export function usePomodoro(settings: PomodoroSettings = DEFAULT_SETTINGS) {
  const [phase, setPhase] = useState<PomodoroPhase>('focus');
  const [round, setRound] = useState(1);
  const [remaining, setRemaining] = useState(settings.focusDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [totalFocusSessions, setTotalFocusSessions] = useState(0);

  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifIdRef = useRef<string | null>(null);
  const keepAwakeActive = useRef(false);

  const safeDeactivateKeepAwake = useCallback(() => {
    if (keepAwakeActive.current) {
      KeepAwake.deactivateKeepAwake();
      keepAwakeActive.current = false;
    }
  }, []);

  const duration = getDuration(phase, settings);

  const scheduleNotification = useCallback(async (secondsFromNow: number, p: PomodoroPhase) => {
    await Notifications.requestPermissionsAsync();
    const next = nextPhase(p, round, settings);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${PHASE_EMOJIS[p]} ${PHASE_LABELS[p]} concluído!`,
        body: `Hora de ${PHASE_LABELS[next.phase].toLowerCase()} ☑️`,
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsFromNow },
    });
    notifIdRef.current = id;
  }, [round, settings]);

  const cancelNotification = useCallback(async () => {
    if (notifIdRef.current) {
      await Notifications.cancelScheduledNotificationAsync(notifIdRef.current);
      notifIdRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    if (!endTimeRef.current) return;
    const left = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
    setRemaining(left);

    if (left === 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsRunning(false);
      endTimeRef.current = null;
      safeDeactivateKeepAwake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setPhase((cur) => {
        setRound((r) => {
          const { phase: np, round: nr } = nextPhase(cur, r, settings);
          setPhase(np);
          setRemaining(getDuration(np, settings));
          if (cur === 'focus') setTotalFocusSessions((s) => s + 1);
          return nr;
        });
        return cur;
      });
    }
  }, [settings]);

  const start = useCallback(() => {
    endTimeRef.current = Date.now() + remaining * 1000;
    intervalRef.current = setInterval(tick, 500);
    setIsRunning(true);
    if (!keepAwakeActive.current) {
      KeepAwake.activateKeepAwake();
      keepAwakeActive.current = true;
    }
    scheduleNotification(remaining, phase);
  }, [remaining, tick, phase, scheduleNotification]);

  const pause = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    endTimeRef.current = null;
    safeDeactivateKeepAwake();
    cancelNotification();
  }, [cancelNotification, safeDeactivateKeepAwake]);

  const reset = useCallback(() => {
    pause();
    setRemaining(getDuration(phase, settings));
  }, [pause, phase, settings]);

  const skip = useCallback(() => {
    pause();
    const { phase: np, round: nr } = nextPhase(phase, round, settings);
    setPhase(np);
    setRound(nr);
    setRemaining(getDuration(np, settings));
    if (phase === 'focus') setTotalFocusSessions((s) => s + 1);
  }, [pause, phase, round, settings]);

  const selectPhase = useCallback((p: PomodoroPhase) => {
    pause();
    setPhase(p);
    setRemaining(getDuration(p, settings));
  }, [pause, settings]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      cancelNotification();
      safeDeactivateKeepAwake();
    };
  }, [cancelNotification, safeDeactivateKeepAwake]);

  const progress = 1 - remaining / duration;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return {
    phase,
    round,
    remaining,
    isRunning,
    progress,
    timeDisplay,
    totalFocusSessions,
    phaseLabel: PHASE_LABELS[phase],
    phaseEmoji: PHASE_EMOJIS[phase],
    start,
    pause,
    reset,
    skip,
    selectPhase,
  };
}
