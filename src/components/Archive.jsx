import React, { useEffect, useState } from 'react';
import { BookHeart, Flame, Lock, Unlock, Eye, EyeOff, X, Sprout, Trash2, CalendarHeart } from 'lucide-react';
import { MOODS } from '../data/content';
import { DAY, countdown, dayKey, daysBetween, fmtDate, streakOf, unseal, useTick } from '../lib/util';

function Tabs({ tab, setTab, counts, light }) {
  const items = [
    { id: 'heal', label: 'Healing Reflections', icon: BookHeart, n: counts.heals, color: '#5E7F6A' },
    { id: 'vault', label: 'The Ashes Vault', icon: Flame, n: counts.ashes, color: '#E85D2A' },
  ];
  return (
    <div className="flex gap-2 px-1">
      {items.map((it) => {
        const on = tab === it.id;
        return (
          <button
            key={it.id}
            onClick={() => setTab(it.id)}
            className={`relative -mb-px flex items-center gap-2 rounded-t-xl px-4 pt-3 pb-2.5 text-sm font-medium transition-all duration-300 border border-b-0 ${
              on ? (light ? 'bg-alabaster text-ink border-botanical/25 shadow-sm' : 'bg-desk2 text-paper border-white/15') : light ? 'bg-sage2/60 text-ink/55 border-transparent hover:text-ink' : 'bg-transparent text-paper/50 border-transparent hover:text-paper/80'
            }`}
          >
            <span className="absolute -top-0.5 left-4 h-1 w-8 rounded-b-full" style={{ background: it.color, opacity: on ? 1 : 0.4 }} />
            <it.icon size={15} style={{ color: it.color }} />
            <span className="hidden sm:inline">{it.label}</span>
            <span className="sm:hidden">{it.id === 'heal' ? 'Reflections' : 'Vault'}</span>
            <span className="text-xs opacity-60">{it.n}</span>
          </button>
        );
      })}
    </div>
  );
}

