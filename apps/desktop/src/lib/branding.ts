import type { PosConfig } from '@vibe-pos/config-schema';

/**
 * Apply branding from config as CSS variables on :root.
 * Updates primary and accent colors dynamically without reloading.
 */
export function applyBranding(branding: PosConfig['branding']) {
  if (!branding) return;
  const root = document.documentElement;
  if (branding.primaryColor) {
    root.style.setProperty('--color-primary', branding.primaryColor);
  }
  if (branding.accentColor) {
    root.style.setProperty('--color-accent', branding.accentColor);
  }
}
