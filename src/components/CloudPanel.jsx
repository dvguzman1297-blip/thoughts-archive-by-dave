import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, X, Mail, KeyRound, Cloud, LogOut, RefreshCw, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';

const RULE = 'Passphrase should be at least 15 characters OR at least 8 characters including a number and a lowercase letter.';
const strong = (p) => p.length >= 15 || (p.length >= 8 && /\d/.test(p) && /[a-z]/.test(p));

function PassField({ value, onChange, placeholder, auto, show, setShow, cls }) {
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} autoComplete={auto} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls + ' pr-11'} />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-ink/50 hover:text-ink" aria-label={show ? 'Hide passphrase' : 'Show passphrase'}>
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

export default function CloudPanel({ cloud, onClose, page = false, onSkip }) {
  const remembered = (() => { try { return localStorage.getItem('tav.lastEmail') || ''; } catch { return ''; } })();
  const [email, setEmail] = useState(remembered);
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('signin');
  const [method, setMethod] = useState('pass');
  const [show, setShow] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (page) return undefined;
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, page]);

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
  const field = 'w-full rounded-lg border border-ink/20 bg-white px-4 py-3 text-base placeholder:text-ink/40 focus:border-terra focus:ring-2 focus:ring-terra/20';
  const labelCls = 'block text-sm font-semibold text-ink';
  const socialBtn = 'w-full inline-flex items-center justify-center gap-2.5 rounded-lg border border-ink/20 bg-white py-2.5 text-[15px] font-medium hover:bg-ink/5 transition disabled:opacity-50';

  return (
    <div
      className={page ? 'min-h-[100dvh] flex flex-col items-center justify-center px-4 py-10 bg-desk' : 'fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4'}
      style={page ? { backgroundImage: 'radial-gradient(ellipse 70% 55% at 50% 0%, rgba(255,186,110,.16), transparent 70%)' } : undefined}
      onClick={page ? undefined : onClose}
    >
      {page && (
        <div className="mb-6 text-center text-paper animate-fadeUp">
          <p className="font-serif text-3xl sm:text-4xl">Thoughts Archived</p>
          <p className="font-serif italic text-paper/60 mt-1">by Dave</p>
        </div>
      )}
      <div className={`w-full sm:max-w-md max-h-[92dvh] overflow-y-auto bg-paper text-ink p-6 shadow-2xl animate-fadeUp ${page ? 'rounded-3xl' : 'rounded-t-3xl sm:rounded-3xl'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Cloud size={20} className="text-terra" />
            <h2 className="font-serif text-2xl">{page ? 'Welcome back' : 'Sync across devices'}</h2>
          </div>
          {!page && <button onClick={onClose} className="p-1.5 rounded-full hover:bg-ink/10" aria-label="Close"><X size={18} /></button>}
        </div>

        {!cloud.enabled && (
          <div className="mt-4 text-sm text-ink/70 space-y-2">
            <p>Cloud sync is not set up yet, so everything stays on this device.</p>
            <p>Add <code className="bg-ink/5 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="bg-ink/5 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to enable it. Steps are in the README.</p>
          </div>
        )}

        {cloud.enabled && !cloud.authReady && <p className="mt-6 text-sm flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Loading…</p>}

        {cloud.enabled && cloud.authReady && !cloud.user && (
          <div className="mt-4">
            <div className="grid grid-cols-2 border-b border-ink/15 text-sm" role="tablist">
              {[['signin', 'Sign in'], ['register', 'Register']].map(([id, text]) => (
                <button key={id} role="tab" aria-selected={mode === id} onClick={() => { setMode(id); setErr(''); setNote(''); }} className={`-mb-px border-b-2 py-2.5 font-medium transition ${mode === id ? 'border-terra text-ink' : 'border-transparent text-ink/50 hover:text-ink'}`}>
                  {text}
                </button>
              ))}
            </div>

            {mode === 'signin' && (
              <div className="mt-5 space-y-3">
                <button className={socialBtn} disabled={busy} onClick={() => run(() => cloud.oauth('google'))}>
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
                  Continue with Google
                </button>
                <div className="flex items-center gap-3 text-sm text-ink/55"><span className="h-px flex-1 bg-ink/15" />or<span className="h-px flex-1 bg-ink/15" /></div>

                <div className="grid grid-cols-2 gap-1 rounded-lg bg-ink/5 p-1 text-xs" role="tablist">
                  {[['pass', 'Email + passphrase'], ['link', 'Email link']].map(([id, text]) => (
                    <button key={id} onClick={() => { setMethod(id); setErr(''); }} className={`rounded-md py-1.5 font-medium transition ${method === id ? 'bg-white text-ink shadow-sm' : 'text-ink/55 hover:text-ink'}`}>{text}</button>
                  ))}
                </div>
                {remembered && <p className="text-xs text-botanical">Remembered on this device: {remembered}</p>}

                <label className={labelCls}>Email<sup className="text-terra">*</sup></label>
                <input type="email" inputMode="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={field} />

                {method === 'pass' ? (
                  <>
                    <label className={labelCls}>Passphrase<sup className="text-terra">*</sup></label>
                    <PassField value={pass} onChange={setPass} placeholder="Passphrase" auto="current-password" show={show} setShow={setShow} cls={field} />
                    <button className="btn btn-ember w-full !rounded-lg" disabled={busy || !email.includes('@') || !pass} onClick={() => run(async () => { await cloud.login(email, pass); setPass(''); })}>
                      <KeyRound size={16} /> {busy ? 'Signing in…' : 'Sign in'}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-ink/60">We email you a one-time link or code. You will still enter your journal passphrase afterwards.</p>
                    <button className="btn btn-ember w-full !rounded-lg" disabled={busy || !email.includes('@')} onClick={() => run(async () => { await cloud.sendLink(email.trim()); setSent(true); })}>
                      <Mail size={16} /> {sent ? 'Send again' : 'Email me a sign-in link'}
                    </button>
                    {sent && (
                      <div className="space-y-2 pt-1">
                        <p className="text-sm text-ink/70">Open the link on this device, or type the 6-digit code if the email has one:</p>
                        <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" className={field} />
                        <button className="btn btn-ghost-light w-full !rounded-lg" disabled={busy || code.trim().length < 6} onClick={() => run(() => cloud.verifyCode(email.trim(), code))}>Verify code</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {mode === 'register' && (
              <div className="mt-5 space-y-3">
                <button className={socialBtn} disabled={busy} onClick={() => run(() => cloud.oauth('google'))}>
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
                  Continue with Google
                </button>
                <div className="flex items-center gap-3 text-sm text-ink/55"><span className="h-px flex-1 bg-ink/15" />or<span className="h-px flex-1 bg-ink/15" /></div>

                <label className={labelCls}>Email<sup className="text-terra">*</sup></label>
                <input type="email" inputMode="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={field} />
                <label className={labelCls}>Passphrase<sup className="text-terra">*</sup></label>
                <PassField value={pass} onChange={setPass} placeholder="Passphrase" auto="new-password" show={show} setShow={setShow} cls={field} />
                <p className={`text-xs ${pass && !strong(pass) ? 'text-red-700' : 'text-ink/55'}`}>{RULE}</p>
                <label className={labelCls}>Repeat passphrase<sup className="text-terra">*</sup></label>
                <PassField value={pass2} onChange={setPass2} placeholder="Repeat passphrase" auto="new-password" show={show} setShow={setShow} cls={field} />
                {pass2 && pass !== pass2 && <p className="text-xs text-red-700">Passphrases do not match.</p>}
                <div className="flex items-start gap-2 rounded-lg bg-botanical/10 p-3 text-xs text-ink/75">
                  <ShieldCheck size={16} className="shrink-0 text-botanical mt-0.5" />
                  <p>This one passphrase signs you in and encrypts your journal on your device. The server never sees it or your writing.</p>
                </div>
                <p className="text-xs text-terra flex items-start gap-1.5"><AlertTriangle size={14} className="shrink-0 mt-0.5" /> If you forget it, it cannot be reset and your cloud journal cannot be recovered.</p>
                <button
                  className="btn btn-ember w-full !rounded-lg"
                  disabled={busy || !email.includes('@') || !strong(pass) || pass !== pass2}
                  onClick={() => run(async () => {
                    if ((await cloud.register(email, pass)) === 'confirm') { setNote('Almost there. Open the confirmation link we emailed you, then sign in here.'); setMode('signin'); setMethod('pass'); }
                    setPass('');
                    setPass2('');
                  })}
                >
                  {busy ? 'Creating…' : 'Create my account'}
                </button>
              </div>
            )}
            {note && <p className="mt-4 text-sm text-botanical bg-botanical/10 rounded-lg p-3">{note}</p>}
          </div>
        )}

        {(creating || entering) && (
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-2 rounded-xl bg-botanical/10 p-3 text-sm text-ink/75">
              <ShieldCheck size={18} className="shrink-0 text-botanical mt-0.5" />
              <p>Your journal is encrypted on this device before it is uploaded. Only your passphrase can open it. Not even the server can read it.</p>
            </div>
            <p className="text-sm font-medium">{creating ? 'Create a passphrase for your journal' : 'Enter your journal passphrase'}</p>
            <input type="password" autoComplete={creating ? 'new-password' : 'current-password'} value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Passphrase" className={field} />
            {creating && <p className={`text-xs ${pass && !strong(pass) ? 'text-red-700' : 'text-ink/55'}`}>{RULE}</p>}
            {creating && <input type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} placeholder="Repeat passphrase" className={field} />}
            {creating && (
              <p className="text-xs text-terra flex items-start gap-1.5"><AlertTriangle size={14} className="shrink-0 mt-0.5" /> If you forget it, your cloud copy cannot be recovered. Not by you and not by anyone else.</p>
            )}
            <button
              className="btn btn-ember w-full"
              disabled={busy || (creating ? !strong(pass) || pass !== pass2 : pass.length < 1)}
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
            <details className="rounded-xl border border-ink/10 p-3">
              <summary className="cursor-pointer font-medium text-ink/80">Enable sign-in with passphrase</summary>
              <div className="mt-3 space-y-2">
                <p className="text-xs text-ink/60">For accounts made with an email link or Google. Enter your journal passphrase once and the Sign in tab will accept it for this email.</p>
                <PassField value={pass} onChange={setPass} placeholder="Journal passphrase" auto="current-password" show={show} setShow={setShow} cls={field} />
                <button className="btn btn-ghost-light w-full !rounded-lg" disabled={busy || !pass} onClick={() => run(async () => { await cloud.enablePassphraseLogin(pass); setPass(''); setNote('Done. You can now sign in with this email and passphrase.'); })}>
                  <KeyRound size={15} /> Enable
                </button>
                {note && <p className="text-xs text-botanical">{note}</p>}
              </div>
            </details>
            <div className="flex gap-2">
              <button className="btn btn-ghost-light flex-1" onClick={cloud.forgetKey}>Forget passphrase here</button>
              <button className="btn btn-ghost-light flex-1" onClick={cloud.signOut}><LogOut size={15} /> Sign out</button>
            </div>
          </div>
        )}

        {(err || cloud.error) && <p className="mt-4 text-sm text-red-700 bg-red-50 rounded-xl p-3 break-words">{err || cloud.error}</p>}
        {page && cloud.user && !cloud.ready && <button className="mt-4 text-xs text-ink/50 underline" onClick={cloud.signOut}>Use a different email</button>}
      </div>
      {page && onSkip && (
        <button onClick={onSkip} className="mt-5 text-sm text-paper/50 hover:text-paper/80 underline underline-offset-4">
          Continue on this device only
        </button>
      )}
    </div>
  );
}
