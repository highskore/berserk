/* shade: turns a geometry buffer into rgba. two recipes from the style lab: golden age painterly (day) and miura ink (night) */
const INK = [14, 13, 12], PAPER = [239, 232, 218]
const INKMODE = { CLOAK: ['black', 1.15], HAIR: ['black', 1], DARK: ['black', 0.5], ARMOR: ['hatch', 1.05], IRON: ['hatch', 0.95], STEEL: ['hatch', 1.25], SKIN: ['hatch', 1.3], LEATHER: ['hatch', 0.85], CLOTH: ['hatch', 0.95], TABARD: ['hatch', 0.95], MAIL: ['stip', 0.95], FLESH: ['hatch', 1.05], GORE: ['red', 0], BONE: ['hatch', 1.4], BLOOD: ['red', 0], EYE: ['white', 0], SMEAR: ['white', 0], BRAND: ['red', 0], WOOD: ['hatch', 0.85], STONE: ['hatch', 1.1], GHOST: ['white', 0] }
const INKDIR = { CLOAK: 'd2', ARMOR: 'd1', IRON: 'd2', STEEL: 'h', SKIN: 'd1', LEATHER: 'd2', CLOTH: 'v', TABARD: 'v', FLESH: 'd2', BONE: 'h', WOOD: 'v', MAIL: 'd1', STONE: 'd2' }
const IK = { black: 0, hatch: 1, stip: 2, red: 3, white: 4 }, IDIR = { h: 0, v: 1, d1: 2, d2: 3 }
/* bold chiaroscuro: lit planes stay paper, the turn gets one direction of lines, the rest is solid ink.
   no cross-hatching, so a figure reads as a black mass instead of a grey checker */
function hatchInk(x, y, l, dir) {
  if (l > 0.72) return false
  const a = dir === 0 ? y : dir === 1 ? x : dir === 3 ? x - y + 4096 : x + y
  if (l > 0.52) return a % 3 === 0; if (l > 0.38) return a % 2 === 0; return true
}
const R_GOLD = { CLOAK: ['#121218', '#22222c', '#3a3640', '#5e5248'], ARMOR: ['#1a1a22', '#34343e', '#585456', '#8e8070'], IRON: ['#16161c', '#36363e', '#5c5a5c', '#8a8478'], STEEL: ['#30343e', '#62666c', '#a4a29a', '#ece0c4'],
  SKIN: ['#5a3a3a', '#94604a', '#c88e6a', '#ecc092'], HAIR: ['#0e0e14', '#1c1c24', '#34302e', '#4a4038'], LEATHER: ['#2a1e1c', '#4a3426', '#6e5036', '#94724c'], CLOTH: ['#22242a', '#383a3e', '#545250', '#76705e'],
  TABARD: ['#2a1c22', '#4a2826', '#6a3a2e', '#8e5a40'], MAIL: ['#2a2c34', '#4c4e54', '#76767a', '#aaa49a'], FLESH: ['#2a2228', '#463a3a', '#6a5a50', '#8e7a66'], GORE: ['#3a0e14', '#741c1c', '#a8382a', '#d0684a'],
  BONE: ['#5a5048', '#8a7e68', '#bcae8c', '#e8dcb8'], BLOOD: ['#4a0c10', '#7e1616', '#b02a22', '#d85a3a'], EYE: ['#e0a040', '#ffe090', '#fff8d0', '#ffffff'], SMEAR: ['#ffffff'], BRAND: ['#901818', '#e04030', '#ff9060', '#ffd0a0'],
  WOOD: ['#2e2218', '#4e3a26', '#76583a', '#9a7a52'], DARK: ['#0e0a0c', '#1a1214', '#2a1e1c', '#3a2a24'], STONE: ['#3a3a40', '#5c5a5a', '#86807a', '#b4aa98'], GHOST: ['#6a6e80', '#9ca2b4', '#d0d4e0', '#f4f2ec'] }
