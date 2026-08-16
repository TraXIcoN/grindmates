import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_SECONDS = 90;

/**
 * Rest timer. Plain interval state — no animation library, no background task.
 * Fires a heavy haptic + a short notification burst when it hits zero.
 */
export function useRestTimer(initial: number = DEFAULT_SECONDS) {
  const [duration, setDuration] = useState(initial);
  const [remaining, setRemaining] = useState(initial);
  const [running, setRunning] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = () => {
    if (tick.current) {
      clearInterval(tick.current);
      tick.current = null;
    }
  };

  useEffect(() => {
    if (!running) {
      clear();
      return;
    }
    tick.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clear();
          setRunning(false);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          // Second beat a moment later so it reads as an alarm, not a tap.
          setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 180);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clear;
  }, [running]);

  const start = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRemaining((prev) => (prev === 0 ? duration : prev));
    setRunning(true);
  }, [duration]);

  const pause = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRunning(false);
  }, []);

  const toggle = useCallback(() => (running ? pause() : start()), [running, pause, start]);

  const reset = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRunning(false);
    setRemaining(duration);
  }, [duration]);

  /** Fresh countdown from the top, already running — the one-tap "log set and
   *  rest" path uses this so logging never needs a second press of play. */
  const restart = useCallback(() => {
    setRemaining(duration);
    setRunning(true);
  }, [duration]);

  /** ±15s nudge. Adjusts the base duration too, so reset keeps the new length. */
  const nudge = useCallback((delta: number) => {
    void Haptics.selectionAsync();
    setDuration((prev) => Math.max(15, Math.min(600, prev + delta)));
    setRemaining((prev) => Math.max(0, Math.min(600, prev + delta)));
  }, []);

  const setPreset = useCallback((seconds: number) => {
    void Haptics.selectionAsync();
    setDuration(seconds);
    setRemaining(seconds);
    setRunning(false);
  }, []);

  const progress = duration > 0 ? remaining / duration : 0;

  return { duration, remaining, running, progress, start, pause, toggle, reset, restart, nudge, setPreset };
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
