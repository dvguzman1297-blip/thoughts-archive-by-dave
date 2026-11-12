import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Flame, Scissors, Hand } from 'lucide-react';
import { tearSound } from '../lib/audio';
import { apply, centroid, cutPolygon, IDENTITY, inv, mul, rotateAbout, segmentTouches, translate } from '../lib/tear';

const MIN_PIECES = 5;

export default function Tear({ snap, onBack, onDone }) {
  const { canvas, layout } = snap;
  const { W, H } = layout;
  const url = useMemo(() => canvas.toDataURL('image/jpeg', 0.92), [canvas]);
  const [pieces, setPiecesState] = useState(() => [
    { id: 0, pts: [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }], m: IDENTITY, next: null },
  ]);
  const ref = useRef(pieces);
  const setPieces = (p) => {
    ref.current = p;
    setPiecesState(p);
  };
  const [drag, setDrag] = useState(null);
  const [busy, setBusy] = useState(false);
  const idRef = useRef(1);
  const seedRef = useRef(1 + Math.random() * 50);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const world = (m, pts) => pts.map((p) => apply(m, p));

  /** Cut every piece that segment A-B touches (A,B in page coordinates). */
  const applyCut = (A, B) => {
    let did = false;
    const next = [];
    for (const p of ref.current) {
      const M = p.next || p.m;
      if (!segmentTouches(A, B, world(M, p.pts))) {
        next.push(p);
        continue;
      }
      const im = inv(M);
      const res = cutPolygon(p.pts, apply(im, A), apply(im, B), (seedRef.current += 1.7));
      if (!res) {
        next.push(p);
        continue;
      }
      did = true;
      const [l, r, n] = res;
      // world-space normal (linear part only)
      const wn = { x: M[0] * n.x + M[2] * n.y, y: M[1] * n.x + M[3] * n.y };
      const wl = Math.hypot(wn.x, wn.y) || 1;
      [[l, 1], [r, -1]].forEach(([pts, s]) => {
        const c = apply(M, centroid(pts));
        const sep = 5 + Math.random() * 7;
        const th = ((0.8 + Math.random() * 2.4) * Math.PI) / 180 * s * (Math.random() < 0.5 ? 1 : -0.6);
        const fin = mul(translate((wn.x / wl) * sep * s, (wn.y / wl) * sep * s), mul(rotateAbout(th, c.x, c.y), M));
        next.push({ id: idRef.current++, pts, m: M, next: fin });
      });
    }
    if (did) {
      setPieces(next);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setPieces(ref.current.map((q) => (q.next ? { ...q, m: q.next, next: null } : q)))),
      );
    }
    return did;
  };

  const toPage = (e) => ({ x: e.clientX - layout.x, y: e.clientY - layout.y });
  const down = (e) => {
    if (busy) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = toPage(e);
    setDrag({ a: p, b: p });
  };
  const move = (e) => drag && setDrag({ ...drag, b: toPage(e) });
  const up = () => {
    if (!drag) return;
    const len = Math.hypot(drag.b.x - drag.a.x, drag.b.y - drag.a.y);
    if (len > 50 && applyCut(drag.a, drag.b)) tearSound(len / 420);
    setDrag(null);
  };

  const shred = () => {
    if (busy) return;
    setBusy(true);
    const n = 6;
    for (let i = 0; i < n; i++) {
      timers.current.push(
        setTimeout(() => {
          const c = { x: W * (0.2 + Math.random() * 0.6), y: H * (0.15 + Math.random() * 0.7) };
          const a = Math.random() * Math.PI;
          const d = { x: Math.cos(a) * 900, y: Math.sin(a) * 900 };
          const A = { x: c.x - d.x, y: c.y - d.y };
          const B = { x: c.x + d.x, y: c.y + d.y };
          // touch test uses the segment, so aim it across the piece nearest the centre
          if (applyCut(A, B)) tearSound(0.5 + Math.random() * 0.5);
          if (i === n - 1) setBusy(false);
        }, i * 230),
      );
    }
  };

  const ready = pieces.length >= MIN_PIECES;

  return (
    <div className="fixed inset-0 z-20 select-none animate-fadeUp" style={{ touchAction: 'none', cursor: busy ? 'default' : 'crosshair' }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)}>
      {pieces.map((p) => (
        <div key={p.id} className="absolute pointer-events-none" style={{ left: layout.x, top: layout.y, width: W, height: H, filter: 'drop-shadow(0 7px 7px rgba(0,0,0,.5))' }}>
          <div
            style={{
              width: W,
              height: H,
              backgroundImage: `url(${url})`,
              backgroundSize: '100% 100%',
              clipPath: `polygon(${p.pts.map((q) => `${q.x.toFixed(1)}px ${q.y.toFixed(1)}px`).join(',')})`,
              transform: `matrix(${p.m.join(',')})`,
              transformOrigin: '0 0',
              transition: 'transform .5s cubic-bezier(.16,.9,.3,1)',
            }}
          />
        </div>
      ))}

      {drag && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <line x1={drag.a.x + layout.x} y1={drag.a.y + layout.y} x2={drag.b.x + layout.x} y2={drag.b.y + layout.y} stroke="#E85D2A" strokeWidth="2.5" strokeDasharray="2 9" strokeLinecap="round" />
          <circle cx={drag.b.x + layout.x} cy={drag.b.y + layout.y} r="5" fill="#E85D2A" />
        </svg>
      )}

      <div className="absolute inset-x-0 bottom-0 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex justify-center" onPointerDown={(e) => e.stopPropagation()}>
        <div className="glass-bar px-3 sm:px-4 py-2.5 sm:py-3 flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto max-w-full animate-fadeUp [&_.btn]:px-4 [&_.btn]:py-2">
          <span className="flex items-center gap-2 text-xs sm:text-sm text-paper/80 sm:pr-2 basis-full sm:basis-auto justify-center">
            <Hand size={16} className="text-ember shrink-0" />
            {ready ? 'Torn enough. Tear on, or go to the fire.' : `Swipe across the page to rip it (${pieces.length}/${MIN_PIECES} pieces)`}
          </span>
          <button className="btn btn-ghost-dark" onClick={onBack} disabled={busy}>
            <ArrowLeft size={16} /> Put it back
          </button>
          <button className="btn btn-ghost-dark" onClick={shred} disabled={busy}>
            <Scissors size={16} /> Tear it all
          </button>
          <button className="btn btn-ember" disabled={!ready || busy} onClick={() => onDone(ref.current.map((p) => ({ ...p, m: p.next || p.m, next: null })))}>
            <Flame size={16} /> To the fire
          </button>
        </div>
      </div>
    </div>
  );
}