const STY = {
  golden: { id: 'golden', mode: 0, ramps: R_GOLD, light: { L: [-0.62, -0.5, 0.6], amb: 0.36, key: 0.78, wrap: 0.15 }, rim: { off: [[-1, -1], [-2, 0]], color: '#ffd8a0', str: 0.5, nx: -0.8, ny: -0.3 }, outline: { ext: '#1e140e', inner: 'sel' }, smear: '#fff4dc', smearA: 0.8, warm: 1 },
  ink: { id: 'ink', mode: 1, ramps: { DEFAULT: ['#0e0d0c', '#efe8da'] }, n: 2, light: { L: [-0.55, -0.6, 0.58], amb: 0.3, key: 0.85 }, outline: { ext: '#0e0d0c', inner: '#0e0d0c' }, smear: '#efe8da' },
}
function compileStyle(st) {
  const cs = { st, RF: [], RN: new Int32Array(NMAT), ikind: new Int32Array(NMAT), itone: new Float32Array(NMAT), idir: new Int32Array(NMAT) }
  for (let m = 0; m < NMAT; m++) {
    const r = st.ramps[MATN[m]] || st.ramps.DEFAULT, R = rampOf(r, st.n || r.length), f = new Float32Array(R.length * 3)
    R.forEach((c, k) => { f[k * 3] = c[0]; f[k * 3 + 1] = c[1]; f[k * 3 + 2] = c[2] }); cs.RF[m] = f; cs.RN[m] = R.length
    const im = INKMODE[MATN[m]] || ['hatch', 1]; cs.ikind[m] = IK[im[0]]; cs.itone[m] = im[1]; cs.idir[m] = IDIR[INKDIR[MATN[m]] || 'd1']
  }
  cs.olc = hexRGB(st.outline.ext); cs.inc = st.outline.inner !== 'sel' ? hexRGB(st.outline.inner) : null; cs.rimc = st.rim ? hexRGB(st.rim.color) : null
  const l = st.light.L, n = Math.hypot(l[0], l[1], l[2]); cs.L = [l[0] / n, l[1] / n, l[2] / n]
  return cs
}
const CS = { golden: compileStyle(STY.golden), ink: compileStyle(STY.ink) }
/* shade a geometry buffer into rgba (empty stays transparent). hx,hy offset the hatch phase so sprites keep their pattern. */
function shadeBuf(b, cs, img, o) {
  o = o || {}; const st = cs.st, W = b.w, H = b.h, mat = b.mat, grp = b.grp, NX = b.nx, NY = b.ny, NZ = b.nz, AL = b.alb, FL = b.fl
  const L0 = cs.L[0], L1 = cs.L[1], L2 = cs.L[2], amb = st.light.amb, key = st.light.key, wrap = st.light.wrap || 0, RF = cs.RF, RN = cs.RN, M = st.mode
  const ro = (st.rim && st.rim.off) || [], rimS = st.rim ? st.rim.str : 0, rimc = cs.rimc, rnx = st.rim ? st.rim.nx : 0, rny = st.rim ? st.rim.ny : 0
  const olc = cs.olc, inc = cs.inc, ikind = cs.ikind, itone = cs.itone, idir = cs.idir, lights = o.lights || [], tint = o.tint
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, j = i * 4, m = mat[i]
    if (m === EMPTY) { img[j + 3] = 0; continue }
    const g = grp[i], f = g >> 5, p = g & 31
    let ol = 0
    if (g) {
      const n0 = x > 0 ? grp[i - 1] : 0, n1 = x < W - 1 ? grp[i + 1] : 0, n2_ = y > 0 ? grp[i - W] : 0, n3 = y < H - 1 ? grp[i + W] : 0
      if (n0 >> 5 !== f || n1 >> 5 !== f || n2_ >> 5 !== f || n3 >> 5 !== f) ol = 1
      else if ((n0 & 31) < p || (n1 & 31) < p || (n2_ & 31) < p || (n3 & 31) < p) ol = 2
    }
    const nx = NX[i], ny = NY[i], nz = NZ[i], al = AL[i], rf = RF[m], n = RN[m]
    let dif = nx * L0 + ny * L1 + nz * L2; if (wrap) dif = (dif + wrap) / (1 + wrap); if (dif < 0) dif = 0
    let v = al * (amb + key * dif), lr = 0
    for (const Lt of lights) { const dx = Lt.x - x, dy = Lt.y - y, dd = Math.sqrt(dx * dx + dy * dy + Lt.z * Lt.z), nd = Math.max(0, (nx * dx + ny * dy + nz * Lt.z) / dd * 0.8 + 0.2) * Lt.i / (1 + (dd * dd) / (Lt.r * Lt.r)); v += al * nd * Lt.v; lr += nd }
    let r, gg, bb; const xs = x + (o.hx || 0), ys = y + (o.hy || 0)
    if (M === 1) {
      const kind = ikind[m]; let ink
      if (kind === 3) { if (m === MAT.GORE && (xs + ys) & 1 && v < 0.5) ink = 1; else { r = 179; gg = 20; bb = 26; ink = -1 } }
      else if (kind === 4) ink = 0
      else if (kind === 0) { const vv = v * itone[m]; ink = (vv > 0.5 && (xs * 2 + ys + ((ys >> 3) & 1)) % 6 === 0) || (vv > 0.68 && (xs + ys) % 3 === 0) ? 0 : 1 }
      else if (kind === 2) { const l = v * itone[m]; ink = l < 0.4 || (l < 0.7 && (xs + ys * 2) % 4 === 0) ? 1 : 0 }
      else ink = hatchInk(xs, ys, v * itone[m], idir[m]) ? 1 : 0
      if (FL[i] === 1 && ink !== -1) ink = 1
      if (ink === 1) { r = 14; gg = 13; bb = 12 } else if (ink === 0) { r = 239; gg = 232; bb = 218 }
      if (ol && kind !== 3) { r = 14; gg = 13; bb = 12 }
    } else {
      let k = Math.round(c01(v) * (n - 1)); if (GLOWM[m] && k < n - 2) k = n - 2; if (FL[i] === 1 && k > 0) k = 0
      r = rf[k * 3]; gg = rf[k * 3 + 1]; bb = rf[k * 3 + 2]
      if (rimS && g && !GLOWM[m]) {
        let rim = 0; for (const q of ro) { const X = x + q[0], Y = y + q[1]; const qq = X < 0 || Y < 0 || X >= W || Y >= H ? 0 : grp[Y * W + X]; if (qq >> 5 !== f) { rim = 1; break } }
        if (rim) { let a = nx * rnx + ny * rny + 0.3; a = rimS * (0.55 + 0.45 * (a > 0 ? a : 0)); if (a > 1) a = 1; r += (rimc[0] - r) * a; gg += (rimc[1] - gg) * a; bb += (rimc[2] - bb) * a }
      }
      if (lr > 0) { r *= 1 + lr * 0.9; gg *= 1 + lr * 0.55; bb *= 1 + lr * 0.25 }
      if (ol === 1) { r = olc[0]; gg = olc[1]; bb = olc[2] } else if (ol === 2) { r = rf[0] * 0.8; gg = rf[1] * 0.8; bb = rf[2] * 0.8 }
      if (st.warm) { r = r * 1.04 + 6; bb *= 0.94 }
    }
    if (tint) { r += (tint[0] - r) * tint[3]; gg += (tint[1] - gg) * tint[3]; bb += (tint[2] - bb) * tint[3] }
    img[j] = r; img[j + 1] = gg; img[j + 2] = bb; img[j + 3] = 255
  }
}

