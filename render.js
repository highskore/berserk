'use strict'
/* renderer: figures are built from 3d spheres, capsules and triangles, projected by a 3/4 camera into a
   geometry buffer (material, albedo, view normal, depth, part id) and then shaded by a style recipe:
   golden age painterly by day, miura ink by night. enemies are cached as shaded sprites per direction. */
const TAU = Math.PI * 2
const c01 = v => (v < 0 ? 0 : v > 1 ? 1 : v)
const lerp = (a, b, t) => a + (b - a) * t
const sstep = (a, b, v) => { v = c01((v - a) / (b - a)); return v * v * (3 - 2 * v) }
const ease = t => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t))
function h1(n) { n |= 0; n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n ^= n >>> 16; return (n >>> 0) / 4294967296 }
function h2(x, y) { return h1(Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) }
const smf = t => t * t * (3 - 2 * t)
const wrp = (a, p) => (p ? ((a % p) + p) % p : a)
function n2(x, y, p) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy
  const a = h2(wrp(ix, p), wrp(iy, p)), b = h2(wrp(ix + 1, p), wrp(iy, p)), c = h2(wrp(ix, p), wrp(iy + 1, p)), d = h2(wrp(ix + 1, p), wrp(iy + 1, p)), u = smf(fx), v = smf(fy)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
function fbm(x, y, o, p) { let s = 0, a = 0.5, f = 1, nn = 0; for (let k = 0; k < o; k++) { s += a * n2(x * f, y * f, p ? p * f : 0); nn += a; a *= 0.5; f *= 2 } return s / nn }
function hexRGB(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)] }
const mixC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
function rampOf(anchors, n) { const A = anchors.map(hexRGB), out = []; for (let i = 0; i < n; i++) { const f = n === 1 ? 0 : (i / (n - 1)) * (A.length - 1), k = Math.min(A.length - 2, Math.floor(f)); out.push(A.length === 1 ? A[0] : mixC(A[k], A[k + 1], f - k)) } return out }
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16)
const bay = (x, y) => BAYER4[(y & 3) * 4 + (x & 3)]

const MAT = { CLOAK: 0, ARMOR: 1, IRON: 2, STEEL: 3, SKIN: 4, HAIR: 5, LEATHER: 6, CLOTH: 7, TABARD: 8, MAIL: 9, FLESH: 10, GORE: 11, BONE: 12, BLOOD: 13, EYE: 14, SMEAR: 15, BRAND: 16, WOOD: 17, DARK: 18, STONE: 19, GHOST: 20, DRIED: 21 }
const NMAT = 22, EMPTY = 255, MATN = Object.keys(MAT)
const GLOWM = new Uint8Array(NMAT); GLOWM[MAT.EYE] = GLOWM[MAT.SMEAR] = GLOWM[MAT.BRAND] = 1

function mkBuf(w, h) { const n = w * h; return { w, h, mat: new Uint8Array(n).fill(EMPTY), alb: new Float32Array(n), nx: new Float32Array(n), ny: new Float32Array(n), nz: new Float32Array(n), z: new Float32Array(n).fill(-1e9), grp: new Uint16Array(n), fl: new Uint8Array(n) } }
function clearBuf(b) { b.mat.fill(EMPTY); b.grp.fill(0); b.fl.fill(0); b.z.fill(-1e9) }

/* draw target and camera: an isometric-leaning 3/4 view. ground depth is squashed by ky, height by kz,
   and the world grid (props, walls) is turned 45 degrees. c is closeness to the eye. */
