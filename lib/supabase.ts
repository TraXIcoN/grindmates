import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { DEMO, DEMO_SUPABASE_KEY, DEMO_SUPABASE_URL, demoUploadPhoto } from './demo';

/**
 * Config resolution order:
 *   1. EXPO_PUBLIC_* env vars (.env, works in dev + EAS build)
 *   2. app.json -> expo.extra (handy for quick local runs)
 */
const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const configuredUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? '';
const configuredKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey ?? '';

/**
 * With no project configured the app runs on in-memory fixtures (see
 * lib/demo.ts) and never touches the network — but createClient still needs a
 * well-formed URL to parse, so hand it a placeholder rather than ''.
 */
const supabaseUrl = DEMO ? DEMO_SUPABASE_URL : configuredUrl;
const supabaseAnonKey = DEMO ? DEMO_SUPABASE_KEY : configuredKey;

if (DEMO) {
  console.info(
    '[vitals] Demo mode — showing sample data. Copy .env.example to .env and fill in ' +
      'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY to use a real project.',
  );
} else if (!configuredKey) {
  console.warn('[vitals] EXPO_PUBLIC_SUPABASE_ANON_KEY is missing.');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // AsyncStorage on native; the web build uses localStorage automatically.
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No deep-link callback in this build, so URL session detection stays off.
    detectSessionInUrl: false,
  },
  realtime: { params: { eventsPerSecond: 4 } },
});

export const CHECKIN_BUCKET = 'checkin-photos';

/**
 * Uploads a local file:// image to Supabase Storage and returns its public URL.
 * Objects live at <bucket>/<user_id>/<uuid>.jpg so the storage RLS folder check
 * passes.
 */
export async function uploadCheckInPhoto(userId: string, localUri: string): Promise<string> {
  if (DEMO) return demoUploadPhoto(localUri);

  const ext =(localUri.split('.').pop() ?? 'jpg').split('?')[0].toLowerCase();
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const path = `${userId}/${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`}.${ext}`;

  // fetch() on a file:// URI gives us a Blob in Expo without pulling in a
  // base64 round-trip.
  const res = await fetch(localUri);
  const bytes = await res.arrayBuffer();

  const { error } = await supabase.storage
    .from(CHECKIN_BUCKET)
    .upload(path, bytes, { contentType, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(CHECKIN_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