/* ---------- ground tiles: seamless, world-aligned ---------- */
const GOLD_PAL = ['#2a2a3a', '#3c4058', '#566080', '#7a7a8e', '#a08890', '#c88a5a', '#e0a46a', '#f0c48a', '#f8dcae', '#4a4a58', '#5c5c66', '#6e6a6c', '#3a3a24', '#4e4c2c', '#646234', '#7c7a40', '#96904e', '#5a4430', '#765a3c', '#94764c', '#b09060', '#2c2418', '#1c1812', '#5a2a20', '#7e3a26'].map(hexRGB)
function quant(c, x, y, dith) {
  const d = (bay(x, y) - 0.5) * dith * 48, r = c[0] + d, g = c[1] + d, b = c[2] + d; let best = 0, bd = 1e18
  for (let k = 0; k < GOLD_PAL.length; k++) { const q = GOLD_PAL[k], dr = r - q[0], dg = g - q[1], db = b - q[2], dd = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11; if (dd < bd) { bd = dd; best = k } }
  return GOLD_PAL[best]
}
/* painter on a wrapped float canvas */
function Tile(N) { this.N = N; this.c = new Float32Array(N * N * 3); this.k = new Uint8Array(N * N) }
Tile.prototype.set = function (x, y, col, a, kind) { const N = this.N; x = wrp(Math.floor(x), N); y = wrp(Math.floor(y), N); const i = (y * N + x) * 3; a = a == null ? 1 : a; this.c[i] += (col[0] - this.c[i]) * a; this.c[i + 1] += (col[1] - this.c[i + 1]) * a; this.c[i + 2] += (col[2] - this.c[i + 2]) * a; if (kind != null) this.k[y * N + x] = kind }
Tile.prototype.ell = function (cx, cy, rx, ry, col, a, kind) { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) this.set(x, y, col, a, kind) } }
Tile.prototype.line = function (x0, y0, x1, y1, r, col, a, kind) { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5) + 1; for (let i = 0; i <= n; i++) { const t = i / n; this.ell(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, col, a, kind) } }
function scatter(n, seed, fn) { for (let i = 0; i < n; i++) fn(h1(seed * 977 + i * 3), h1(seed * 131 + i * 7 + 1), h1(seed * 71 + i * 11 + 2), i) }
/* day: a trampled golden-age field with dirt paths, painterly grass strokes, arrows, dithered to the gouache palette */
function groundGolden(N, ky) {
  const T = new Tile(N), P = 8, sc = N / P
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const n = fbm(x / sc, y / sc, 4, P), m = fbm(x / sc + 3.3, y / sc - 1.7, 3, P), path = m > 0.6
    const c = path ? mixC(hexRGB('#4e3e2c'), hexRGB('#7c6844'), n * 0.9 + 0.1) : mixC(hexRGB('#3a3a24'), hexRGB('#7c7a40'), n * 1.15 - 0.05)
    T.set(x, y, mixC(c, hexRGB('#f0c48a'), 0.08))
  }
  scatter(N * N / 40, 5, (a, b, c) => { const x = a * N, y = b * N, l = 2 + c * 4, col = c < 0.5 ? hexRGB('#96904e') : c < 0.8 ? hexRGB('#3a3a24') : hexRGB('#b09060'); for (let k = 0; k < l; k++) T.set(x + (c - 0.5) * k * 0.6, y - k * ky, col, 0.8) })
  scatter(N * N / 2600, 9, (a, b, c) => { const x = a * N, y = b * N, ang = -1.2 - c * 0.7; T.line(x, y, x + Math.cos(ang) * 6, y + Math.sin(ang) * 6 * ky, 0.5, hexRGB('#2c2418')); T.set(x + Math.cos(ang) * 6, y + Math.sin(ang) * 6 * ky, hexRGB('#f8dcae')) })
  scatter(N * N / 5000, 13, (a, b, c) => { T.ell(a * N, b * N, 2.5 + c * 2, (2.5 + c * 2) * ky, hexRGB('#6e6a6c')); T.ell(a * N - 0.8, b * N - 0.8, 1.5 + c, (1.5 + c) * ky, hexRGB('#a08890')) })
  const out = new Uint8ClampedArray(N * N * 4)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x, c = quant([T.c[i * 3], T.c[i * 3 + 1], T.c[i * 3 + 2]], x, y, 0.75); out[i * 4] = Math.min(255, c[0] * 1.04 + 6); out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2] * 0.94; out[i * 4 + 3] = 255 }
  return out
}
/* doldrey: worn flagstones laid on the world grid, which the camera turns 45 degrees. the cell size divides the tile so it wraps */
function groundStone(N, ky) {
  const S = N / (Math.SQRT2 * 4), out = new Uint8ClampedArray(N * N * 4)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const gy = y / ky, wx = (x + gy) / Math.SQRT2, wy = (gy - x) / Math.SQRT2, cx = Math.floor(wx / S), cy = Math.floor(wy / S), fx = wx / S - cx, fy = wy / S - cy
    const cell = h2(wrp(cx, 8), wrp(cy, 8)), edge = Math.min(fx, fy, 1 - fx, 1 - fy), n = fbm(x / 32, y / 32, 3, 8)
    let c = mixC(hexRGB('#4a4a58'), hexRGB('#7a7a8e'), 0.25 + cell * 0.5 + (n - 0.5) * 0.5)
    if (edge < 0.035) c = hexRGB('#2c2418'); else if (edge < 0.07) c = mixC(c, hexRGB('#3c4058'), 0.5)
    if (n > 0.62 && h2(x, y) < 0.3) c = mixC(c, hexRGB('#646234'), 0.6)
    const q = quant(c, x, y, 0.6), i = (y * N + x) * 4; out[i] = Math.min(255, q[0] * 1.04 + 6); out[i + 1] = q[1]; out[i + 2] = q[2] * 0.94; out[i + 3] = 255
  }
  return out
}
/* night: paper ground with sparse diagonal hatching, tufts, cracks and stones, all black on white.
   the eclipse version is hatched heavier and veined with blood */
