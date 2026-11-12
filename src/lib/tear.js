// Geometry for ripping a page into jagged pieces.
// Each piece = polygon in its own local space + a 2D affine matrix (local -> page).
// Matrix m = [a, b, c, d, e, f]:  x' = a*x + c*y + e,  y' = b*x + d*y + f

export const apply = (m, p) => ({ x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] });
export const mul = (m2, m1) => [
  m2[0] * m1[0] + m2[2] * m1[1],
  m2[1] * m1[0] + m2[3] * m1[1],
  m2[0] * m1[2] + m2[2] * m1[3],
  m2[1] * m1[2] + m2[3] * m1[3],
  m2[0] * m1[4] + m2[2] * m1[5] + m2[4],
  m2[1] * m1[4] + m2[3] * m1[5] + m2[5],
];
export const inv = (m) => {
  const det = m[0] * m[3] - m[1] * m[2];
  const a = m[3] / det;
  const b = -m[1] / det;
  const c = -m[2] / det;
  const d = m[0] / det;
  return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
};
export const IDENTITY = [1, 0, 0, 1, 0, 0];
export const translate = (x, y) => [1, 0, 0, 1, x, y];
export const rotateAbout = (th, px, py) => {
  const cs = Math.cos(th);
  const sn = Math.sin(th);
  return [cs, sn, -sn, cs, px - (cs * px - sn * py), py - (sn * px + cs * py)];
};

export const centroid = (pts) => {
  let x = 0;
  let y = 0;
  pts.forEach((p) => {
    x += p.x;
    y += p.y;
  });
  return { x: x / pts.length, y: y / pts.length };
};

export const area = (pts) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a / 2);
};

export function pointInPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > pt.y !== b.y > pt.y && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function segInter(p1, p2, p3, p4) {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-9) return false;
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export function segmentTouches(A, B, poly) {
  if (pointInPoly(A, poly) || pointInPoly(B, poly)) return true;
  for (let i = 0; i < poly.length; i++) if (segInter(A, B, poly[i], poly[(i + 1) % poly.length])) return true;
  return false;
}

const hash = (n, seed) => {
  const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const wobble = (t, seed) => Math.sin(t * 0.21 + seed) * 0.5 + Math.sin(t * 0.53 + seed * 2.3) * 0.3 + Math.sin(t * 1.37 + seed * 4.1) * 0.2;

/**
 * Split a (possibly concave) polygon by the infinite line through A,B.
 * The cut edge is jagged, deterministically as a function of position along the
 * line, so both halves share the exact same torn edge.
 * Returns [left, right] or null when the line does not truly split the polygon.
 */
export function cutPolygon(poly, A, B, seed = 1, amp = 5) {
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const side = (p) => (p.x - A.x) * nx + (p.y - A.y) * ny;
  const along = (p) => (p.x - A.x) * ux + (p.y - A.y) * uy;
  const step = 7;

  const jag = (t0, t1) => {
    const lo = Math.min(t0, t1);
    const hi = Math.max(t0, t1);
    const span = hi - lo;
    const pts = [];
    if (span > 2 * step) {
      for (let t = Math.ceil((lo + 3) / step) * step; t < hi - 3; t += step) {
        const taper = Math.pow(Math.max(0, Math.sin((Math.PI * (t - lo)) / span)), 0.6);
        const off = amp * taper * (wobble(t, seed) * 0.9 + (hash(Math.round(t / step), seed) - 0.5) * 1.5);
        pts.push({ x: A.x + ux * t + nx * off, y: A.y + uy * t + ny * off });
      }
    }
    if (t0 > t1) pts.reverse();
    return pts;
  };

  const clip = (sign) => {
    const val = poly.map((p) => sign * side(p));
    const start = val.findIndex((v) => v >= 0);
    if (start < 0) return null;
    const out = [];
    let exitT = null;
    for (let k = 0; k < poly.length; k++) {
      const i = (start + k) % poly.length;
      const j = (i + 1) % poly.length;
      const p = poly[i];
      const q = poly[j];
      const vi = val[i];
      const vj = val[j];
      if (vi >= 0) out.push(p);
      if (vi >= 0 && vj < 0) {
        const f = vi / (vi - vj);
        const I = { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f };
        out.push(I);
        exitT = along(I);
      } else if (vi < 0 && vj >= 0) {
        const f = vi / (vi - vj);
        const I = { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f };
        if (exitT !== null) out.push(...jag(exitT, along(I)));
        out.push(I);
      }
    }
    const dedup = out.filter((p, i) => {
      const q = out[(i + 1) % out.length];
      return Math.hypot(p.x - q.x, p.y - q.y) > 0.01;
    });
    return dedup.length >= 3 ? dedup : null;
  };

  const a = clip(1);
  const b = clip(-1);
  if (!a || !b || area(a) < 90 || area(b) < 90) return null;
  return [a, b, { x: nx, y: ny }];
}
