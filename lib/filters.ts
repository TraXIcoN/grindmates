import { Platform } from 'react-native';

/**
 * Lens filters — the Snapchat-basic set: a handful of colour grades, nothing
 * animated, nothing on the face. One filter is live at a time; the chosen
 * grade is baked into the captured photo so the crew sees what you saw.
 *
 * `css` is a CSS filter string: the live preview applies it to the camera
 * wrapper on web, and the bake step replays it through a canvas at capture
 * time. On native the preview approximates warm/cool/lime grades with a tint
 * overlay (`tint`), and the photo currently ships ungraded there — an honest
 * limit until a native image-processing pass exists.
 */
export interface LensFilter {
  key: string;
  label: string;
  css: string;
  /** rgba overlay approximation for native previews. */
  tint?: string;
}

export const FILTERS: LensFilter[] = [
  { key: 'normal', label: 'None', css: '' },
  { key: 'mono', label: 'Mono', css: 'grayscale(1) contrast(1.06)' },
  { key: 'fade', label: 'Fade', css: 'saturate(0.55) brightness(1.08) contrast(0.9)' },
  { key: 'warm', label: 'Warm', css: 'sepia(0.32) saturate(1.3) hue-rotate(-8deg)', tint: 'rgba(252,165,90,0.12)' },
  { key: 'cool', label: 'Cool', css: 'saturate(1.12) hue-rotate(14deg) brightness(1.03)', tint: 'rgba(96,165,250,0.12)' },
  {
    key: 'grind',
    label: 'Grind',
    css: 'grayscale(1) sepia(0.9) hue-rotate(45deg) saturate(2.1) brightness(0.96)',
    tint: 'rgba(132,204,22,0.16)',
  },
];

/**
 * Bakes a CSS filter into an image (web only — canvas replays the exact
 * preview grade). Returns the original uri untouched when there is nothing to
 * bake or no canvas to bake with.
 */
export async function bakeFilter(uri: string, css: string): Promise<string> {
  if (!css || Platform.OS !== 'web') return uri;
  const doc = (globalThis as { document?: Document }).document;
  if (!doc) return uri;

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = doc.createElement('img');
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = uri;
    });

    const canvas = doc.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return uri;
    ctx.filter = css;
    ctx.drawImage(img, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    );
    return blob ? URL.createObjectURL(blob) : uri;
  } catch {
    return uri;
  }
}
