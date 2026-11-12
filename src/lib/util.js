import { useEffect, useState } from 'react';

const read = (k, fb) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fb;
  } catch {
    return fb;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
};

export const K = {
  ashes: 'tav.ashes.v1',
  heals: 'tav.heals.v1',
  settings: 'tav.settings.v1',
  draft: 'tav.draft.v1',
  pending: 'tav.pending.v1',
  meta: 'tav.meta.v1',
};

export function usePersisted(key, init) {
  const [v, setV] = useState(() => {
    const stored = read(key, init);
    return init && typeof init === 'object' && !Array.isArray(init) ? { ...init, ...stored } : stored;
  });
  useEffect(() => write(key, v), [key, v]);
  return [v, setV];
}

export function useTick(ms) {
  const [, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

// Light obfuscation so sealed text is not casually readable in storage.
// (It is a browser app: this is a ritual lock, not cryptography.)
export const seal = (t) => {
  let s = '';
  new TextEncoder().encode(t).forEach((x) => (s += String.fromCharCode(x)));
  return btoa(s);
};
export const unseal = (s) => {
  try {
    return new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));
  } catch {
    return '';
  }
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
export const wordCount = (t) => t.trim().split(/\s+/).filter(Boolean).length;

export const fmtDate = (ts, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  new Date(ts).toLocaleDateString(undefined, opts);
export const fmtLong = (ts) => fmtDate(ts, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const DAY = 86400000;
export const daysBetween = (a, b) => Math.floor((b - a) / DAY);

export function countdown(ms) {
  if (ms <= 0) return 'Ready';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n) => String(n).padStart(2, '0');
  return d > 0 ? `${d}d ${p(h)}h ${p(m)}m` : `${p(h)}:${p(m)}:${p(sec)}`;
}

export const dayKey = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export function streakOf(heals, now) {
  const days = new Set(heals.map((h) => dayKey(h.date)));
  let n = 0;
  let t = now;
  if (!days.has(dayKey(t))) t -= DAY;
  while (days.has(dayKey(t))) {
    n++;
    t -= DAY;
  }
  return n;
}

export const dailyIndex = (len) => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / DAY) % len;
