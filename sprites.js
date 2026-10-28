/* sprite caches: every figure is rasterised once per direction and frame, then shaded into a golden and an
   ink canvas. the frame loop only blits. enemies are baked lazily and warmed up in the background. */
const U = 0.55
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
const GEO = {}
/* at night every silhouette gets a paper halo so a black figure separates from ink and hatching */
function halo(d, W, H, n) {
  for (let k = 0; k < n; k++) {
    const a = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) a[i] = d[i * 4 + 3]
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (a[i]) continue
      if ((x > 0 && a[i - 1]) || (x < W - 1 && a[i + 1]) || (y > 0 && a[i - W]) || (y < H - 1 && a[i + W]) || (k === 0 && ((x > 0 && y > 0 && a[i - W - 1]) || (x < W - 1 && y < H - 1 && a[i + W + 1])))) { d[i * 4] = 239; d[i * 4 + 1] = 232; d[i * 4 + 2] = 218; d[i * 4 + 3] = 255 } }
  }
}
function bake(draw, o, ang, sc, box, hl) {
  const u = U * sc, W = Math.ceil(box[0] * u), H = Math.ceil(box[1] * u), px = W >> 1, py = Math.ceil(H * box[2]), k = W + 'x' + H
  const b = GEO[k] || (GEO[k] = mkBuf(W, H)); clearBuf(b); D.b = b; D.g = 1 << 5; setCam({ u, ox: px, oy: py }); setFig(0, 0, ang); draw(o)
  let y0 = H, y1 = -1, x0 = W, x1 = -1
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (b.mat[y * W + x] !== EMPTY) { if (y < y0) y0 = y; y1 = y; if (x < x0) x0 = x; if (x > x1) x1 = x }
  if (x1 < 0) { x0 = x1 = px; y0 = y1 = py }
  /* the cut row sits halfway up the opaque body; its span lets the gore stripe hug the silhouette */
  const cy = Math.round(y1 - (y1 - y0) * 0.5); let cx0 = W, cx1 = 0; for (let x = 0; x < W; x++) if (b.mat[cy * W + x] !== EMPTY) { cx0 = Math.min(cx0, x); cx1 = x }
  /* canvases are cropped to the silhouette plus the halo, which keeps hundreds of animation frames cheap */
  const m = (hl || 1) + 1, X0 = Math.max(0, x0 - m), Y0 = Math.max(0, y0 - m), cw = Math.min(W, x1 + m + 1) - X0, ch = Math.min(H, y1 + m + 1) - Y0
  const out = { px: px - X0, py: py - Y0, w: cw, h: ch, top: y0 - Y0, cut: { y: cy - Y0, x0: cx0 - X0, x1: cx1 - X0 } }
  for (const s of ['golden', 'ink']) { const c = mkCanvas(cw, ch), ctx = c.getContext('2d'), img = ctx.createImageData(W, H); shadeBuf(b, CS[s], img.data); if (s === 'ink') halo(img.data, W, H, hl || 1); ctx.putImageData(img, -X0, -Y0, X0, Y0, cw, ch); out[s] = c }
  return out
}
const FOLKBOX = [200, 190, 0.66]
const SPEC = {
  soldier: { draw: FOLK.soldier, sc: 0.92, box: FOLKBOX, vars: 2 }, knight: { draw: FOLK.knight, sc: 1, box: FOLKBOX },
  ghost: { draw: drawSpirit, sc: 0.85, box: [140, 170, 0.72] }, wraith: { draw: o => drawSpirit(Object.assign({ host: 1 }, o)), sc: 1.7, box: [140, 170, 0.72] },
  crawler: { draw: o => drawBeast(Object.assign({ k: 'crawler' }, o)), sc: 1, box: [150, 110, 0.62] }, troll: { draw: o => drawBeast(Object.assign({ k: 'troll' }, o)), sc: 0.95, box: [230, 240, 0.7] },
  imp: { draw: o => drawBeast(Object.assign({ k: 'imp' }, o)), sc: 0.7, box: [200, 200, 0.75] },
  pitlord: { draw: o => drawApostle(Object.assign({ horns: 1 }, o)), sc: 1.1, box: [220, 230, 0.7] },
  boscogn: { draw: FOLK.boscogn, sc: 1.45, box: FOLKBOX }, godhand: { draw: drawGodhand, sc: 1.15, box: [200, 280, 0.78] },
  casca: { draw: FOLK.casca, sc: 0.95, box: FOLKBOX }, judeau: { draw: FOLK.judeau, sc: 0.92, box: FOLKBOX }, pippin: { draw: FOLK.pippin, sc: 1.05, box: FOLKBOX }, corkus: { draw: FOLK.corkus, sc: 0.92, box: FOLKBOX },
  serpico: { draw: FOLK.serpico, sc: 0.95, box: FOLKBOX }, isidro: { draw: FOLK.isidro, sc: 0.78, box: FOLKBOX }, schierke: { draw: FOLK.schierke, sc: 0.68, box: FOLKBOX }, sellsword: { draw: FOLK.sellsword, sc: 1.05, box: FOLKBOX },
  skullknight: { draw: FOLK.skullknight, sc: 1.1, box: FOLKBOX }, puck: { draw: drawPuck, sc: 1, box: [60, 60, 0.75] },
}
/* apostles: every animation frame (walk, idle, each move's wind-up/strike/recover, hurt, stagger, death) per direction */
function bossSprite(type, anim, k, dir) {
  const key = 'B' + type + anim + k + '|' + dir; let s = SPR.get(key); if (s) return s
  const B = BOSS[type], P = bossPose(type, anim, k); s = bake(() => B.draw({ P, t: 1 }), {}, dir * (Math.PI / 4), B.sc, B.box); SPR.set(key, s); return s
}
for (const b in BOSS) SPEC[b] = { draw: o => BOSS[b].draw({ P: bossPose(b, 'death', 2), t: 1 }), sc: BOSS[b].sc, box: BOSS[b].box }
/* the moment an apostle appears, queue all its frames for background baking: the ones it shows first, first */
const bossWarm = (type, dir) => {
  const order = ['walk', 'idle', 'hurt', 'stagger', 'A', 'B', 'C', 'D', 'death']
  for (let d = 0; d < 8; d++) { const dd = (dir + d + 8) % 8; for (const an of order) for (let k = 0; k < BFRAMES[an]; k++) WARM.push(() => bossSprite(type, an, k, dd)) }
}
const SPR = new Map()
const dirOf = a => ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8
/* frame f in 0..3 is a walk phase, 4 is standing, 5 and 6 are the two halves of an attack */
function sprite(type, dir, f, v) {
  const key = type + dir + '|' + f + '|' + (v || 0); let s = SPR.get(key); if (s) return s
  const sp = SPEC[type]; s = bake(sp.draw, { t: f * 0.4 + dir, walk: f * (Math.PI / 2), mv: f < 4 ? 1 : 0, atk: f > 4 ? (f - 4) * 0.5 : 0, v }, dir * (Math.PI / 4), sp.sc, sp.box); SPR.set(key, s); return s
}
/* guts: idle, 8-phase walk, 9-phase swing (blade angle relative to his facing), all per direction */
const GSW = 9, gutsSw = k => -1.6 + k * 0.4
function gutsSprite(dir, mode, ph, armor) {
  const key = 'g' + dir + mode + ph + (armor ? 'A' : ''); let s = SPR.get(key); if (s) return s
  const o = { t: ph * 0.3, armor, bloody: 1 }
  if (mode === 'w') { o.walk = ph * (Math.PI / 4); o.mv = 1 } else if (mode === 's') o.swing = gutsSw(ph)
  s = bake(drawGuts, o, dir * (Math.PI / 4), 1, [300, 260, 0.64], 2); SPR.set(key, s); return s
}
const PROPS = new Map()
function propSprite(kind, seed) { const k = kind + seed; let s = PROPS.get(k); if (!s) { s = bake(o => drawProp(kind, seed), {}, 0.6, 1, kind === 'flesh' || kind === 'wheel' ? [90, 170, 0.8] : [110, 200, 0.85]); PROPS.set(k, s) } return s }
/* blood pools: stamped once per style in a few shapes and sizes, then blitted where things died */
const POOLS = { golden: [], ink: [] }
for (const s of ['golden', 'ink']) for (const r of [7, 11, 20]) for (let k = 0; k < 6; k++) { const p = poolStamp(s, r, CAM.ky, k * 7 + r), c = mkCanvas(p.w, p.h); c.getContext('2d').putImageData(new ImageData(p.img, p.w, p.h), 0, 0); POOLS[s].push(c) }
/* ground tiles as repeating patterns */
const TILE = {}
function tileCanvas(kind) {
  if (TILE[kind]) return TILE[kind]; const N = 256, px = kind === 'field' ? groundGolden(N, CAM.ky) : kind === 'stone' ? groundStone(N, CAM.ky) : groundInk(N, CAM.ky, kind === 'eclipse')
  const c = mkCanvas(N, N); c.getContext('2d').putImageData(new ImageData(px, N, N), 0, 0); return (TILE[kind] = c)
}
/* background warm-up: bake the common frames a few at a time so the first horde doesn't hitch */
const WARM = []
for (const t of ['soldier', 'knight', 'ghost', 'imp', 'crawler', 'troll']) for (let d = 0; d < 8; d++) for (let f = 0; f < 4; f++) WARM.push(() => sprite(t, d, f, 0))
for (let d = 0; d < 8; d++) { WARM.unshift(() => gutsSprite(d, 'i', 0)); for (let k = 0; k < 8; k++) WARM.push(() => gutsSprite(d, 'w', k)) }
function warmUp(ms) { const t0 = performance.now(); while (WARM.length && performance.now() - t0 < ms) WARM.shift()() }
