import AsyncStorage from '@react-native-async-storage/async-storage';

/** Small device-local preferences — never shared, never on the server. */

const REST_KEY = 'grindmates.restDefault';
const GOAL_KEY = 'grindmates.weeklyGoal';

export async function getRestDefault(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(REST_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n >= 15 && n <= 600 ? n : 90;
  } catch {
    return 90;
  }
}

export function setRestDefault(seconds: number): void {
  void AsyncStorage.setItem(REST_KEY, String(seconds)).catch(() => {});
}

export async function getWeeklyGoal(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(GOAL_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n >= 2 && n <= 7 ? n : 4;
  } catch {
    return 4;
  }
}

export function setWeeklyGoal(days: number): void {
  void AsyncStorage.setItem(GOAL_KEY, String(days)).catch(() => {});
}
