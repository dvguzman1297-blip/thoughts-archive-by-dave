import React, { useEffect, useRef, useState } from 'react';
import { Settings as Cog, FastForward, RotateCcw, Volume2, VolumeX, Trash2 } from 'lucide-react';
import { DAY, fmtLong } from '../lib/util';

export default function Settings({ settings, setSettings, nowMs, onWipe, light }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', h);
    return () => document.removeEventListener('pointerdown', h);
  }, [open]);

  const jump = (days) => setSettings({ ...settings, offsetMs: (settings.offsetMs || 0) + days * DAY });
  const shifted = (settings.offsetMs || 0) !== 0;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className={`p-2 rounded-full transition ${light ? 'hover:bg-black/5 text-ink/70' : 'hover:bg-white/10 text-paper/70'} ${shifted ? 'ring-1 ring-ember/70' : ''}`} aria-label="Settings" title="Settings">
        <Cog size={18} />
      </button>
      {open && (
        <div className="fixed sm:absolute right-3 sm:right-0 top-[4.25rem] sm:top-11 w-[min(18rem,calc(100vw-1.5rem))] max-h-[80dvh] overflow-y-autorounded-2xl bg-paper text-ink border border-ink/10 shadow-2xl shadow-black/50 p-4 animate-fadeUp z-50 text-sm">
          <p className="text-[11px] uppercase tracking-[.16em] text-ink/45 font-semibold mb-2">Sound</p>
          <button onClick={() => setSettings({ ...settings, muted: !settings.muted })} className="w-full flex items-center justify-between rounded-lg px-3 py-2 bg-ink/5 hover:bg-ink/10">
            <span>Paper &amp; fire sounds</span>
            {settings.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          <p className="text-[11px] uppercase tracking-[.16em] text-ink/45 font-semibold mt-4 mb-2">Demo: time travel</p>
          <p className="text-xs text-ink/60 mb-2">Test unlocking without waiting. Today is <span className="font-medium">{fmtLong(nowMs())}</span>.</p>
          <div className="grid grid-cols-3 gap-1.5">
            {[[1, '+1 day'], [30, '+30 days'], [90, '+90 days'], [180, '+6 months'], [365, '+1 year']].map(([d, l]) => (
              <button key={d} onClick={() => jump(d)} className="rounded-lg px-2 py-1.5 text-xs bg-terra/10 text-terra hover:bg-terra/20 inline-flex items-center justify-center gap-1">
                <FastForward size={11} /> {l}
              </button>
            ))}
            <button disabled={!shifted} onClick={() => setSettings({ ...settings, offsetMs: 0 })} className="rounded-lg px-2 py-1.5 text-xs bg-ink/5 hover:bg-ink/10 disabled:opacity-40 inline-flex items-center justify-center gap-1">
              <RotateCcw size={11} /> Reset
            </button>
          </div>

          <p className="text-[11px] uppercase tracking-[.16em] text-ink/45 font-semibold mt-4 mb-2">Data</p>
          <button
            onClick={() => {
              if (!confirm) return setConfirm(true);
              setConfirm(false);
              setOpen(false);
              onWipe();
            }}
            className={`w-full rounded-lg px-3 py-2 text-left inline-flex items-center gap-2 ${confirm ? 'bg-red-600 text-white' : 'bg-ink/5 hover:bg-ink/10'}`}
          >
            <Trash2 size={14} /> {confirm ? 'Tap again to erase everything' : 'Erase all local data'}
          </button>
          <p className="mt-3 text-[11px] text-ink/45">Everything lives only in this browser (localStorage).</p>
        </div>
      )}
    </div>
  );
}
