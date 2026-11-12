// All sounds are synthesized with the Web Audio API: no audio files.
let ctx = null;
let muted = false;
let stopFire = null;

const ac = () => {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

export function setMuted(m) {
  muted = m;
  if (m && stopFire) stopFire();
}

function noiseBuffer(c, secs) {
  const b = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * secs)), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

/** Ripping paper: band-passed noise with a stuttering, fibrous envelope. */
export function tearSound(strength = 0.6) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const dur = 0.22 + Math.min(1, strength) * 0.4;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, dur + 0.1);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 700;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 0.7;
  bp.frequency.setValueAtTime(1400, t);
  bp.frequency.exponentialRampToValueAtTime(5200, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  const steps = Math.floor(dur * 70);
  for (let i = 1; i <= steps; i++) {
    const x = i / steps;
    const env = Math.pow(Math.sin(Math.PI * x), 0.7);
    g.gain.linearRampToValueAtTime(Math.max(0.0001, env * (0.15 + Math.random() * 0.55) * (0.5 + strength * 0.5)), t + x * dur);
  }
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.03);
  src.connect(hp);
  hp.connect(bp);
  bp.connect(g);
  g.connect(c.destination);
  src.start(t);
  src.stop(t + dur + 0.08);
}

/** Fire: low roar plus scattered crackles. Returns nothing; stops itself. */
export function fireSound(seconds = 9) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const bus = c.createGain();
  bus.gain.value = 1;
  bus.connect(c.destination);

  const roar = c.createBufferSource();
  roar.buffer = noiseBuffer(c, 2);
  roar.loop = true;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 650;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.2, t + 1.4);
  g.gain.setValueAtTime(0.2, t + seconds - 2.5);
  g.gain.linearRampToValueAtTime(0.0001, t + seconds);
  roar.connect(lp);
  lp.connect(g);
  g.connect(bus);
  roar.start(t);
  roar.stop(t + seconds + 0.1);

  for (let i = 0; i < seconds * 16; i++) {
    const at = t + Math.random() * seconds;
    const len = 0.015 + Math.random() * 0.04;
    const s = c.createBufferSource();
    s.buffer = noiseBuffer(c, len);
    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 1800 + Math.random() * 3000;
    const cg = c.createGain();
    const peak = 0.05 + Math.random() * 0.3;
    cg.gain.setValueAtTime(peak, at);
    cg.gain.exponentialRampToValueAtTime(0.0001, at + len);
    s.connect(f);
    f.connect(cg);
    cg.connect(bus);
    s.start(at);
  }
  stopFire = () => {
    bus.gain.setValueAtTime(0, c.currentTime);
    stopFire = null;
  };
  setTimeout(() => {
    if (stopFire) stopFire = null;
  }, seconds * 1000);
}

export function stopFireSound() {
  if (stopFire) stopFire();
}

/** A soft, warm chime for the Heal phase. */
export function chime() {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  [523.25, 659.25, 783.99].forEach((f, i) => {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = c.createGain();
    const s = t + i * 0.18;
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(0.09, s + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 1.8);
    o.connect(g);
    g.connect(c.destination);
    o.start(s);
    o.stop(s + 1.9);
  });
}
