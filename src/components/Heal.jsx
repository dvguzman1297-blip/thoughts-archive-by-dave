import React, { useEffect, useMemo, useState } from 'react';
import { Shuffle, Sprout, Check, BookHeart, RotateCcw } from 'lucide-react';
import { AFFIRMATIONS, HEAL_PROMPTS, MOODS } from '../data/content';
import { fmtLong } from '../lib/util';

const pickPrompt = (cat, avoid) => {
  const pool = HEAL_PROMPTS.filter((h) => (h.cats.includes('any') || h.cats.includes(cat)) && h.id !== avoid);
  return pool[Math.floor(Math.random() * pool.length)];
};
const pickAff = (avoid) => {
  const pool = AFFIRMATIONS.filter((a) => a !== avoid);
  return pool[Math.floor(Math.random() * pool.length)];
};

export default function Heal({ catId, nowMs, pending, setPending, onSave, onArchive, onRestart }) {
  const [hp, setHp] = useState(() => HEAL_PROMPTS.find((h) => h.id === pending.hpId) || pickPrompt(catId));
  const [aff, setAff] = useState(() => pending.aff || pickAff());
  const [own, setOwn] = useState(pending.own || '');
  const [text, setText] = useState(pending.text || '');
  const [mood, setMood] = useState(pending.mood || null);
  const [saved, setSaved] = useState(false);

  // Cache the in-progress reflection so leaving mid-heal loses nothing.
  useEffect(() => {
    if (!saved) setPending((p) => ({ ...p, hpId: hp.id, aff, own, text, mood }));
  }, [hp, aff, own, text, mood, saved, setPending]);
  const affirmation = own.trim() || aff;
  const date = useMemo(() => fmtLong(nowMs()), [nowMs]);

  const save = () => {
    onSave({ prompt: hp.text, reflection: text.trim(), affirmation, mood });
    setSaved(true);
  };

  return (
    <div className="relative min-h-screen flex items-start justify-center px-4 pt-24 pb-16 overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-[-18rem] -translate-x-1/2 w-[70rem] h-[48rem] rounded-full animate-sunrise" style={{ background: 'radial-gradient(closest-side, rgba(255,250,235,.95), rgba(255,250,235,0))' }} />
      <div className="relative w-full max-w-xl animate-fadeUp">
        <p className="text-center font-sans text-[11px] uppercase tracking-[.22em] text-botanical">Heal · {date}</p>
        <h2 className="text-center font-serif text-3xl sm:text-4xl text-ink mt-2">The page is gone. You are still here.</h2>

        {!saved ? (
          <>
            {/* index card */}
            <div className="mt-8 relative rounded-md bg-alabaster text-ink shadow-[0_14px_40px_-14px_rgba(60,90,70,.45),0_2px_4px_rgba(60,90,70,.15)] border border-botanical/15 overflow-hidden">
              <div className="h-[3px] bg-terra/70" />
              <div className="px-6 pt-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[.16em] text-botanical font-sans font-semibold">
                    <Sprout size={13} /> Gentle prompt
                  </span>
                  <button className="chip border-botanical/30 text-botanical hover:bg-botanical/10 inline-flex items-center gap-1.5" onClick={() => setHp(pickPrompt(catId, hp.id))}>
                    <Shuffle size={12} /> Another
                  </button>
                </div>
                <p className="mt-3 font-serif italic text-xl leading-snug">{hp.text}</p>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write a few soft lines…"
                rows={6}
                className="ink-area lined block w-full resize-none bg-transparent px-6 pb-6 pt-1"
              />
            </div>

            {/* affirmation */}
            <div className="mt-6 text-center">
              <p className="text-[11px] uppercase tracking-[.2em] text-botanical font-sans font-semibold">Closing affirmation</p>
              <p className="mt-2 font-serif text-2xl text-ink leading-snug px-4">“{affirmation}”</p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <button className="chip border-botanical/30 text-botanical hover:bg-botanical/10 inline-flex items-center gap-1.5" onClick={() => { setOwn(''); setAff(pickAff(aff)); }}>
                  <RotateCcw size={12} /> Draw another
                </button>
                <input value={own} onChange={(e) => setOwn(e.target.value)} placeholder="or write your own" maxLength={140} className="rounded-full px-4 py-1.5 text-base sm:text-xs bg-white/70 border border-botanical/25 placeholder:text-ink/35 w-full sm:w-48 focus:border-botanical" />
              </div>
            </div>

            {/* check-in */}
            <div className="mt-7 text-center">
              <p className="text-xs text-ink/55 font-sans">Optional check-in: how do you feel right now?</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {MOODS.map((m) => (
                  <button key={m.id} onClick={() => setMood(mood === m.id ? null : m.id)} className={`chip ${mood === m.id ? 'bg-botanical text-white border-botanical' : 'border-botanical/30 text-ink/70 hover:bg-botanical/10'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button className="btn bg-botanical text-white hover:bg-[#4d6b58] shadow-lg shadow-botanical/20" onClick={save}>
                <Check size={16} /> Keep this in my sanctuary
              </button>
              <button className="btn btn-ghost-light" onClick={onRestart}>Close without saving</button>
            </div>
          </>
        ) : (
          <div className="mt-10 text-center animate-fadeUp">
            <div className="mx-auto w-14 h-14 rounded-full bg-botanical/15 flex items-center justify-center text-botanical">
              <Check size={26} />
            </div>
            <p className="mt-4 font-serif text-2xl">“{affirmation}”</p>
            <p className="mt-3 text-sm text-ink/60 max-w-sm mx-auto">Saved. You can read this any time in your Sanctuary Archive. The burned page rests in the Ashes Vault until its date.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button className="btn bg-botanical text-white hover:bg-[#4d6b58]" onClick={onArchive}>
                <BookHeart size={16} /> Open my archive
              </button>
              <button className="btn btn-ghost-light" onClick={onRestart}>Return to the journal</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
