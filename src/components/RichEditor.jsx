import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Type, Palette, Highlighter, RemoveFormatting, ALargeSmall } from 'lucide-react';
import { famFromCss, htmlToPlain, plainToHtml, sanitize } from '../lib/rich';

const COLORS = [['Navy ink', '#1f2a44'], ['Black', '#26221E'], ['Terracotta', '#B4532A'], ['Forest', '#3f6b4f'], ['Plum', '#6b3f7a'], ['Ocean', '#2a6f86']];
const MARKS = [['Yellow', '#fff2a8'], ['Rose', '#ffd1dc'], ['Sage', '#cfe5d3'], ['Sky', '#cfe3f5']];
const FONTS = [['hand', 'Handwriting', 'Caveat'], ['serif', 'Serif', 'Newsreader'], ['sans', 'Clean sans', 'Inter']];
const SIZES = [['s', 'Small'], ['n', 'Normal'], ['l', 'Large'], ['xl', 'Huge']];
const FAM_CLASSES = ['f-hand', 'f-serif', 'f-sans'];
const SZ_CLASSES = ['sz-s', 'sz-n', 'sz-l', 'sz-xl'];

/** Turn the browser's inline font-family / font-size output into our class-based styles, in place. */
function fixup(root, size) {
  root.querySelectorAll('[style*="font-family"],font[face]').forEach((e) => {
    const f = famFromCss(e.style.fontFamily || e.getAttribute('face') || '');
    e.style.removeProperty('font-family');
    e.removeAttribute('face');
    if (f) {
      [e, ...e.querySelectorAll('[class*="f-"]')].forEach((x) => x.classList.remove(...FAM_CLASSES));
      e.classList.add('f-' + f);
    }
    if (!e.getAttribute('style')) e.removeAttribute('style');
  });
  root.querySelectorAll('[style*="font-size"],font[size]').forEach((e) => {
    e.style.removeProperty('font-size');
    e.removeAttribute('size');
    [e, ...e.querySelectorAll('[class*="sz-"]')].forEach((x) => x.classList.remove(...SZ_CLASSES));
    e.classList.add('sz-' + size);
    if (!e.getAttribute('style')) e.removeAttribute('style');
  });
}

const Btn = ({ on, label, onClick, children }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    aria-pressed={on}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={`h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg transition active:scale-95 ${on ? 'bg-terra text-paper' : 'text-ink/70 hover:bg-ink/10'}`}
  >
    {children}
  </button>
);
const Sep = () => <span className="mx-1 h-5 w-px shrink-0 bg-ink/15" />;