function Reflections({ heals, settings, setSettings, nowMs }) {
  const now = nowMs();
  const streak = streakOf(heals, now);
  const days = new Set(heals.map((h) => dayKey(h.date)));
  const dots = Array.from({ length: 28 }, (_, i) => {
    const t = now - (27 - i) * DAY;
    return { key: dayKey(t), on: days.has(dayKey(t)), today: i === 27 };
  });
  const moodLabel = (id) => MOODS.find((m) => m.id === id)?.label;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <CalendarHeart className="text-botanical" size={20} />
          <div>
            <p className="font-serif text-lg leading-tight">{settings.hideStreak ? 'Gentle check-ins' : streak > 0 ? `${streak}-day rhythm` : 'No pressure. Start whenever.'}</p>
            <p className="text-xs text-ink/55">{settings.hideStreak ? 'Numbers are hidden. Showing up is enough.' : 'Missing a day never erases a day.'}</p>
          </div>
        </div>
        <button onClick={() => setSettings({ ...settings, hideStreak: !settings.hideStreak })} className="chip border-botanical/30 text-botanical hover:bg-botanical/10 inline-flex items-center gap-1.5">
          {settings.hideStreak ? <Eye size={13} /> : <EyeOff size={13} />} {settings.hideStreak ? 'Show streak numbers' : 'Hide streak numbers'}
        </button>
      </div>
      <div className="flex gap-1.5 mb-7" aria-label="Last 28 days of check-ins">
        {dots.map((d) => (
          <span key={d.key} title={d.on ? 'Checked in' : ''} className={`h-3 flex-1 rounded-full transition-colors ${d.on ? 'bg-botanical' : 'bg-botanical/15'} ${d.today ? 'ring-2 ring-botanical/40 ring-offset-2 ring-offset-alabaster' : ''}`} />
        ))}
      </div>

      {heals.length === 0 ? (
        <div className="text-center py-16 text-ink/55">
          <Sprout className="mx-auto mb-3 text-botanical/60" size={34} />
          <p className="font-serif text-xl">Nothing here yet.</p>
          <p className="text-sm mt-1">Your reflections will gather here after your first ritual.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {heals.map((h) => (
            <article key={h.id} className="rounded-md bg-white/80 border border-botanical/15 shadow-[0_8px_24px_-12px_rgba(60,90,70,.4)] overflow-hidden animate-fadeUp">
              <div className="h-[3px] bg-terra/60" />
              <div className="p-5">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[.14em] font-sans text-botanical font-semibold">
                  <span>{fmtDate(h.date)}</span>
                  <span className="truncate ml-3 text-ink/45">{h.category}</span>
                </div>
                <p className="mt-3 font-serif italic text-ink/65 leading-snug">{h.prompt}</p>
                {h.reflection ? <p className="mt-3 font-serif text-lg leading-[1.55] whitespace-pre-wrap">{h.reflection}</p> : <p className="mt-3 text-sm text-ink/40 italic">No words that day. That is allowed.</p>}
                <p className="mt-4 pt-3 border-t border-ink/10 font-serif text-botanical">“{h.affirmation}”</p>
                {h.mood && <span className="mt-3 inline-block chip border-botanical/30 text-ink/60">Felt: {moodLabel(h.mood)}</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Envelope({ ash, now, onOpen }) {
  const left = ash.unlockAt - now;
  const open = left <= 0;
  const [shake, setShake] = useState(false);
  const click = () => {
    if (open) return onOpen(ash);
    setShake(true);
    setTimeout(() => setShake(false), 450);
    onOpen(ash, true);
  };
  return (
    <button onClick={click} className={`group relative text-left transition-transform duration-300 hover:-translate-y-1 ${shake ? 'animate-shake' : ''}`} aria-label={open ? 'Open sealed entry' : 'Sealed entry, locked'}>
      <div className="relative envelope-clip aspect-[4/3] bg-gradient-to-br from-[#2d231c] via-[#1d1612] to-[#120e0b] shadow-2xl shadow-black/60">
        <div className="absolute inset-0 opacity-70" style={{ background: 'radial-gradient(circle at 0% 100%, rgba(232,93,42,.35), transparent 38%), radial-gradient(circle at 100% 0%, rgba(232,93,42,.22), transparent 30%)' }} />
        <div className={`absolute inset-x-0 top-0 h-[58%] bg-gradient-to-b from-white/[.07] to-transparent ${open ? '' : ''}`} style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-black/20" style={{ clipPath: 'polygon(0 100%, 50% 0, 100% 100%)' }} />
        <div className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2">
          <div className={`h-14 w-14 rounded-full flex items-center justify-center shadow-lg ${open ? 'animate-glow' : ''}`} style={{ background: open ? 'radial-gradient(circle at 35% 30%, #f6d58a, #c89a3c 60%, #8a6420)' : 'radial-gradient(circle at 35% 30%, #d9663a, #9b3a1d 60%, #5c200e)', boxShadow: open ? '0 0 26px rgba(246,213,138,.55)' : '0 0 18px rgba(232,93,42,.25), inset 0 -3px 5px rgba(0,0,0,.4)' }}>
            {open ? <Unlock size={20} className="text-[#5a3c0c]" /> : <Lock size={20} className="text-[#2c0f06]/80" />}
          </div>
        </div>
        <div className="absolute inset-x-4 bottom-3 text-[#e9dcc6]">
          <p className="text-[10px] uppercase tracking-[.16em] opacity-60 font-sans">Burned {fmtDate(ash.burnedAt)}</p>
          <p className="font-serif text-sm leading-tight truncate">{ash.category}</p>
        </div>
      </div>
      <p className={`mt-3 text-center text-sm font-sans ${open ? 'text-[#f1d89a]' : 'text-paper/70'}`}>
        {open ? 'Ready to open' : <>Opens in <span className="font-semibold tabular-nums text-paper">{countdown(left)}</span></>}
      </p>
      <p className="text-center text-xs text-paper/40">{open ? `Unlocked ${fmtDate(ash.unlockAt)}` : `Unlocks ${fmtDate(ash.unlockAt)}`}</p>
    </button>
  );
}

function Vault({ ashes, nowMs, onOpen }) {
  useTick(1000);
  const now = nowMs();
  return (
    <div>
      <p className="text-paper/60 text-sm max-w-xl mb-6">Each page you burn rests here, sealed. The words cannot be read, by you or anyone, until the date on the seal. When it opens, you will meet it side by side with the note you wrote to heal.</p>
      {ashes.length === 0 ? (
        <div className="text-center py-16 text-paper/50">
          <Flame className="mx-auto mb-3 opacity-50" size={34} />
          <p className="font-serif text-xl">The vault is empty.</p>
          <p className="text-sm mt-1">Burned pages will rest here, waiting.</p>
        </div>
      ) : (
        <div className="grid gap-x-6 gap-y-9 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {ashes.map((a) => (
            <Envelope key={a.id} ash={a} now={now} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

function Reveal({ ash, heal, nowMs, onClose, onDelete }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  // Strict enforcement: re-check the lock at render time.
  if (nowMs() < ash.unlockAt) return null;
  const n = daysBetween(ash.burnedAt, nowMs());
  const when = n <= 0 ? 'earlier today' : n === 1 ? '1 day ago' : `${n} days ago`;
  const months = n >= 60 ? ` (about ${Math.round(n / 30)} months)` : '';
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm animate-fadeUp" onClick={onClose}>
      <div className="mx-auto max-w-5xl px-4 py-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 text-paper">
          <div>
            <p className="text-[11px] uppercase tracking-[.2em] text-ember font-sans font-semibold">Unsealed</p>
            <h2 className="font-serif text-2xl sm:text-3xl mt-1">Written {when}{months}. Look how far you have come.</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost-dark !px-3" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2 items-start">
          <div className="sheet margin-line p-5 pl-[44px] sm:p-6 sm:pl-[62px] animate-pageIn">
            <p className="text-[11px] uppercase tracking-[.14em] text-terra font-semibold font-sans relative z-10">{ash.category} · {fmtDate(ash.burnedAt)}</p>
            {ash.prompt && <p className="mt-2 font-serif italic text-ink/70 leading-snug relative z-10">{ash.prompt}</p>}
            <div className="mt-3 h-px bg-ink/20 relative z-10" />
            <p className="mt-4 font-serif text-xl leading-[30px] whitespace-pre-wrap relative z-10">{unseal(ash.sealed)}</p>
          </div>
          <div className="rounded-md bg-sage text-ink overflow-hidden shadow-2xl shadow-black/50 animate-fadeUp">
            <div className="h-[3px] bg-terra/70" />
            <div className="p-6">
              <p className="text-[11px] uppercase tracking-[.14em] text-botanical font-semibold font-sans inline-flex items-center gap-1.5"><Sprout size={13} /> The heal note from that day</p>
              {heal ? (
                <>
                  <p className="mt-3 font-serif italic text-ink/65 leading-snug">{heal.prompt}</p>
                  <p className="mt-3 font-serif text-xl leading-[1.55] whitespace-pre-wrap">{heal.reflection || <span className="text-ink/40 italic text-base">No words that day.</span>}</p>
                  <p className="mt-5 pt-4 border-t border-ink/10 font-serif text-lg text-botanical">“{heal.affirmation}”</p>
                </>
              ) : (
                <p className="mt-4 font-serif text-lg text-ink/60">No heal note was saved that day, and that is okay. You are here now, reading this, and that counts.</p>
              )}
            </div>
          </div>
        </div>
        <div className="mt-8 text-center">
          <button onClick={() => onDelete(ash)} className="chip border-white/15 text-paper/55 hover:text-paper hover:bg-white/10 inline-flex items-center gap-1.5">
            <Trash2 size={12} /> Let this go for good
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Archive({ tab, setTab, heals, ashes, settings, setSettings, nowMs, toast, onDeleteAsh }) {
  const [open, setOpen] = useState(null);
  const light = tab === 'heal';
  const handleOpen = (ash, locked) => {
    if (locked || nowMs() < ash.unlockAt) {
      const d = Math.max(1, Math.ceil((ash.unlockAt - nowMs()) / DAY));
      toast(`Still sealed. It opens on ${fmtDate(ash.unlockAt)} (${d} day${d === 1 ? '' : 's'} to go).`);
      return;
    }
    setOpen(ash);
  };
  const healFor = (ash) => heals.find((h) => h.ashId === ash.id);

  return (
    <div className="mx-auto w-full max-w-5xl px-3 sm:px-4 pt-20 pb-16 animate-pageIn">
      <div className="px-1 mb-5">
        <p className={`text-[11px] uppercase tracking-[.22em] font-sans font-semibold ${light ? 'text-botanical' : 'text-ember'}`}>Sanctuary Archive</p>
        <h1 className={`font-serif text-3xl sm:text-4xl mt-1 ${light ? 'text-ink' : 'text-paper'}`}>Everything you have let go of, and everything you kept.</h1>
      </div>
      <Tabs tab={tab} setTab={setTab} counts={{ heals: heals.length, ashes: ashes.length }} light={light} />
      <div className={`rounded-b-2xl rounded-tr-2xl border p-5 sm:p-7 transition-colors duration-700 ${light ? 'bg-alabaster border-botanical/25 text-ink shadow-[0_20px_50px_-24px_rgba(60,90,70,.5)]' : 'bg-desk2 border-white/15 text-paper shadow-2xl shadow-black/40'}`}>
        {light ? <Reflections heals={heals} settings={settings} setSettings={setSettings} nowMs={nowMs} /> : <Vault ashes={ashes} nowMs={nowMs} onOpen={handleOpen} />}
      </div>
      {open && (
        <Reveal
          ash={open}
          heal={healFor(open)}
          nowMs={nowMs}
          onClose={() => setOpen(null)}
          onDelete={(a) => {
            if (window.confirm('Delete this entry permanently? This cannot be undone.')) {
              onDeleteAsh(a.id);
              setOpen(null);
            }
          }}
        />
      )}
    </div>
  );
}
