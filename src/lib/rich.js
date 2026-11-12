// Rich-text helpers: a strict sanitizer (whitelist only) and a parser that turns the
// sanitized markup into styled blocks for the canvas page. Used by the editor, the
// archive viewer, and the tear/burn page snapshot.

export const FAMS = ['hand', 'serif', 'sans'];
export const SIZES = ['s', 'n', 'l', 'xl'];
export const FAM_SCALE = { hand: 1, serif: 0.82, sans: 0.7 };
export const SIZE_MULT = { s: 0.8, n: 1, l: 1.3, xl: 1.8 };

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const plainToHtml = (text) =>
  (text || '')
    .split('\n')
    .map((l) => (l ? `<div>${esc(l)}</div>` : '<div><br></div>'))
    .join('');

export const famFromCss = (v = '') => {
  const s = String(v).toLowerCase();
  if (s.includes('caveat')) return 'hand';
  if (/sans|inter|arial|helvetica/.test(s)) return 'sans';
  if (/serif|georgia|newsreader|times/.test(s)) return 'serif';
  return null;
};

const colorOk = (v) => {
  if (!v) return null;
  const s = String(v).trim();
  if (/^(transparent|inherit|initial|unset|currentcolor)$/i.test(s) || /^rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/.test(s)) return null;
  if (/^#[0-9a-f]{3,8}$/i.test(s)) return s;
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*[\d.]+\s*)?\)$/i.test(s)) return s;
  return null;
};

