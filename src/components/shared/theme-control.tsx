'use client';
import { useSyncExternalStore } from 'react';
import { THEME_KEY, validTheme, type Theme } from '@/lib/theme';

function subscribe(onChange: () => void) {
  function synchronize(event: StorageEvent) {
    if (event.key !== THEME_KEY && event.key !== null) return;
    paintTheme(validTheme(event.newValue));
    onChange();
  }
  window.addEventListener('storage', synchronize);
  window.addEventListener('elb-theme-change', onChange);
  return () => { window.removeEventListener('storage', synchronize); window.removeEventListener('elb-theme-change', onChange); };
}
function currentTheme() { return validTheme(document.documentElement.dataset.theme); }
let settlingFrame = 0;
function paintTheme(theme: Theme) {
  const root = document.documentElement;
  // Prevent existing color transitions from briefly mixing old foregrounds
  // with new surfaces. Interaction/transform transitions resume next frame.
  cancelAnimationFrame(settlingFrame);
  root.dataset.themeChanging = 'true';
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme !== 'light');
  root.style.colorScheme = theme === 'light' ? 'light' : 'dark';
  void root.offsetHeight;
  settlingFrame = requestAnimationFrame(() => { delete root.dataset.themeChanging; });
}
function selectTheme(theme: Theme) {
  paintTheme(theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* The current tab remains usable without storage. */ }
  window.dispatchEvent(new Event('elb-theme-change'));
}
export function ThemeControl() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => 'light' as Theme);
  return <div className="elb-appearance-bar"><label htmlFor="elb-appearance">Appearance</label><select id="elb-appearance" value={theme} onChange={e => selectTheme(validTheme(e.target.value))}><option value="light">Light</option><option value="dark">Dark</option><option value="oled">OLED · true black</option></select></div>;
}