function groundInk(N, ky, eclipse) {
  const T = new Tile(N), P = 8, sc = N / P
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) T.set(x, y, [255 * (0.86 + 0.14 * (fbm(x / sc, y / sc, 3, P) - 0.5)), 0, 0], 1, 0)
  scatter(N * N / 1800, 11, (a, b, c) => {
    const x = a * N, y = b * N, r = 1.5 + c * 3
    if (c < 0.4) { T.ell(x, y, r, r * ky, [255, 0, 0], 1, 3); T.ell(x + r * 0.2, y + r * 0.35, r, r * 0.45 * ky, [0, 0, 0], 1, 5); T.ell(x - r * 0.15, y - r * 0.1, r * 0.85, r * 0.7 * ky, [255, 0, 0], 1, 3) }
    else if (c < 0.8) { for (let k = 0; k < 4; k++) { const dx = (k - 1.5) * 1.3; T.line(x + dx, y, x + dx * 1.6, y - 2 - (k % 2) * 1.5, 0.45, [0, 0, 0], 1, 2) } }
    else { let px = x, py = y; for (let k = 0; k < 5; k++) { const nx = px + 4 + c * 6, ny = py + (h1(k + a * 99) - 0.5) * 4; T.line(px, py, nx, ny, 0.45, [0, 0, 0], 1, 2); px = nx; py = ny } }
  })
  const out = new Uint8ClampedArray(N * N * 4)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, k = T.k[i], l = T.c[i * 3] / 255; let ink = false
    if (k === 2) ink = true; else if (k === 5) ink = (x + y) % 3 === 0 || h2(x, y) < 0.08; else if (k === 3) ink = false
    else ink = l < 0.83 && (x - y * 2 + 9999) % 7 === 0 && h2(x >> 3, y >> 1) < 0.16
    const c = ink ? INK : PAPER
    out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = 255
  }
  /* the eclipse: thin cracks of blood branching through the ground */
  if (eclipse) scatter(6, 23, (a, b, c, s) => {
    const walk = (x, y, ang, n, d) => { for (let k = 0; k < n; k++) { ang += (h1(s * 97 + k * 13 + d * 7) - 0.5) * 0.9; x += Math.cos(ang); y += Math.sin(ang) * ky; const i = (wrp(Math.round(y), N) * N + wrp(Math.round(x), N)) * 4; out[i] = 179; out[i + 1] = 20; out[i + 2] = 26; if (d < 2 && h1(s * 31 + k + d * 5) < 0.06) walk(x, y, ang + (h1(k + s) < 0.5 ? 0.8 : -0.8), n * 0.5, d + 1) } }
    walk(a * N, b * N, c * TAU, 40 + c * 40, 0)
  })
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; if (T.k[i] !== 3) continue; const nb = [wrp(x - 1, N) + y * N, wrp(x + 1, N) + y * N, x + wrp(y - 1, N) * N, x + wrp(y + 1, N) * N]; if (nb.some(q => T.k[q] !== 3)) { out[i * 4] = INK[0]; out[i * 4 + 1] = INK[1]; out[i * 4 + 2] = INK[2] } }
  return out
}
/* blood pool stamp, rgba, per style. ink pools are solid red with a few black specks */
function poolStamp(style, r, ky, seed) {
  const W = Math.ceil(r * 2.6) + 2, H = Math.ceil(r * 2.6 * ky) + 2, img = new Uint8ClampedArray(W * H * 4), cx = W / 2, cy = H / 2
  const dec = style === 'ink' ? [[90, 8, 8], [179, 20, 26], [179, 20, 26]] : [[58, 16, 16], [94, 26, 20], [126, 42, 30], [160, 80, 58]]
  const blobs = []; for (let k = 0; k < 5; k++) { const a = h1(seed * 9 + k) * TAU, d = h1(seed * 5 + k) * r * 0.6; blobs.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * ky, r * (0.4 + 0.5 * h1(seed * 3 + k))]) }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = 0; for (const b of blobs) { const dx = (x + 0.5 - b[0]) / b[2], dy = (y + 0.5 - b[1]) / (b[2] * ky); v = Math.max(v, 1 - (dx * dx + dy * dy)) }
    v += (n2(x * 0.4 + seed, y * 0.4 / ky) - 0.5) * 0.4; if (v <= 0.05) continue
    const j = (y * W + x) * 4; let c
    if (style === 'ink') { if (v < 0.2) continue; c = dec[1] }
    else { c = v > 0.6 ? dec[0] : v > 0.3 ? dec[1] : dec[2]; if (v > 0.45 && h2(x + seed, y) > 0.94) c = dec[3] }
    img[j] = c[0]; img[j + 1] = c[1]; img[j + 2] = c[2]; img[j + 3] = 255
  }
  return { img, w: W, h: H }
}
