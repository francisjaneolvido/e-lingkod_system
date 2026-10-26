export const THEMES = ['light', 'dark', 'oled'] as const;
export type Theme = typeof THEMES[number];
export const THEME_KEY = 'elb-appearance';
export function validTheme(value: unknown): Theme {
  return THEMES.includes(value as Theme) ? value as Theme : 'light';
}
// A parser-blocking head script runs before body paint, independently of React.
// Only allowlisted values reach the document. Storage is optional, never fatal.
export const THEME_BOOTSTRAP = `(function(){var t='light';try{var s=localStorage.getItem('${THEME_KEY}');if(s==='light'||s==='dark'||s==='oled')t=s;}catch(e){}var r=document.documentElement;r.dataset.theme=t;r.classList.toggle('dark',t!=='light');r.style.colorScheme=t==='light'?'light':'dark';})();`;
