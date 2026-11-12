import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = URL_ && ANON ? createClient(URL_, ANON, { db: { schema: 'thoughts-by-dave' } }) : null;
export const cloudEnabled = !!supabase;

/* ---------- client-side encryption (the server only ever sees ciphertext) ---------- */
const enc = new TextEncoder();
const dec = new TextDecoder();
const toB64 = (buf) => {
  const b = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(pass, saltB64) {
  if (!globalThis.crypto?.subtle) throw new Error('Encryption needs a secure (https) connection.');
  // NFKC so the same passphrase typed on different keyboards/devices derives the same key.
  const base = await crypto.subtle.importKey('raw', enc.encode(pass.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: fromB64(saltB64), iterations: 310000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}
async function encryptDoc(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
  return `${toB64(iv)}.${toB64(ct)}`;
}
async function decryptDoc(key, str) {
  const [iv, ct] = str.split('.');
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, key, fromB64(ct));
  return JSON.parse(dec.decode(pt));
}

const KC = 'tav.key.v1';
const saveKey = async (uid, key, salt) => {
  try {
    localStorage.setItem(KC, JSON.stringify({ uid, salt, jwk: await crypto.subtle.exportKey('jwk', key) }));
  } catch {
    /* ignore */
  }
};
const loadKey = async (uid) => {
  try {
    const v = JSON.parse(localStorage.getItem(KC) || 'null');
    if (!v || v.uid !== uid) return null;
    return { salt: v.salt, key: await crypto.subtle.importKey('jwk', v.jwk, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']) };
  } catch {
    return null;
  }
};
const clearKey = () => {
  try {
    localStorage.removeItem(KC);
  } catch {
    /* ignore */
  }
};

/* ---------- merge: two devices never overwrite each other ---------- */
export function mergeDocs(l, r) {
  if (!r) return l;
  const deleted = [...new Set([...(l.deleted || []), ...(r.deleted || [])])];
  const del = new Set(deleted);
  const union = (a = [], b = [], stamp) => {
    const m = new Map();
    [...b, ...a].forEach((x) => m.set(x.id, x));
    return [...m.values()].filter((x) => !del.has(x.id)).sort((x, y) => stamp(y) - stamp(x));
  };
  const useLocalDraft = (l.draftAt || 0) >= (r.draftAt || 0);
  const useLocalPending = (l.pendingAt || 0) >= (r.pendingAt || 0);
  return {
    ashes: union(l.ashes, r.ashes, (x) => x.burnedAt),
    heals: union(l.heals, r.heals, (x) => x.date),
    deleted,
    draft: useLocalDraft ? l.draft : r.draft,
    draftAt: Math.max(l.draftAt || 0, r.draftAt || 0),
    pending: useLocalPending ? l.pending : r.pending,
    pendingAt: Math.max(l.pendingAt || 0, r.pendingAt || 0),
  };
}

/* ---------- database access ---------- */
async function fetchRow(uid) {
  const { data, error } = await supabase.from('journal_state').select('salt,data,rev').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  return data;
}
async function writeRow(uid, salt, data, row) {
  if (!row) {
    const { error } = await supabase.from('journal_state').insert({ user_id: uid, salt, data, rev: 1 });
    if (error) {
      if (error.code === '23505') return false; // another device created it first: retry as merge
      throw error;
    }
    return true;
  }
  const { data: res, error } = await supabase
    .from('journal_state')
    .update({ data, rev: row.rev + 1, updated_at: new Date().toISOString() })
    .eq('user_id', uid)
    .eq('rev', row.rev)
    .select('rev');
  if (error) throw error;
  return res.length > 0; // 0 rows = someone else wrote first: retry
}

/* ---------- the hook ---------- */
export function useCloud({ snapshot, apply }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [ready, setReady] = useState(false); // encryption key available
  const [hasRemote, setHasRemote] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | syncing | synced | error
  const [error, setError] = useState('');
  const [lastSynced, setLastSynced] = useState(null);

  const keyRef = useRef(null);
  const saltRef = useRef(null);
  const snapRef = useRef(snapshot);
  snapRef.current = snapshot;
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const busy = useRef(false);
  const again = useRef(false);
  const syncRef = useRef(() => {});

  // auth session
  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user || null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // when the user changes: restore cached key or find out whether cloud data exists
  useEffect(() => {
    keyRef.current = null;
    setReady(false);
    setHasRemote(null);
    if (!user) return;
    let dead = false;
    (async () => {
      const k = await loadKey(user.id);
      if (dead) return;
      if (k) {
        keyRef.current = k.key;
        saltRef.current = k.salt;
        setReady(true);
        return;
      }
      try {
        const row = await fetchRow(user.id);
        if (!dead) setHasRemote(!!row);
      } catch (e) {
        if (!dead) setError(e.message);
      }
    })();
    return () => {
      dead = true;
    };
  }, [user]);

  const syncNow = useCallback(async () => {
    if (!supabase || !keyRef.current || !user) return;
    if (busy.current) {
      again.current = true;
      return;
    }
    busy.current = true;
    setStatus('syncing');
    setError('');
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        const row = await fetchRow(user.id);
        let remote = null;
        if (row) {
          try {
            remote = await decryptDoc(keyRef.current, row.data);
          } catch {
            throw new Error('Could not decrypt cloud data. Your passphrase may have changed: use "Forget passphrase" and enter it again.');
          }
        }
        const local = snapRef.current;
        const merged = mergeDocs(local, remote);
        if (JSON.stringify(merged) !== JSON.stringify(local)) applyRef.current(merged);
        if (remote && JSON.stringify(merged) === JSON.stringify(remote)) break;
        const ok = await writeRow(user.id, row?.salt || saltRef.current, await encryptDoc(keyRef.current, merged), row);
        if (ok) break;
        if (attempt === 3) throw new Error('Sync conflict, will retry.');
      }
      setLastSynced(Date.now());
      setStatus('synced');
    } catch (e) {
      setStatus('error');
      setError(e.message || String(e));
    } finally {
      busy.current = false;
      if (again.current) {
        again.current = false;
        setTimeout(() => syncRef.current(), 0);
      }
    }
  }, [user]);
  syncRef.current = syncNow;

  // sync on unlock, shortly after any change, and when returning to the tab
  const sig = JSON.stringify(snapshot);
  useEffect(() => {
    if (!ready) return undefined;
    const t = setTimeout(() => syncRef.current(), 2200);
    return () => clearTimeout(t);
  }, [ready, sig]);
  useEffect(() => {
    if (!ready) return undefined;
    const go = () => document.visibilityState === 'visible' && syncRef.current();
    document.addEventListener('visibilitychange', go);
    window.addEventListener('online', go);
    window.addEventListener('focus', go);
    return () => {
      document.removeEventListener('visibilitychange', go);
      window.removeEventListener('online', go);
      window.removeEventListener('focus', go);
    };
  }, [ready]);

  /* actions */
  const sendLink = async (email) => {
    const { error: e } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + window.location.pathname } });
    if (e) throw e;
  };
  const verifyCode = async (email, token) => {
    const { error: e } = await supabase.auth.verifyOtp({ email, token: token.trim(), type: 'email' });
    if (e) throw e;
  };
  const unlock = async (pass, create) => {
    let salt;
    let key;
    if (create) {
      salt = toB64(crypto.getRandomValues(new Uint8Array(16)));
      key = await deriveKey(pass, salt);
    } else {
      const row = await fetchRow(user.id);
      if (!row) throw new Error('No cloud data found for this account.');
      salt = row.salt;
      key = await deriveKey(pass, salt);
      try {
        await decryptDoc(key, row.data);
      } catch {
        throw new Error('That passphrase does not match.');
      }
    }
    keyRef.current = key;
    saltRef.current = salt;
    await saveKey(user.id, key, salt);
    setReady(true);
  };
  const forgetKey = () => {
    clearKey();
    keyRef.current = null;
    setReady(false);
    setStatus('idle');
    fetchRow(user.id).then((r) => setHasRemote(!!r)).catch(() => setHasRemote(true));
  };
  const signOut = async () => {
    clearKey();
    keyRef.current = null;
    setReady(false);
    setStatus('idle');
    await supabase.auth.signOut();
  };

  return { enabled: cloudEnabled, authReady, user, ready, hasRemote, status, error, lastSynced, sendLink, verifyCode, unlock, forgetKey, signOut, syncNow };
}