const D = { b: null, g: 0 }
const CAM = { yaw: Math.PI / 4, ky: 0.5, kz: 0.8, u: 0.55, ox: 0, oy: 0 }
function setCam(o) { Object.assign(CAM, o); const l = Math.hypot(CAM.ky, CAM.kz); CAM.tk = CAM.kz / l; CAM.tz = CAM.ky / l }
setCam({})
/* figure frame: local x forward, y left, z up; placed at world (wx,wy) facing ang (screen-space angle, 0 = right, pi/2 = toward the viewer) */
const FIG = { wx: 0, wy: 0, ca: 1, sa: 0 }
function setFig(wx, wy, ang) { FIG.wx = wx; FIG.wy = wy; FIG.ca = Math.cos(ang); FIG.sa = Math.sin(ang) }
/* the eye direction in the figure's local frame, to turn flat things like the blade toward the viewer */
const eyeLocal = () => [CAM.tk * FIG.sa, -CAM.tk * FIG.ca, CAM.tz]
/* local -> screen [sx, sy, c]; facing is in screen space so the 8 directions read the same under any yaw */
function prj(p) {
  const x = p[0] * FIG.ca + p[1] * FIG.sa, y = p[0] * FIG.sa - p[1] * FIG.ca, u = CAM.u
  return [CAM.ox + (FIG.wx + x) * u, CAM.oy + ((FIG.wy + y) * CAM.ky - p[2] * CAM.kz) * u, (FIG.wy + y) * CAM.tk + p[2] * CAM.tz]
}
/* local direction -> view-space normal (x right, y down, z toward the eye) */
function vnrm(n) {
  const x = n[0] * FIG.ca + n[1] * FIG.sa, y = n[0] * FIG.sa - n[1] * FIG.ca
  const nx = x, ny = y * CAM.tz - n[2] * CAM.tk, nz = y * CAM.tk + n[2] * CAM.tz, l = Math.hypot(nx, ny, nz) || 1
  return [nx / l, ny / l, nz / l]
}
function put(x, y, c, m, a, nx, ny, nz, p, fl) {
  const b = D.b; if (x < 0 || y < 0 || x >= b.w || y >= b.h) return
  const i = y * b.w + x; if (c < b.z[i]) return
  b.z[i] = c; b.mat[i] = m; b.alb[i] = a; b.nx[i] = nx; b.ny[i] = ny; b.nz[i] = nz; b.grp[i] = p ? D.g | p : 0; b.fl[i] = fl || 0
}
/* sphere at local point; o.tex(x,y,dx,dy) -> albedo mult (<0 skips), o.sq squashes vertically (ellipsoid look) */
function sph(P, r, m, a, p, o) {
  o = o || {}; const q = prj(P), u = CAM.u, rx = Math.max(0.5, r * u * (o.sx || 1)), ry = Math.max(0.5, r * u * (o.sq || 1)), fl = o.fl || 0
  const x0 = Math.floor(q[0] - rx), x1 = Math.ceil(q[0] + rx), y0 = Math.floor(q[1] - ry), y1 = Math.ceil(q[1] + ry)
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = (x + 0.5 - q[0]) / rx, dy = (y + 0.5 - q[1]) / ry, d = dx * dx + dy * dy; if (d > 1) continue
    let al = a; if (o.tex) { const k = o.tex(x, y, dx, dy); if (k < 0) continue; al *= k }
    const nz = Math.sqrt(1 - d); put(x, y, q[2] + nz * r, m, al, dx, dy, nz, p, fl)
  }
}
/* tapered capsule between local points; o.tex(x,y,t,s) with t along the axis and s across */
function cap(A, B, ra, rb, m, a, p, o) {
  o = o || {}; const qa = prj(A), qb = prj(B), u = CAM.u; ra = Math.max(0.5, ra * u); rb = Math.max(0.5, rb * u)
  const r = Math.max(ra, rb), x0 = Math.floor(Math.min(qa[0], qb[0]) - r), x1 = Math.ceil(Math.max(qa[0], qb[0]) + r), y0 = Math.floor(Math.min(qa[1], qb[1]) - r), y1 = Math.ceil(Math.max(qa[1], qb[1]) + r)
  const vx = qb[0] - qa[0], vy = qb[1] - qa[1], vv = vx * vx + vy * vy || 1e-6, vl = Math.sqrt(vv), fl = o.fl || 0
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x + 0.5, py = y + 0.5; let t = ((px - qa[0]) * vx + (py - qa[1]) * vy) / vv; t = t < 0 ? 0 : t > 1 ? 1 : t
    const cx = qa[0] + vx * t, cy = qa[1] + vy * t, rr = ra + (rb - ra) * t, dx = px - cx, dy = py - cy, d2 = dx * dx + dy * dy; if (d2 > rr * rr) continue
    let al = a; if (o.tex) { const k = o.tex(x, y, t, (dx * -vy + dy * vx) / (vl * rr)); if (k < 0) continue; al *= k }
    const nz = Math.sqrt(Math.max(0, 1 - d2 / (rr * rr))); put(x, y, qa[2] + (qb[2] - qa[2]) * t + (nz * rr) / u, m, al, dx / rr, dy / rr, nz, p, fl)
  }
}
/* triangle with per-vertex uv; normal from the local winding unless o.n is given. o.tex(x,y,u,v) */
function tri(A, B, C, m, a, p, o) {
  o = o || {}; const qa = prj(A), qb = prj(B), qc = prj(C), fl = o.fl || 0, U = o.uv || [[0, 0], [1, 0], [0, 1]]
  let n = o.n || [(B[1] - A[1]) * (C[2] - A[2]) - (B[2] - A[2]) * (C[1] - A[1]), (B[2] - A[2]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[2] - A[2]), (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0])]
  let N = vnrm(n); if (N[2] < 0) N = [-N[0], -N[1], -N[2]]
  const den = (qb[1] - qc[1]) * (qa[0] - qc[0]) + (qc[0] - qb[0]) * (qa[1] - qc[1]); if (Math.abs(den) < 1e-6) return
  const x0 = Math.floor(Math.min(qa[0], qb[0], qc[0])), x1 = Math.ceil(Math.max(qa[0], qb[0], qc[0])), y0 = Math.floor(Math.min(qa[1], qb[1], qc[1])), y1 = Math.ceil(Math.max(qa[1], qb[1], qc[1]))
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x + 0.5, py = y + 0.5, w0 = ((qb[1] - qc[1]) * (px - qc[0]) + (qc[0] - qb[0]) * (py - qc[1])) / den, w1 = ((qc[1] - qa[1]) * (px - qc[0]) + (qa[0] - qc[0]) * (py - qc[1])) / den, w2 = 1 - w0 - w1
    if (w0 < -0.02 || w1 < -0.02 || w2 < -0.02) continue
    let al = a; if (o.tex) { const k = o.tex(x, y, w0 * U[0][0] + w1 * U[1][0] + w2 * U[2][0], w0 * U[0][1] + w1 * U[1][1] + w2 * U[2][1]); if (k < 0) continue; al *= k }
    put(x, y, w0 * qa[2] + w1 * qb[2] + w2 * qc[2] + 0.3, m, al, N[0], N[1], N[2], p, fl)
  }
}
const quad = (A, B, C, D4, m, a, p, o) => { o = o || {}; tri(A, B, C, m, a, p, Object.assign({}, o, { uv: [[0, 0], [1, 0], [1, 1]] })); tri(A, C, D4, m, a, p, Object.assign({}, o, { uv: [[0, 0], [1, 1], [0, 1]] })) }
/* 3d helpers */
const v3 = { add: (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k], len: a => Math.hypot(a[0], a[1], a[2]), norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l] }, cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t] }
/* 2-bone ik in 3d: the joint bends toward hint */
function ik3(a, b, l1, l2, hint) {
  const d = v3.sub(b, a); let L = v3.len(d) || 1e-6; const dd = Math.min(L, l1 + l2 - 0.01), u = v3.mul(d, 1 / L)
  const x = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(0, l1 * l1 - x * x))
  let w = v3.sub(hint, v3.mul(u, v3.dot(hint, u))); w = v3.norm(w)
  return v3.add(v3.add(a, u, x), w, h)
}
const grime = (k, s) => (x, y) => 1 + (h2(x, y) - 0.5) * k + (n2(x * 0.35, y * 0.35) - 0.5) * (s || 0)
