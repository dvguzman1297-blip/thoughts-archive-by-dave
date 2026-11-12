import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Cloud, CloudOff, BookOpen, Volume2, VolumeX, Archive as ArchiveIcon, Pencil, Scissors, Flame, Sprout } from 'lucide-react';
import { CATEGORIES, PROMPTS, catById, computeUnlock, promptById } from './data/content';
import { K, fmtLong, seal, uid, usePersisted, wordCount, dailyIndex } from './lib/util';
import { chime, setMuted } from './lib/audio';
import { makePageCanvas, pageLayout } from './lib/paper';
import Write from './components/Write';
import Tear from './components/Tear';
import Burn from './components/Burn';
import Heal from './components/Heal';
import Archive from './components/Archive';
import Settings from './components/Settings';
import CloudPanel from './components/CloudPanel';
import { useCloud } from './lib/cloud';

const STEPS = [
  { id: 'write', label: 'Write', icon: Pencil },
  { id: 'tear', label: 'Tear', icon: Scissors },
  { id: 'burn', label: 'Burn', icon: Flame },
  { id: 'heal', label: 'Heal', icon: Sprout },
];

export default function App() {
  const [settings, setSettings] = usePersisted(K.settings, { muted: false, guide: 'lines', hideStreak: false, offsetMs: 0 });
  const [ashes, setAshes] = usePersisted(K.ashes, []);
  const [heals, setHeals] = usePersisted(K.heals, []);
  const [draft, setDraft] = usePersisted(K.draft, { text: '', promptId: null, free: false, lock: '90d', cat: 'all' });

  const NO_PENDING = { ashId: null, cat: 'any', hpId: null, aff: null, own: '', text: '', mood: null };
  const [pending, setPending] = usePersisted(K.pending, NO_PENDING);

  const [view, setView] = useState('ritual'); // ritual | archive
  // If the page was already burned but the heal was never finished, resume at Heal.
  const [phase, setPhase] = useState(() => (pending.ashId ? 'heal' : 'write'));
  const [tab, setTab] = useState('heal');
  const [snap, setSnap] = useState(null);
  const [pieces, setPieces] = useState(null);
  const [ashId, setAshId] = useState(pending.ashId);
  const [healCat, setHealCat] = useState(pending.cat || 'any');
  const [toastMsg, setToastMsg] = useState(null);
  const toastTimer = useRef(null);

  /* ---- cross-device sync (optional; local-only until Supabase is configured) ---- */
  const [meta, setMeta] = usePersisted(K.meta, { draftAt: 0, pendingAt: 0, deleted: [] });
  const [cloudOpen, setCloudOpen] = useState(false);
  const lastDraft = useRef(JSON.stringify(draft));
  const lastPending = useRef(JSON.stringify(pending));
  // Stamp edit times so the newest draft wins between devices.
  useEffect(() => {
    const j = JSON.stringify(draft);
    if (j === lastDraft.current) return;
    lastDraft.current = j;
    setMeta((m) => ({ ...m, draftAt: Date.now() }));
  }, [draft, setMeta]);
  useEffect(() => {
    const j = JSON.stringify(pending);
    if (j === lastPending.current) return;
    lastPending.current = j;
    setMeta((m) => ({ ...m, pendingAt: Date.now() }));
  }, [pending, setMeta]);
  const applyRemote = useCallback(
    (m) => {
      lastDraft.current = JSON.stringify(m.draft);
      lastPending.current = JSON.stringify(m.pending);
      setAshes(m.ashes);
      setHeals(m.heals);
      setDraft(m.draft);
      setPending(m.pending);
      setMeta({ draftAt: m.draftAt, pendingAt: m.pendingAt, deleted: m.deleted });
    },
    [setAshes, setHeals, setDraft, setPending, setMeta],
  );
  const cloud = useCloud({
    snapshot: { ashes, heals, deleted: meta.deleted || [], draft, draftAt: meta.draftAt || 0, pending, pendingAt: meta.pendingAt || 0 },
    apply: applyRemote,
  });

  const nowMs = useCallback(() => Date.now() + (settings.offsetMs || 0), [settings.offsetMs]);
  useEffect(() => setMuted(settings.muted), [settings.muted]);
  useEffect(() => {
    document.title = 'Thoughts Archived by Dave';
    if (pending.ashId) toast('Welcome back. Your page is already ash. Finish your heal whenever you are ready.');
    else if (draft.text.trim()) toast('Welcome back. Your draft was saved exactly where you left it.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toast = (m) => {
    setToastMsg(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3800);
  };

  const activePrompt = () => promptById(draft.promptId) || PROMPTS[dailyIndex(PROMPTS.length)];

  const beginTear = async () => {
    const p = activePrompt();
    const layout = pageLayout(window.innerWidth, window.innerHeight);
    const canvas = await makePageCanvas({
      W: layout.W,
      H: layout.H,
      text: draft.text,
      prompt: draft.free ? '' : p.text,
      category: draft.free ? 'Free Write' : catById(p.cat).name,
      dateLabel: fmtLong(nowMs()),
      guide: settings.guide,
    });
    setSnap({ canvas, layout });
    setPhase('tear');
  };

  const onIgnite = () => {
    // The page leaves the active journal the moment it catches fire.
    const p = activePrompt();
    const born = nowMs();
    const ash = {
      id: uid(),
      burnedAt: born,
      unlockAt: computeUnlock(born, draft.lock),
      lock: draft.lock,
      category: draft.free ? 'Free Write' : catById(p.cat).name,
      prompt: draft.free ? '' : p.text,
      sealed: seal(draft.text),
      words: wordCount(draft.text),
    };
    setAshes((a) => [ash, ...a]);
    setAshId(ash.id);
    setHealCat(draft.free ? 'any' : p.cat);
    setPending({ ...NO_PENDING, ashId: ash.id, cat: draft.free ? 'any' : p.cat });
    setDraft({ ...draft, text: '', promptId: null });
  };

  const onBurnDone = () => {
    setPhase('heal');
    chime();
  };

  const saveHeal = ({ prompt, reflection, affirmation, mood }) => {
    const ash = ashes.find((a) => a.id === ashId);
    setHeals((h) => [{ id: uid(), date: nowMs(), ashId, category: ash?.category || 'Free Write', prompt, reflection, affirmation, mood }, ...h]);
    setPending(NO_PENDING);
  };

  const restart = () => {
    setPending(NO_PENDING);
    setPhase('write');
    setSnap(null);
    setPieces(null);
    setAshId(null);
    setView('ritual');
  };

  const wipe = () => {
    // Remember what was erased so other devices drop it too instead of re-syncing it back.
    setMeta((m) => ({ ...m, deleted: [...(m.deleted || []), ...ashes.map((a) => a.id), ...heals.map((h) => h.id)] }));
    setAshes([]);
    setHeals([]);
    setDraft({ text: '', promptId: null, free: false, lock: '90d', cat: 'all' });
    setSettings({ ...settings, offsetMs: 0 });
    restart();
    toast('Everything has been cleared.');
  };

  // Login comes first: until signed in and unlocked, show only the sign-in page.
  const [skipLogin, setSkipLogin] = useState(() => {
    try {
      return localStorage.getItem('tav.skipLogin') === '1';
    } catch {
      return false;
    }
  });
  // Once signed in, signing out later should bring the login page back.
  useEffect(() => {
    if (!cloud.user) return;
    try {
      localStorage.removeItem('tav.skipLogin');
    } catch {
      /* ignore */
    }
    setSkipLogin(false);
  }, [cloud.user]);
  if (cloud.enabled && !skipLogin && (!cloud.authReady || !cloud.user || !cloud.ready)) {
    return (
      <CloudPanel
        page
        cloud={cloud}
        onSkip={() => {
          try {
            localStorage.setItem('tav.skipLogin', '1');
          } catch {
            /* ignore */
          }
          setSkipLogin(true);
        }}
      />
    );
  }

  const light = (view === 'ritual' && phase === 'heal') || (view === 'archive' && tab === 'heal');
  const inStage = view === 'ritual' && (phase === 'tear' || phase === 'burn');
  const stepIndex = STEPS.findIndex((s) => s.id === phase);

  return (
    <div className={`relative min-h-screen transition-colors ease-in-out ${light ? 'bg-sage text-ink' : 'bg-desk text-paper'}`} style={{ transitionDuration: '2200ms' }}>
      {/* desk-lamp light */}
      <div className="pointer-events-none fixed inset-0 transition-opacity duration-[2200ms]" style={{ opacity: light ? 0 : 1, background: 'radial-gradient(ellipse 70% 55% at 50% 0%, rgba(255,186,110,.13), transparent 70%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,.5), transparent 70%)' }} />
      {/* daylight */}
      <div className="pointer-events-none fixed inset-0 transition-opacity duration-[2200ms]" style={{ opacity: light ? 1 : 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,248,.9), transparent 70%), linear-gradient(180deg, transparent 60%, rgba(94,127,106,.10))' }} />

      {/* header */}
      <header className={`fixed top-0 inset-x-0 z-40 transition-colors duration-700 ${light ? 'bg-sage/70' : 'bg-desk/70'} backdrop-blur-md`}>
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-2 px-3 sm:px-4 h-14 pt-[env(safe-area-inset-top)] box-content">
          <button onClick={() => !inStage && setView('ritual')} className="flex items-baseline gap-1.5 sm:gap-2 text-left min-w-0">
            <BookOpen size={18} className={`shrink-0 ${light ? 'text-botanical self-center' : 'text-ember self-center'}`} />
            <span className="font-serif text-base sm:text-lg leading-none truncate">Thoughts Archived</span>
            <span className={`font-serif italic text-xs sm:text-sm shrink-0 ${light ? 'text-ink/55' : 'text-paper/55'}`}>by Dave</span>
          </button>

          {view === 'ritual' && (
            <span className={`md:hidden text-[11px] font-sans font-medium rounded-full px-2.5 py-1 shrink-0 ${light ? 'bg-botanical text-white' : 'bg-terra text-paper'}`}>
              {stepIndex + 1}/4 {STEPS[stepIndex]?.label}
            </span>
          )}
          {view === 'ritual' && (
            <ol className="hidden md:flex items-center gap-1 text-xs font-sans">
              {STEPS.map((s, i) => (
                <li key={s.id} className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition-all duration-500 ${i === stepIndex ? (light ? 'bg-botanical text-white' : 'bg-terra text-paper') : i < stepIndex ? 'opacity-70' : 'opacity-35'}`}>
                  <s.icon size={12} /> {s.label}
                </li>
              ))}
            </ol>
          )}

          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <button
              disabled={inStage}
              onClick={() => setView(view === 'archive' ? 'ritual' : 'archive')}
              className={`chip inline-flex items-center gap-1.5 disabled:opacity-30 ${light ? 'border-botanical/30 text-ink hover:bg-white/60' : 'border-white/15 text-paper hover:bg-white/10'}`}
              title={inStage ? 'Finish the ritual first' : ''}
            >
              {view === 'archive' ? <Pencil size={13} /> : <ArchiveIcon size={13} />}
              <span className="hidden sm:inline">{view === 'archive' ? 'Back to journal' : 'Sanctuary Archive'}</span>
              <span className="sm:hidden">{view === 'archive' ? 'Journal' : 'Archive'}</span>
            </button>
            <button onClick={() => setCloudOpen(true)} className={`relative p-2 rounded-full transition ${light ? 'hover:bg-black/5 text-ink/70' : 'hover:bg-white/10 text-paper/70'}`} aria-label="Sync across devices" title={cloud.ready ? 'Synced across devices' : 'Sync across devices'}>
              {cloud.enabled ? <Cloud size={18} /> : <CloudOff size={18} />}
              {cloud.ready && <span className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full ${cloud.status === 'error' ? 'bg-red-500' : cloud.status === 'syncing' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />}
            </button>
            <button onClick={() => setSettings({ ...settings, muted: !settings.muted })} className={`p-2 rounded-full transition ${light ? 'hover:bg-black/5 text-ink/70' : 'hover:bg-white/10 text-paper/70'}`} aria-label={settings.muted ? 'Unmute' : 'Mute'} title={settings.muted ? 'Unmute' : 'Mute'}>
              {settings.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <Settings settings={settings} setSettings={setSettings} nowMs={nowMs} onWipe={wipe} light={light} />
          </div>
        </div>
      </header>

      {view === 'archive' ? (
        <Archive tab={tab} setTab={setTab} heals={heals} ashes={ashes} settings={settings} setSettings={setSettings} nowMs={nowMs} toast={toast} onDeleteAsh={(id) => {
          setAshes((a) => a.filter((x) => x.id !== id));
          setMeta((m) => ({ ...m, deleted: [...(m.deleted || []), id] }));
        }} />
      ) : (
        <>
          {phase === 'write' && <Write key="w" draft={draft} setDraft={setDraft} settings={settings} setSettings={setSettings} nowMs={nowMs} onContinue={beginTear} />}
          {phase === 'tear' && snap && (
            <Tear
              snap={snap}
              onBack={() => {
                setPhase('write');
                setSnap(null);
              }}
              onDone={(p) => {
                setPieces(p);
                setPhase('burn');
              }}
            />
          )}
          {phase === 'burn' && snap && pieces && <Burn snap={snap} pieces={pieces} onIgnite={onIgnite} onDone={onBurnDone} />}
          {phase === 'heal' && <Heal key="h" catId={healCat} nowMs={nowMs} pending={pending} setPending={setPending} onSave={saveHeal} onArchive={() => { setTab('heal'); setView('archive'); }} onRestart={restart} />}
        </>
      )}

      {cloudOpen && <CloudPanel cloud={cloud} onClose={() => setCloudOpen(false)} />}

      {toastMsg && (
        <div className="fixed bottom-6 inset-x-0 z-[60] flex justify-center px-4 pointer-events-none">
          <div className="animate-fadeUp rounded-full bg-paper text-ink px-5 py-3 text-sm shadow-2xl shadow-black/50 max-w-md text-center">{toastMsg}</div>
        </div>
      )}
    </div>
  );
}
