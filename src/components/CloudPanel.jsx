import React, { useEffect, useState } from 'react';
import { X, Mail, KeyRound, Cloud, LogOut, RefreshCw, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';

export default function CloudPanel({ cloud, onClose }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const run = async (fn) => {
    setErr('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const creating = cloud.user && !cloud.ready && cloud.hasRemote === false;
  const entering = cloud.user && !cloud.ready && cloud.hasRemote === true;
  const field = 'w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-base placeholder:text-ink/35 focus:border-terra';

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-paper text-ink p-6 shadow-2xl animate-fadeUp" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Cloud size={20} className="text-terra" />
            <h2 className="font-serif text-2xl">Sync across devices</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-ink/10" aria-label="Close"><X size={18} /></button>
        </div>

        {!cloud.enabled && (
          <div className="mt-4 text-sm text-ink/70 space-y-2">
            <p>Cloud sync is not set up yet, so everything stays on this device.</p>
            <p>Add <code className="bg-ink/5 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="bg-ink/5 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to enable it. Steps are in the README.</p>
          </div>
        )}

        {cloud.enabled && !cloud.authReady && <p className="mt-6 text-sm flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Loading…</p>}

        {cloud.enabled && cloud.authReady && !cloud.user && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-ink/70">Sign in with your email. No password needed: we send you a one-time link (or code).</p>
            <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={field} />
            <button className="btn btn-ember w-full" disabled={busy || !email.includes('@')} onClick={() => run(async () => { await cloud.sendLink(email.trim()); setSent(true); })}>
              <Mail size={16} /> {sent ? 'Send again' : 'Email me a sign-in link'}
            </button>
            {sent && (
              <div className="space-y-2 pt-1">
                <p className="text-sm text-ink/70">Check your inbox and open the link on this device. Or type the 6-digit code from the email if there is one:</p>
                <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" className={field} />
                <button className="btn btn-ghost-light w-full" disabled={busy || code.trim().length < 6} onClick={() => run(() => cloud.verifyCode(email.trim(), code))}>Verify code</button>
              </div>
            )}
          </div>
        )}

        {(creating || entering) && (
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-2 rounded-xl bg-botanical/10 p-3 text-sm text-ink/75">
              <ShieldCheck size={18} className="shrink-0 text-botanical mt-0.5" />
              <p>Your journal is encrypted on this device before it is uploaded. Only your passphrase can open it. Not even the server can read it.</p>
            </div>
            <p className="text-sm font-medium">{creating ? 'Create a passphrase for your journal' : 'Enter your journal passphrase'}</p>
            <input type="password" autoComplete={creating ? 'new-password' : 'current-password'} value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Passphrase (8+ characters)" className={field} />
            {creating && <input type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} placeholder="Repeat passphrase" className={field} />}
            {creating && (
              <p className="text-xs text-terra flex items-start gap-1.5"><AlertTriangle size={14} className="shrink-0 mt-0.5" /> If you forget it, your cloud copy cannot be recovered. Not by you and not by anyone else.</p>
            )}
            <button
              className="btn btn-ember w-full"
              disabled={busy || pass.length < 8 || (creating && pass !== pass2)}
              onClick={() => run(() => cloud.unlock(pass, creating).then(() => { setPass(''); setPass2(''); }))}
            >
              <KeyRound size={16} /> {creating ? 'Start syncing' : 'Unlock and sync'}
            </button>
            {creating && pass2 && pass !== pass2 && <p className="text-xs text-red-700">Passphrases do not match.</p>}
          </div>
        )}

        {cloud.user && !cloud.ready && cloud.hasRemote === null && !err && <p className="mt-6 text-sm flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Checking your account…</p>}

        {cloud.user && cloud.ready && (
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-xl bg-botanical/10 p-4">
              <p className="font-medium text-botanical">{cloud.status === 'syncing' ? 'Syncing…' : cloud.status === 'error' ? 'Sync problem' : 'Synced'}</p>
              <p className="text-ink/60 break-all">{cloud.user.email}</p>
              {cloud.lastSynced && <p className="text-xs text-ink/45 mt-1">Last synced {new Date(cloud.lastSynced).toLocaleTimeString()}</p>}
            </div>
            <p className="text-ink/65">Anything you write, tear, burn or heal appears on your other devices once you sign in there with the same email and passphrase.</p>
            <button className="btn btn-ghost-light w-full" onClick={() => cloud.syncNow()} disabled={cloud.status === 'syncing'}>
              <RefreshCw size={15} className={cloud.status === 'syncing' ? 'animate-spin' : ''} /> Sync now
            </button>
            <div className="flex gap-2">
              <button className="btn btn-ghost-light flex-1" onClick={cloud.forgetKey}>Forget passphrase here</button>
              <button className="btn btn-ghost-light flex-1" onClick={cloud.signOut}><LogOut size={15} /> Sign out</button>
            </div>
          </div>
        )}

        {(err || cloud.error) && <p className="mt-4 text-sm text-red-700 bg-red-50 rounded-xl p-3 break-words">{err || cloud.error}</p>}
      </div>
    </div>
  );
}
