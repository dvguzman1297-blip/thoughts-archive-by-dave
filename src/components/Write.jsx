import React, { useMemo, useRef, useState } from 'react';
import { Shuffle, PenLine, Feather, Grid3x3, Lock, ArrowRight, ChevronDown } from 'lucide-react';
import { CATEGORIES, LOCKS, PROMPTS, catById, computeUnlock, promptById } from '../data/content';
import { dailyIndex, fmtDate, fmtLong, wordCount } from '../lib/util';

export default function Write({ draft, setDraft, settings, setSettings, nowMs, onContinue }) {
  const [menu, setMenu] = useState(false);
  const [inking, setInking] = useState(false);
  const inkTimer = useRef(null);

  const prompt = useMemo(() => promptById(draft.promptId) || PROMPTS[dailyIndex(PROMPTS.length)], [draft.promptId]);
  const cat = catById(prompt.cat);
  const words = wordCount(draft.text);
  const unlockAt = computeUnlock(nowMs(), draft.lock);

  const shuffle = (catId = draft.cat) => {
    const pool = PROMPTS.filter((p) => (catId === 'all' || p.cat === catId) && p.id !== prompt.id);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setDraft({ ...draft, cat: catId, promptId: pick.id });
  };
  const onType = (e) => {
    // Pin the prompt on first keystroke so it stays the same when you come back tomorrow.
    setDraft({ ...draft, text: e.target.value, promptId: draft.promptId || prompt.id, savedAt: Date.now() });
    setInking(true);
    clearTimeout(inkTimer.current);
    inkTimer.current = setTimeout(() => setInking(false), 260);
  };
  const guideClass = settings.guide === 'lines' ? 'lined' : settings.guide === 'dots' ? 'dotted' : 'plain';
  const nextGuide = { lines: 'dots', dots: 'none', none: 'lines' }[settings.guide];

  return (
    <div className="mx-auto w-full max-w-[1280px] px-3 sm:px-6 pt-16 pb-[max(0.75rem,env(safe-area-inset-bottom))] h-screen h-[100dvh] flex flex-col animate-pageIn">
      <div className="sheet margin-line flex flex-col flex-1 min-h-0">
        <div className="relative z-20 pl-[44px] pr-4 sm:pl-[62px] sm:pr-6 pt-4 sm:pt-6 pb-3">
          <div className="flex items-center justify-between gap-3 font-sans text-[11px] tracking-[.14em] uppercase">
            <span className="font-semibold" style={{ color: draft.free ? '#B4532A' : '#B4532A' }}>
              {draft.free ? 'Free Write' : cat.name}
            </span>
            <span className="text-ink/55 normal-case tracking-normal text-xs hidden sm:block">{fmtLong(nowMs())}</span>
            <span className="text-ink/55 normal-case tracking-normal text-xs sm:hidden">{fmtDate(nowMs())}</span>
          </div>

          {draft.free ? (
            <p className="mt-3 font-serif italic text-[19px] leading-[26px] text-ink/70">No prompt today. Begin anywhere. Let it come out sideways.</p>
          ) : (
            <>
              <p className="mt-1 text-[10px] uppercase tracking-[.2em] text-ink/40 font-sans">Prompt of the day</p>
              <p className="mt-1 font-serif italic text-[19px] leading-[26px]">{prompt.text}</p>
              <div className="mt-3 flex items-center gap-2 relative">
                <button onClick={() => shuffle()} className="chip border-ink/20 text-ink/70 hover:bg-ink/5 inline-flex items-center gap-1.5" title="Draw a different prompt">
                  <Shuffle size={12} /> Draw another
                </button>
                <button onClick={() => setMenu((m) => !m)} className="chip border-ink/20 text-ink/70 hover:bg-ink/5 inline-flex items-center gap-1.5">
                  Theme: {draft.cat === 'all' ? 'Any' : catById(draft.cat).name} <ChevronDown size={12} />
                </button>
                {menu && (
                  <div className="absolute left-0 top-9 z-30 w-56 rounded-xl bg-paper border border-ink/15 shadow-xl p-1.5 animate-fadeUp">
                    {[{ id: 'all', name: 'Any theme', tint: '#999' }, ...CATEGORIES].map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setMenu(false);
                          shuffle(c.id);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-ink/5 ${draft.cat === c.id ? 'bg-ink/5 font-medium' : ''}`}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ background: c.tint }} />
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          <div className="mt-3 h-px bg-ink/20" />
        </div>

        <textarea
          value={draft.text}
          onChange={onType}
          autoFocus={typeof window !== 'undefined' && window.innerWidth >= 640}
          dir="auto"
          lang={navigator.language}
          autoCapitalize="sentences"
          autoCorrect="on"
          enterKeyHint="enter"
          spellCheck
          placeholder="Begin here. Nobody will read this. It is meant to be burned."
          className={`ink-area ${guideClass} relative z-10 flex-1 w-full resize-none bg-transparent pl-[44px] pr-4 sm:pl-[62px] sm:pr-6 pb-8 min-h-0 overflow-y-auto scroll-soft`}
        />
      </div>

      {/* floating toolbar */}
      <div className="shrink-0 pt-3 flex justify-center">
        <div className="glass-bar px-3 py-2 sm:py-2.5 flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-4 gap-y-2 w-full sm:w-auto max-w-full">
          <div className="flex items-center gap-2 text-paper/70 text-xs">
            <PenLine size={15} className={`text-ember transition-transform duration-200 ${inking ? '-rotate-12 scale-125' : ''}`} />
            <span>{words} {words === 1 ? 'word' : 'words'}</span>
            {draft.text && <span className="text-paper/40 hidden sm:inline">· draft saved</span>}
          </div>
          <button onClick={() => setDraft({ ...draft, free: !draft.free })} className={`chip inline-flex items-center gap-1.5 ${draft.free ? 'bg-terra border-terra text-paper' : 'border-white/15 text-paper/75 hover:bg-white/10'}`} aria-pressed={draft.free}>
            <Feather size={12} /> Free write
          </button>
          <button onClick={() => setSettings({ ...settings, guide: nextGuide })} className="chip inline-flex items-center gap-1.5 border-white/15 text-paper/75 hover:bg-white/10" title="Cycle page guides">
            <Grid3x3 size={12} /> {settings.guide === 'lines' ? 'Ruled' : settings.guide === 'dots' ? 'Dotted' : 'Blank'}
          </button>
          <div className="flex items-center gap-1.5" title={`Sealed until ${fmtDate(unlockAt)}`}>
            <Lock size={13} className="text-paper/60" />
            {LOCKS.map((l) => (
              <button key={l.id} onClick={() => setDraft({ ...draft, lock: l.id })} className={`chip ${draft.lock === l.id ? 'bg-paper text-ink border-paper' : 'border-white/15 text-paper/75 hover:bg-white/10'}`}>
                {l.short}
              </button>
            ))}
          </div>
          <button className="btn btn-ember" disabled={!draft.text.trim()} onClick={onContinue}>
            Tear it <ArrowRight size={15} />
          </button>
          <span className="hidden xl:inline text-[11px] text-paper/45">Burned pages stay sealed until {fmtDate(unlockAt)}.</span>
        </div>
      </div>
    </div>
  );
}