const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'MATH', 'HEAD', 'META', 'LINK', 'TITLE', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'IMG', 'VIDEO', 'AUDIO', 'CANVAS']);
const BLOCKS = new Set(['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'LI', 'UL', 'OL']);

const parse = (html) => new DOMParser().parseFromString('<!doctype html><body>' + (html || ''), 'text/html');

function walk(src, dst) {
  for (const n of src.childNodes) {
    if (n.nodeType === 3) {
      dst.appendChild(document.createTextNode(n.textContent));
      continue;
    }
    if (n.nodeType !== 1) continue;
    const tag = n.tagName.toUpperCase();
    if (DROP.has(tag)) continue;
    if (tag === 'BR') {
      dst.appendChild(document.createElement('br'));
      continue;
    }
    if (BLOCKS.has(tag)) {
      const name = tag === 'UL' || tag === 'OL' || tag === 'LI' ? tag.toLowerCase() : 'div';
      const el = document.createElement(name);
      const al = (n.style && n.style.textAlign) || n.getAttribute('align') || '';
      if (/center/.test(al) || n.classList.contains('al-c')) el.className = 'al-c';
      else if (/right|end/.test(al) || n.classList.contains('al-r')) el.className = 'al-r';
      walk(n, el);
      dst.appendChild(el);
      continue;
    }
    // inline element: rebuild from semantics only
    const st = n.style || {};
    const cls = [...n.classList];
    const wraps = [];
    const span = (c) => {
      const e = document.createElement('span');
      if (c) e.className = c;
      return e;
    };
    const f = cls.find((c) => c.startsWith('f-'))?.slice(2);
    const fam = FAMS.includes(f) ? f : famFromCss(st.fontFamily || n.getAttribute('face') || '');
    if (fam) wraps.push(span('f-' + fam));
    const z = cls.find((c) => c.startsWith('sz-'))?.slice(3);
    if (SIZES.includes(z)) wraps.push(span('sz-' + z));
    const color = colorOk(st.color || n.getAttribute('color'));
    const bg = colorOk(st.backgroundColor);
    if (color || bg) {
      const e = span();
      if (color) e.style.color = color;
      if (bg) e.style.backgroundColor = bg;
      wraps.push(e);
    }
    const fw = st.fontWeight;
    if (tag === 'B' || tag === 'STRONG' || fw === 'bold' || fw === 'bolder' || Number(fw) >= 600) wraps.push(document.createElement('b'));
    if (tag === 'I' || tag === 'EM' || st.fontStyle === 'italic') wraps.push(document.createElement('i'));
    const deco = `${st.textDecorationLine || ''} ${st.textDecoration || ''}`;
    if (tag === 'U' || deco.includes('underline')) wraps.push(document.createElement('u'));
    if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || deco.includes('line-through')) wraps.push(document.createElement('s'));
    let parent = dst;
    for (const w of wraps) {
      parent.appendChild(w);
      parent = w;
    }
    walk(n, parent);
  }
}

/** Returns clean, whitelisted HTML. Safe to inject with dangerouslySetInnerHTML. */
export function sanitize(html) {
  if (!html) return '';
  const out = document.createElement('div');
  walk(parse(html).body, out);
  return out.innerHTML;
}

const BASE_ST = { b: false, i: false, u: false, s: false, color: null, bg: null, fam: 'hand', mult: 1 };

/** Sanitized HTML -> [{align, marker, runs:[{text, b,i,u,s,color,bg,fam,mult}]}] */
export function htmlToBlocks(html) {
  const doc = parse(html);
  const blocks = [];
  let cur = null;
  const open = (o = {}) => {
    cur = { align: o.align || 'l', marker: o.marker || null, runs: [] };
    blocks.push(cur);
  };
  const alignOf = (el, def) => (el.classList.contains('al-c') ? 'c' : el.classList.contains('al-r') ? 'r' : def);

  const go = (node, st, ctx) => {
    node.childNodes.forEach((c) => {
      if (c.nodeType === 3) {
        const t = c.textContent.replace(/ /g, ' ');
        if (!t) return;
        if (!cur) open({ align: ctx.align });
        cur.runs.push({ ...st, text: t });
        return;
      }
      if (c.nodeType !== 1) return;
      const tag = c.tagName.toUpperCase();
      if (tag === 'BR') {
        if (!cur) open({ align: ctx.align });
        cur.runs.push({ ...st, text: '\n' });
        return;
      }
      if (tag === 'UL' || tag === 'OL') {
        cur = null;
        go(c, st, { ...ctx, list: tag, counter: { n: 0 }, align: alignOf(c, ctx.align) });
        cur = null;
        return;
      }
      if (tag === 'LI') {
        cur = null;
        const marker = ctx.list === 'OL' ? `${(ctx.counter.n += 1)}.` : '•';
        open({ align: alignOf(c, ctx.align), marker });
        go(c, st, { ...ctx, inLi: true });
        cur = null;
        return;
      }
      if (tag === 'DIV' || tag === 'P') {
        if (ctx.inLi) {
          if (cur && cur.runs.length) cur.runs.push({ ...st, text: '\n' });
          go(c, st, ctx);
          return;
        }
        cur = null;
        go(c, st, { ...ctx, align: alignOf(c, ctx.align) });
        cur = null;
        return;
      }
      const s2 = { ...st };
      if (tag === 'B' || tag === 'STRONG') s2.b = true;
      if (tag === 'I' || tag === 'EM') s2.i = true;
      if (tag === 'U') s2.u = true;
      if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') s2.s = true;
      const f = [...c.classList].find((x) => x.startsWith('f-'))?.slice(2);
      if (FAM_SCALE[f]) {
        s2.fam = f;
        s2.mult = st.mult * FAM_SCALE[f];
      }
      const z = [...c.classList].find((x) => x.startsWith('sz-'))?.slice(3);
      if (SIZE_MULT[z]) s2.mult = SIZE_MULT[z]; // sizes are absolute, like the editor CSS
      if (c.style && c.style.color) s2.color = c.style.color;
      if (c.style && c.style.backgroundColor) s2.bg = c.style.backgroundColor;
      go(c, s2, ctx);
    });
  };
  go(doc.body, BASE_ST, { align: 'l' });

  // A trailing line-break inside a block is just how browsers end a line; a block that is only a
  // line-break is a deliberate blank line.
  blocks.forEach((b) => {
    const last = b.runs[b.runs.length - 1];
    if (last && last.text === '\n') {
      b.runs.pop();
      if (b.runs.length === 0) b.runs = [];
    }
  });
  return blocks;
}

export const blocksToPlain = (blocks) => blocks.map((b) => b.runs.map((r) => r.text).join('')).join('\n');
export const htmlToPlain = (html) => blocksToPlain(htmlToBlocks(html));
