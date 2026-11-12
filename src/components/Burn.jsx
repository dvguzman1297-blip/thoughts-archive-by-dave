import React, { useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { fireSound, stopFireSound } from '../lib/audio';
import { apply, pointInPoly } from '../lib/tear';

const BURN_SECONDS = 9;
const ease = (t) => t * t * (3 - 2 * t);
const wob = (a, seed, time) => Math.sin(a * 3 + seed) * 0.5 + Math.sin(a * 7 + seed * 1.7 + time * 2.2) * 0.3 + Math.sin(a * 13 + seed * 2.1 - time * 1.3) * 0.2;

function blob(ctx, cx, cy, r, seed, time) {
  ctx.beginPath();
  const n = 56;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = Math.max(0.1, r * (1 + 0.13 * wob(a, seed, time)));
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

export default function Burn({ snap, pieces, onIgnite, onDone }) {
  const { canvas, layout } = snap;
  const cvs = useRef(null);
  const [stage, setStage] = useState('ready'); // ready | burning | ash
  const startRef = useRef(null);
  const state = useRef({});

  useEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const el = cvs.current;
    el.width = vw * dpr;
    el.height = vh * dpr;
    const ctx = el.getContext('2d');
    const scratch = document.createElement('canvas');
    scratch.width = el.width;
    scratch.height = el.height;
    const sx = scratch.getContext('2d');

    // Prepare burn data per piece
    const prepared = pieces.map((p, i) => {
      const lowest = p.pts.reduce((a, b) => (apply(p.m, b).y > apply(p.m, a).y ? b : a));
      let cx = 0;
      let cy = 0;
      p.pts.forEach((q) => {
        cx += q.x;
        cy += q.y;
      });
      cx /= p.pts.length;
      cy /= p.pts.length;
      const ig = { x: lowest.x + (cx - lowest.x) * 0.12, y: lowest.y + (cy - lowest.y) * 0.12 };
      const maxR = Math.max(...p.pts.map((q) => Math.hypot(q.x - ig.x, q.y - ig.y))) * 1.18 + 26;
      return { ...p, ig, maxR, seed: i * 3.7 + 1, dur: 3 + Math.random() * 1.4, delay: 0, done: false };
    });
    // ignite nearest-first from the first piece
    const first = prepared[Math.floor(Math.random() * prepared.length)];
    const fw = apply(first.m, first.ig);
    prepared.forEach((p) => {
      const w = apply(p.m, p.ig);
      p.order = Math.hypot(w.x - fw.x, w.y - fw.y);
    });
    [...prepared]
      .sort((a, b) => a.order - b.order)
      .forEach((p, rank, arr) => {
        p.delay = (rank / Math.max(1, arr.length)) * 4.6 + Math.random() * 0.25;
      });
    const end = Math.max(...prepared.map((p) => p.delay + p.dur));
    state.current = { prepared, end, particles: [], doneAt: null, finished: false };

    const ox = layout.x;
    const oy = layout.y;
    const { W, H } = layout;

    const toWorld = (m, q) => {
      const w = apply(m, q);
      return { x: w.x + ox, y: w.y + oy };
    };

    const spawn = (p, r, time, t) => {
      const S = state.current;
      for (let k = 0; k < 4; k++) {
        const a = Math.random() * Math.PI * 2;
        const rr = r * (1 + 0.13 * wob(a, p.seed, time));
        const q = { x: p.ig.x + Math.cos(a) * rr, y: p.ig.y + Math.sin(a) * rr };
        if (!pointInPoly(q, p.pts)) continue;
        const w = toWorld(p.m, q);
        const roll = Math.random();
        if (roll < 0.5) S.particles.push({ k: 'ember', x: w.x, y: w.y, vx: (Math.random() - 0.5) * 36, vy: -30 - Math.random() * 70, life: 0, max: 0.9 + Math.random() * 1.4, s: 1 + Math.random() * 2 });
        else if (roll < 0.78) S.particles.push({ k: 'ash', x: w.x, y: w.y, vx: (Math.random() - 0.5) * 24, vy: -14 - Math.random() * 30, life: 0, max: 3 + Math.random() * 3, s: 2 + Math.random() * 4, rot: Math.random() * 6, sw: Math.random() * 6 });
        else S.particles.push({ k: 'smoke', x: w.x, y: w.y, vx: (Math.random() - 0.5) * 14, vy: -18 - Math.random() * 28, life: 0, max: 2.4 + Math.random() * 2, s: 14 + Math.random() * 22 });
        break;
      }
    };

    let raf;
    let last = performance.now();
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const S = state.current;
      const t = startRef.current == null ? -1 : (now - startRef.current) / 1000;
      const time = now / 1000;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, vh);

      // Ambient ember glow from below while burning
      if (t >= 0) {
        const inten = Math.min(1, t / 1.5) * (1 - Math.max(0, (t - S.end) / 3));
        const g = ctx.createRadialGradient(vw / 2, vh * 0.78, 20, vw / 2, vh * 0.78, vh * 0.8);
        g.addColorStop(0, `rgba(232,93,42,${0.28 * inten})`);
        g.addColorStop(1, 'rgba(232,93,42,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, vw, vh);
      }

      // Pieces
      const glows = [];
      for (const p of S.prepared) {
        if (p.done) continue;
        const prog = t < 0 ? -1 : Math.max(0, Math.min(1, (t - p.delay) / p.dur));
        const r = prog <= 0 ? -1 : ease(prog) * p.maxR;
        if (prog >= 1) {
          p.done = true;
          continue;
        }
        sx.setTransform(dpr, 0, 0, dpr, 0, 0);
        sx.clearRect(0, 0, vw, vh);
        sx.save();
        sx.translate(ox, oy);
        // slight curl as it burns
        const lift = prog > 0 ? Math.sin(prog * Math.PI) * 3 : 0;
        sx.transform(p.m[0], p.m[1], p.m[2], p.m[3], p.m[4], p.m[5] - lift);
        sx.beginPath();
        p.pts.forEach((q, i) => (i ? sx.lineTo(q.x, q.y) : sx.moveTo(q.x, q.y)));
        sx.closePath();
        sx.save();
        sx.clip();
        sx.drawImage(canvas, 0, 0, W, H);
        sx.restore();
        if (r > 0) {
          sx.globalCompositeOperation = 'source-atop';
          const g = sx.createRadialGradient(p.ig.x, p.ig.y, Math.max(1, r), p.ig.x, p.ig.y, r + 30);
          g.addColorStop(0, 'rgba(255,170,60,.95)');
          g.addColorStop(0.35, 'rgba(232,93,42,.75)');
          g.addColorStop(1, 'rgba(232,93,42,0)');
          blob(sx, p.ig.x, p.ig.y, r + 30, p.seed, time);
          sx.fillStyle = g;
          sx.fill();
          blob(sx, p.ig.x, p.ig.y, r + 11, p.seed, time);
          sx.fillStyle = '#2a1a12';
          sx.fill();
          blob(sx, p.ig.x, p.ig.y, r + 4, p.seed, time);
          sx.fillStyle = '#0f0a08';
          sx.fill();
          sx.globalCompositeOperation = 'destination-out';
          blob(sx, p.ig.x, p.ig.y, r, p.seed, time);
          sx.fill();
          sx.globalCompositeOperation = 'source-over';
          spawn(p, r, time, t);
          const gw = toWorld(p.m, p.ig);
          glows.push({ x: gw.x, y: gw.y, r: Math.min(p.maxR, r + 30) });
        }
        sx.restore();
        // soft shadow under unburnt paper
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.5)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 6;
        ctx.drawImage(scratch, 0, 0, vw, vh);
        ctx.restore();
      }
      // additive glow around burning fronts
      ctx.globalCompositeOperation = 'lighter';
      for (const g of glows) {
        const gr = ctx.createRadialGradient(g.x, g.y, g.r * 0.6, g.x, g.y, g.r + 40);
        gr.addColorStop(0, 'rgba(232,93,42,0.0)');
        gr.addColorStop(0.7, 'rgba(232,93,42,.10)');
        gr.addColorStop(1, 'rgba(232,93,42,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(g.x - g.r - 50, g.y - g.r - 50, (g.r + 50) * 2, (g.r + 50) * 2);
      }
      ctx.globalCompositeOperation = 'source-over';

      // Particles
      const ps = S.particles;
      for (let i = ps.length - 1; i >= 0; i--) {
        const q = ps[i];
        q.life += dt;
        if (q.life >= q.max) {
          ps.splice(i, 1);
          continue;
        }
        const u = q.life / q.max;
        if (q.k === 'ember') {
          q.vy -= 12 * dt;
          q.x += (q.vx + Math.sin(q.life * 9 + q.s) * 14) * dt;
          q.y += q.vy * dt;
          ctx.globalCompositeOperation = 'lighter';
          const a = (1 - u) * (0.6 + 0.4 * Math.sin(q.life * 30));
          ctx.fillStyle = `rgba(255,${130 + Math.floor((1 - u) * 90)},50,${a})`;
          ctx.beginPath();
          ctx.arc(q.x, q.y, q.s * (1 - u * 0.6), 0, 6.283);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        } else if (q.k === 'ash') {
          q.x += (q.vx + Math.sin(q.life * 2 + q.sw) * 16) * dt;
          q.y += q.vy * dt;
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(q.rot + q.life * 1.5);
          ctx.fillStyle = `rgba(${70 + Math.floor(u * 60)},${62 + Math.floor(u * 50)},${58 + Math.floor(u * 40)},${(1 - u) * 0.85})`;
          ctx.fillRect(-q.s, -q.s * 0.45, q.s * 2, q.s * 0.9);
          ctx.restore();
        } else {
          q.x += q.vx * dt;
          q.y += q.vy * dt;
          const rr = q.s * (1 + u * 2.4);
          const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, rr);
          g.addColorStop(0, `rgba(120,108,100,${0.16 * (1 - u)})`);
          g.addColorStop(1, 'rgba(120,108,100,0)');
          ctx.fillStyle = g;
          ctx.fillRect(q.x - rr, q.y - rr, rr * 2, rr * 2);
        }
      }

      // Finish
      if (t >= 0 && t > S.end && !S.doneAt && S.prepared.every((p) => p.done)) {
        S.doneAt = now;
        setStage('ash');
      }
      if (S.doneAt && !S.finished && now - S.doneAt > 2600) {
        S.finished = true;
        onDone();
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      stopFireSound();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ignite = () => {
    if (stage !== 'ready') return;
    startRef.current = performance.now();
    setStage('burning');
    fireSound(BURN_SECONDS + 2);
    onIgnite();
  };

  return (
    <div className="fixed inset-0 z-20">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 85%, rgba(232,93,42,.10), transparent 60%)' }} />
      <canvas ref={cvs} className="absolute inset-0 w-full h-full" />
      {stage === 'ready' && (
        <div className="absolute inset-x-0 bottom-0 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex justify-center px-3 animate-fadeUp">
          <div className="glass-bar px-4 sm:px-5 py-3 flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto">
            <span className="text-xs sm:text-sm text-paper/80 text-center">These pieces are ready to go. Burning seals them in the Ashes Vault.</span>
            <button className="btn btn-ember" onClick={ignite}>
              <Flame size={16} /> Strike the match
            </button>
          </div>
        </div>
      )}
      {stage === 'ash' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="font-serif italic text-2xl md:text-3xl text-paper/80 animate-fadeUp text-center px-6">It is ash now. It is safe, and it is out of you.</p>
        </div>
      )}
    </div>
  );
}
