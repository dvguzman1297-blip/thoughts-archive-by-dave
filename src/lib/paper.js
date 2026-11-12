// Renders the written page to a canvas so the Tear and Burn phases can
// operate on exactly what the user wrote (including their formatting).
import { htmlToBlocks, plainToHtml } from './rich';

const HAND = "Caveat, 'Noto Serif', 'Noto Serif CJK SC', 'Noto Naskh Arabic', Georgia, serif";
const SERIF = "Newsreader, Georgia, 'Noto Serif', 'Noto Serif CJK SC', 'Noto Naskh Arabic', serif";
const SANS = "Inter, system-ui, 'Noto Sans', 'Noto Sans CJK SC', sans-serif";
const BASE = 25; // px of "normal" handwriting
const INK = '#1f2a44';

export function pageLayout(vw, vh) {
  const W = Math.round(Math.min(1100, vw - (vw < 640 ? 16 : 24)));
  const H = Math.round(Math.max(340, vh - (vw < 640 ? 215 : 150)));
  return { W, H, x: Math.round((vw - W) / 2), y: Math.round(Math.max(60, (vh - H) / 2 - 6)) };
}

function wrapLines(ctx, text, maxW) {
  const lines = [];
  for (const para of text.split('\n')) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of para.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxW) {
        line = test;
        continue;
      }
      if (line) {
        lines.push(line);
        line = '';
      }
      if (ctx.measureText(word).width <= maxW) {
        line = word;
        continue;
      }
      for (const ch of Array.from(word)) {
        if (line && ctx.measureText(line + ch).width > maxW) {
          lines.push(line);
          line = ch;
        } else line += ch;
      }
    }
    lines.push(line);
  }
  return lines;
}

const fontFor = (r, px) => {
  const fam = r.fam || 'hand';
  const w = r.b ? 700 : fam === 'hand' ? 500 : 400;
  return `${r.i ? 'italic ' : ''}${w} ${px}px ${fam === 'hand' ? HAND : fam === 'serif' ? SERIF : SANS}`;
};

/** Word-wrap styled blocks into lines of positioned segments. */
function layoutBlocks(ctx, blocks, textW, k) {
  const row = 30 * k;
  const lines = [];
  const measure = (t, r, px) => {
    ctx.font = fontFor(r, px);
    return ctx.measureText(t).width;
  };
  for (const b of blocks) {
    const indent = b.marker ? 28 * k : 0;
    const maxW = textW - indent;
    let first = true;
    const fresh = () => {
      const l = { segs: [], w: 0, trail: 0, px: BASE * k, align: b.align, indent, marker: first ? b.marker : null, markerRun: b.runs[0] || { fam: 'hand', mult: 1 } };
      first = false;
      return l;
    };
    let line = fresh();
    const push = () => {
      lines.push(line);
      line = fresh();
    };
    const add = (t, r, px, w, isSpace) => {
      const last = line.segs[line.segs.length - 1];
      if (last && last.r === r && last.px === px) {
        last.t += t;
        last.w += w;
      } else line.segs.push({ t, r, px, w });
      line.w += w;
      line.trail = isSpace ? line.trail + w : 0;
      if (!isSpace) line.px = Math.max(line.px, px);
    };
    for (const r of b.runs) {
      const px = BASE * r.mult * k;
      for (const part of r.text.split(/(\n|[ \t]+)/)) {
        if (!part) continue;
        if (part === '\n') {
          push();
          continue;
        }
        if (/^[ \t]+$/.test(part)) {
          if (line.segs.length) add(' ', r, px, measure(' ', r, px), true);
          continue;
        }
        const w = measure(part, r, px);
        if (line.w + w > maxW && line.segs.length) push();
        if (w <= maxW) {
          add(part, r, px, w, false);
          continue;
        }
        for (const ch of Array.from(part)) {
          const cw = measure(ch, r, px);
          if (line.w + cw > maxW && line.segs.length) push();
          add(ch, r, px, cw, false);
        }
      }
    }
    lines.push(line);
  }
  lines.forEach((l) => {
    l.rows = Math.max(1, Math.ceil((l.px * 1.2) / row - 0.01));
  });
  return { lines, rows: lines.reduce((n, l) => n + l.rows, 0), row };
}

