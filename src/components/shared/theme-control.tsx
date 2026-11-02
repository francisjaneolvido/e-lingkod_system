'use client';
import {useState, useSyncExternalStore} from 'react';
import {Eclipse, Moon, Sun} from 'lucide-react';
import {THEME_KEY, validTheme, type Theme} from '@/lib/theme';
function subscribe(onChange: () => void) {
  function synchronize(event: StorageEvent) {
    if(event.key !== THEME_KEY && event.key !== null) return;
    paintTheme(validTheme(event.newValue)); onChange();
  }
  window.addEventListener('storage', synchronize);window.addEventListener('elb-theme-change', onChange);
  return () => {window.removeEventListener('storage', synchronize);window.removeEventListener('elb-theme-change', onChange);};
}
const currentTheme=()=>validTheme(document.documentElement.dataset.theme);
const subscribeReady=()=>()=>{};
const ready=()=>true;
const notReady=()=>false;
let settlingFrame=0;
function paintTheme(theme:Theme) {
  const root=document.documentElement;
  cancelAnimationFrame(settlingFrame);root.dataset.themeChanging='true';root.dataset.theme=theme;
  root.classList.toggle('dark',theme!=='light');root.style.colorScheme=theme==='light'?'light':'dark';
  void root.offsetHeight;settlingFrame=requestAnimationFrame(()=>{delete root.dataset.themeChanging;});
}
const choices=[{value:'light',label:'Light',Icon:Sun},{value:'dark',label:'Dark',Icon:Moon},{value:'oled',label:'OLED',Icon:Eclipse}] as const;
export function ThemeControl({fallback=false}:{fallback?:boolean}) {
  const hydrated=useSyncExternalStore(subscribeReady,ready,notReady);
  const theme=useSyncExternalStore(subscribe,currentTheme,()=> 'light' as Theme);
  const [announcement,setAnnouncement]=useState('');
  const Icon=choices.find(c=>c.value===theme)!.Icon;
  const current=choices.find(c=>c.value===theme)!,next=choices[(choices.indexOf(current)+1)%choices.length];
  const label=`Current theme: ${current.label}. Switch to ${next.label}.`;
  return <div className={'elb-theme'+(fallback?' elb-theme-fallback':'')} data-appearance-host={fallback?undefined:''}>
    <button disabled={!hydrated} type="button" className="elb-theme-trigger" aria-label={label} title={label} onClick={()=>{
      paintTheme(next.value);try{localStorage.setItem(THEME_KEY,next.value);}catch{/* Usable for this page when storage is unavailable. */}
      window.dispatchEvent(new Event('elb-theme-change'));setAnnouncement(`Theme changed to ${next.label}.`);
    }}><Icon size={19} aria-hidden="true"/></button>
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
  </div>;
}
