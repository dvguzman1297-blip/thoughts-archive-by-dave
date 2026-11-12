// Renders the written page to a canvas so the Tear and Burn phases can
// operate on exactly what the user wrote.

const SERIF = "Newsreader, Georgia, 'Noto Serif', 'Noto Serif CJK SC', 'Noto Naskh Arabic', serif";

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
    // Split on spaces, and break over-long words (or space-less scripts such as
    // Chinese/Japanese) per code point so nothing runs off the page.
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

export async function makePageCanvas({ W, H, text, prompt, category, dateLabel, guide, dpr = 2 }) {
  try {
    await Promise.all([document.fonts.load('400 20px Newsreader'), document.fonts.load('italic 400 19px Newsreader'), document.fonts.load('600 11px Inter')]);
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

  // fit body text
  const top = y + 8;
  let size = 20;
  let lines;
  for (;;) {
    x.font = `400 ${size}px ${SERIF}`;
    lines = wrapLines(x, text, textW);
    const cap = Math.floor((H - top - 22) / (size * 1.5));
    if (lines.length <= cap || size <= 11) break;
    size -= 1;
  }
  const LH = size * 1.5;

  // guides
  const rows = Math.floor((H - top - 12) / LH);
  if (guide === 'lines') {
    x.strokeStyle = 'rgba(70,90,120,.17)';
    for (let i = 1; i <= rows; i++) {
      const ly = top + i * LH;
      x.beginPath();
      x.moveTo(0, ly);
      x.lineTo(W, ly);
      x.stroke();
    }
  } else if (guide === 'dots') {
    x.fillStyle = 'rgba(70,60,50,.3)';
    for (let i = 1; i <= rows; i++) for (let dx = 20; dx < W - 10; dx += 30) x.fillRect(dx, top + i * LH, 1.4, 1.4);
  }
  x.strokeStyle = 'rgba(180,83,42,.4)';
  x.beginPath();
  x.moveTo(marginX, 0);
  x.lineTo(marginX, H);
  x.stroke();

  x.fillStyle = '#26221E';
  x.font = `400 ${size}px ${SERIF}`;
  lines.slice(0, rows).forEach((l, i) => x.fillText(l, padL, top + (i + 1) * LH - LH * 0.28));

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