export default function RichEditor({ html, text, onChange, guideClass, placeholder, autoFocus, lang }) {
  const ref = useRef(null);
  const last = useRef(null);
  const savedSel = useRef(null);
  const sizeRef = useRef('n');
  const [st, setSt] = useState({});
  const [pop, setPop] = useState(null);

  // Load external changes (first mount, restored draft, cloud sync, cleared after burn)
  useEffect(() => {
    const h = html ?? plainToHtml(text || '');
    if (h !== last.current && ref.current) {
      ref.current.innerHTML = h;
      last.current = h;
    }
  }, [html, text]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const emit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    fixup(el, sizeRef.current);
    let clean = sanitize(el.innerHTML);
    const plain = htmlToPlain(clean);
    if (!plain.trim() && !/<li/.test(clean)) {
      if (el.textContent === '' && !el.querySelector('ul,ol') && el.innerHTML !== '') el.innerHTML = ''; // lets the placeholder show
      clean = '';
    }
    last.current = clean;
    onChange({ html: clean, text: plain });
  }, [onChange]);

  // Track the caret/selection for toolbar state and so toolbar taps never lose it
  useEffect(() => {
    const h = () => {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount || !ref.current || !ref.current.contains(sel.anchorNode)) return;
      savedSel.current = sel.getRangeAt(0).cloneRange();
      const q = (c) => {
        try {
          return document.queryCommandState(c);
        } catch {
          return false;
        }
      };
      setSt({ b: q('bold'), i: q('italic'), u: q('underline'), s: q('strikeThrough'), ul: q('insertUnorderedList'), ol: q('insertOrderedList'), l: q('justifyLeft'), c: q('justifyCenter'), r: q('justifyRight') });
    };
    document.addEventListener('selectionchange', h);
    return () => document.removeEventListener('selectionchange', h);
  }, []);

  useEffect(() => {
    if (!pop) return undefined;
    const h = (e) => !e.target.closest('[data-pop],[data-popbtn]') && setPop(null);
    document.addEventListener('pointerdown', h);
    return () => document.removeEventListener('pointerdown', h);
  }, [pop]);

  const restore = () => {
    const el = ref.current;
    const sel = window.getSelection();
    if (document.activeElement !== el) el.focus();
    if (savedSel.current && (!sel.rangeCount || !el.contains(sel.anchorNode))) {
      sel.removeAllRanges();
      sel.addRange(savedSel.current);
    }
  };
  const exec = (cmd, val) => {
    restore();
    document.execCommand('styleWithCSS', false, true);
    const ok = document.execCommand(cmd, false, val);
    emit();
    return ok;
  };

  const openPop = (kind) => (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPop(pop?.kind === kind ? null : { kind, left: Math.max(8, Math.min(r.left, window.innerWidth - 216)), top: r.bottom + 6 });
  };
  const choose = (fn) => () => {
    fn();
    setPop(null);
  };

  const clearFormat = () => {
    restore();
    document.execCommand('removeFormat');
    const sel = window.getSelection();
    if (sel.rangeCount) {
      const rg = sel.getRangeAt(0);
      ref.current.querySelectorAll('[class*="f-"],[class*="sz-"],[class*="al-"]').forEach((e) => {
        if (rg.intersectsNode(e)) e.classList.remove(...FAM_CLASSES, ...SZ_CLASSES);
      });
    }
    emit();
  };

  const onPaste = (e) => {
    e.preventDefault();
    const h = e.clipboardData.getData('text/html');
    const t = e.clipboardData.getData('text/plain');
    if (h) document.execCommand('insertHTML', false, sanitize(h));
    else document.execCommand('insertText', false, t);
    emit();
  };

  return (
    <>
      <div className="relative z-20 pl-[36px] sm:pl-[54px] pr-2 sm:pr-4 pb-1.5">
        <div className="flex items-center gap-0.5 overflow-x-auto scroll-soft rounded-xl bg-ink/[.04] px-1 py-1" role="toolbar" aria-label="Text formatting">
          <Btn label="Bold (Ctrl+B)" on={st.b} onClick={() => exec('bold')}><Bold size={17} /></Btn>
          <Btn label="Italic (Ctrl+I)" on={st.i} onClick={() => exec('italic')}><Italic size={17} /></Btn>
          <Btn label="Underline (Ctrl+U)" on={st.u} onClick={() => exec('underline')}><Underline size={17} /></Btn>
          <Btn label="Strikethrough" on={st.s} onClick={() => exec('strikeThrough')}><Strikethrough size={17} /></Btn>
          <Sep />
          <span data-popbtn><Btn label="Font" on={pop?.kind === 'font'} onClick={openPop('font')}><Type size={17} /></Btn></span>
          <span data-popbtn><Btn label="Text size" on={pop?.kind === 'size'} onClick={openPop('size')}><ALargeSmall size={18} /></Btn></span>
          <span data-popbtn><Btn label="Ink colour" on={pop?.kind === 'color'} onClick={openPop('color')}><Palette size={17} /></Btn></span>
          <span data-popbtn><Btn label="Highlight" on={pop?.kind === 'mark'} onClick={openPop('mark')}><Highlighter size={17} /></Btn></span>
          <Sep />
          <Btn label="Bulleted list" on={st.ul} onClick={() => exec('insertUnorderedList')}><List size={17} /></Btn>
          <Btn label="Numbered list" on={st.ol} onClick={() => exec('insertOrderedList')}><ListOrdered size={17} /></Btn>
          <Sep />
          <Btn label="Align left" on={st.l} onClick={() => exec('justifyLeft')}><AlignLeft size={17} /></Btn>
          <Btn label="Align centre" on={st.c} onClick={() => exec('justifyCenter')}><AlignCenter size={17} /></Btn>
          <Btn label="Align right" on={st.r} onClick={() => exec('justifyRight')}><AlignRight size={17} /></Btn>
          <Sep />
          <Btn label="Clear formatting" onClick={clearFormat}><RemoveFormatting size={17} /></Btn>
        </div>
      </div>

      {pop && (
        <div data-pop onMouseDown={(e) => e.preventDefault()} className="fixed z-[80] w-52 rounded-xl border border-ink/15 bg-paper p-2 shadow-2xl text-ink animate-fadeUp" style={{ left: pop.left, top: pop.top }}>
          {pop.kind === 'font' &&
            FONTS.map(([id, name, css]) => (
              <button key={id} onClick={choose(() => exec('fontName', css))} className="w-full text-left rounded-lg px-3 py-2 hover:bg-ink/5 text-lg" style={{ fontFamily: css }}>
                {name}
              </button>
            ))}
          {pop.kind === 'size' &&
            SIZES.map(([id, name]) => (
              <button
                key={id}
                onClick={choose(() => {
                  sizeRef.current = id;
                  exec('fontSize', '7');
                })}
                className="w-full text-left rounded-lg px-3 py-2 hover:bg-ink/5"
                style={{ fontSize: { s: 14, n: 17, l: 21, xl: 26 }[id] }}
              >
                {name}
              </button>
            ))}
          {pop.kind === 'color' && (
            <div className="grid grid-cols-6 gap-2 p-1">
              {COLORS.map(([name, hex]) => (
                <button key={hex} title={name} aria-label={name} onClick={choose(() => exec('foreColor', hex))} className="h-7 w-7 rounded-full border border-black/10 hover:scale-110 transition" style={{ background: hex }} />
              ))}
            </div>
          )}
          {pop.kind === 'mark' && (
            <div className="flex flex-wrap gap-2 p-1">
              {MARKS.map(([name, hex]) => (
                <button key={hex} title={name} aria-label={name} onClick={choose(() => (exec('hiliteColor', hex) ? 0 : exec('backColor', hex)))} className="h-7 w-7 rounded-md border border-black/10 hover:scale-110 transition" style={{ background: hex }} />
              ))}
              <button onClick={choose(() => exec('hiliteColor', 'transparent'))} className="h-7 rounded-md border border-ink/20 px-2 text-xs hover:bg-ink/5">None</button>
            </div>
          )}
        </div>
      )}

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Your page"
        data-placeholder={placeholder}
        dir="auto"
        lang={lang}
        spellCheck
        autoCapitalize="sentences"
        enterKeyHint="enter"
        onInput={emit}
        onPaste={onPaste}
        className={`rich ${guideClass} relative z-10 flex-1 min-h-0 overflow-y-auto scroll-soft pl-[44px] pr-4 sm:pl-[62px] sm:pr-6 pb-8`}
      />
    </>
  );
}
