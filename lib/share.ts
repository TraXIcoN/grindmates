import { Share } from 'react-native';

/** "12345678" -> "1234 5678" — how the code renders everywhere. */
export function formatJoinCode(code: string): string {
  const digits = code.replace(/\D/g, '');
  return digits.length === 8 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits;
}

/**
 * Native share sheet where one exists, clipboard where it doesn't (desktop
 * web). Returns what actually happened so the UI can say "Copied" honestly.
 */
export async function shareJoinCode(
  crewName: string,
  code: string,
): Promise<'shared' | 'copied' | 'failed'> {
  const message = `Join "${crewName}" on Grindmates — crew code ${formatJoinCode(code)}`;

  try {
    await Share.share({ message });
    return 'shared';
  } catch {
    // Fall through to the clipboard.
  }

  try {
    const clipboard = (globalThis as { navigator?: Navigator }).navigator?.clipboard;
    if (clipboard) {
      await clipboard.writeText(message);
      return 'copied';
    }
  } catch {
    // Fall through.
  }
  return 'failed';
}