export async function makePageCanvas({ W, H, text, html, prompt, category, dateLabel, guide, dpr = 2 }) {
  try {
    await Promise.all([
      document.fonts.load('500 25px Caveat'),
      document.fonts.load('700 25px Caveat'),
      document.fonts.load('400 20px Newsreader'),
      document.fonts.load('italic 400 19px Newsreader'),
      document.fonts.load('400 17px Inter'),
      document.fonts.load('600 11px Inter'),
    ]);
  } catch {
    /* fonts optional */
  }
  const c = document.createElement('canvas');
  c.width = W * dpr;
  c.height = H * dpr;
  const x = c.getContext('2d');
  x.scale(dpr, dpr);

  x.fillStyle = '#F7F3EB';
  x.fillRect(0, 0, W, H);
  // paper grain
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2600; i++) {
    x.fillStyle = `rgba(120,90,50,${0.03 + rnd() * 0.06})`;
    x.fillRect(rnd() * W, rnd() * H, 1 + rnd(), 1 + rnd());
  }

  const narrow = W < 560;
  const padL = narrow ? 44 : 62;
  const marginX = narrow ? 30 : 46;
  const padR = narrow ? 16 : 30;
  const textW = W - padL - padR;

  // header
  x.fillStyle = 'rgba(180,83,42,.9)';
  x.font = '600 11px Inter, sans-serif';
  x.textBaseline = 'alphabetic';
  x.fillText((category || 'Free Write').toUpperCase(), padL, 36);
  x.fillStyle = 'rgba(38,34,30,.55)';
  x.textAlign = 'right';
  x.fillText(dateLabel, W - padR, 36);
  x.textAlign = 'left';

  let y = 62;
  if (prompt) {
    x.fillStyle = '#26221E';
    x.font = `italic 400 19px ${SERIF}`;
    for (const l of wrapLines(x, prompt, textW)) {
      x.fillText(l, padL, y);
      y += 26;
    }
    y += 2;
  }
  x.strokeStyle = 'rgba(38,34,30,.25)';
  x.beginPath();
  x.moveTo(padL, y);
  x.lineTo(W - padR, y);
  x.stroke();

  // lay out the body, shrinking everything a little if it would overflow the page
  const top = y + 8;
  const blocks = htmlToBlocks(html || plainToHtml(text));
  let lay;
  for (let k = 1; k >= 0.5; k -= 0.05) {
    lay = layoutBlocks(x, blocks, textW, k);
    if (lay.rows <= Math.floor((H - top - 22) / lay.row)) break;
  }
  const { lines, row } = lay;
  const rows = Math.floor((H - top - 12) / row);

  // guides
  if (guide === 'lines') {
    x.strokeStyle = 'rgba(70,90,120,.17)';
    for (let i = 1; i <= rows; i++) {
      const ly = top + i * row;
      x.beginPath();
      x.moveTo(0, ly);
      x.lineTo(W, ly);
      x.stroke();
    }
  } else if (guide === 'dots') {
    x.fillStyle = 'rgba(70,60,50,.3)';
    for (let i = 1; i <= rows; i++) for (let dx = 20; dx < W - 10; dx += 30) x.fillRect(dx, top + i * row, 1.4, 1.4);
  }
  x.strokeStyle = 'rgba(180,83,42,.4)';
  x.beginPath();
  x.moveTo(marginX, 0);
  x.lineTo(marginX, H);
  x.stroke();

  // body text
  let rowIdx = 0;
  for (const ln of lines) {
    if (rowIdx + ln.rows > rows) break;
    const baseY = top + (rowIdx + ln.rows) * row - row * 0.28;
    const avail = textW - ln.indent;
    const used = ln.w - ln.trail;
    const x0 = padL + ln.indent;
    let px = ln.align === 'c' ? x0 + (avail - used) / 2 : ln.align === 'r' ? x0 + avail - used : x0;
    if (ln.marker) {
      const mr = ln.markerRun;
      x.font = fontFor(mr, BASE * (mr.mult || 1) * (row / 30));
      x.fillStyle = INK;
      x.fillText(ln.marker, padL + ln.indent - 20 * (row / 30), baseY);
    }
    for (const sg of ln.segs) {
      x.font = fontFor(sg.r, sg.px);
      if (sg.r.bg) {
        x.fillStyle = sg.r.bg;
        x.fillRect(px, baseY - sg.px * 0.82, sg.w, sg.px * 1.02);
      }
      x.fillStyle = sg.r.color || INK;
      x.fillText(sg.t, px, baseY);
      if (sg.r.u || sg.r.s) {
        x.strokeStyle = sg.r.color || INK;
        x.lineWidth = Math.max(1, sg.px / 18);
        x.beginPath();
        const ly = sg.r.u ? baseY + 3 : baseY - sg.px * 0.3;
        x.moveTo(px, ly);
        x.lineTo(px + sg.w, ly);
        x.stroke();
        x.lineWidth = 1;
      }
      px += sg.w;
    }
    rowIdx += ln.rows;
  }

  // soft edge vignette + binding shade
  const g = x.createLinearGradient(0, 0, 22, 0);
  g.addColorStop(0, 'rgba(60,40,20,.12)');
  g.addColorStop(1, 'rgba(60,40,20,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 22, H);
  const v = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(120,90,50,0)');
  v.addColorStop(1, 'rgba(120,90,50,.16)');
  x.fillStyle = v;
  x.fillRect(0, 0, W, H);
  return c;
}
