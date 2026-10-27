/* ui: the canvas (scaled to fit at a fixed pixel budget), world rendering per style, the dom hud and menus,
   keyboard and touch-drag input, and the frame loop. nothing is saved between visits. */
const cv = document.getElementById('cv'), ctx = cv.getContext('2d'), DK = mkCanvas(8, 8), dctx = DK.getContext('2d'), $ = id => document.getElementById(id)
let W = 480, H = 270, KY = CAM.ky
function resize() {
  const vw = innerWidth, vh = innerHeight, s = Math.max(1, Math.sqrt((vw * vh) / 130000))
  W = Math.max(200, Math.round(vw / s)); H = Math.max(200, Math.round(vh / s)); cv.width = W; cv.height = H; DK.width = W; DK.height = H; ctx.imageSmoothingEnabled = false
  if (game) game.view = { w: W, h: H }
}
addEventListener('resize', resize)

/* a 3x5 pixel font for numbers and short callouts */
const FONT = { 0: '75557', 1: '26227', 2: '71747', 3: '71717', 4: '55711', 5: '74717', 6: '74757', 7: '71111', 8: '75757', 9: '75717', '+': '02720', '-': '00700', A: '25755', B: '65656', C: '34443', D: '65556', E: '74647', F: '74644', G: '34553', H: '55755', I: '72227', J: '11153', K: '55655', L: '44447', M: '57755', N: '65555', O: '25552', P: '65644', Q: '25563', R: '65655', S: '34216', T: '72222', U: '55557', V: '55552', W: '55775', X: '55255', Y: '55222', Z: '71247', ' ': '00000', '!': '22202' }
function ptext(s, x, y, col, out) {
  x = Math.round(x - s.length * 2); y = Math.round(y)
  for (const pass of out ? [0, 1] : [1]) { ctx.fillStyle = pass ? col : out
    for (let i = 0; i < s.length; i++) { const gl = FONT[s[i]] || FONT[' ']; for (let r = 0; r < 5; r++) { const bits = +gl[r]; for (let c = 0; c < 3; c++) if (bits & (4 >> c)) { if (pass) ctx.fillRect(x + i * 4 + c, y + r, 1, 1); else ctx.fillRect(x + i * 4 + c - 1, y + r - 1, 3, 3) } } } }
}
const COL = {
  golden: { blood: '#7e1616', blood2: '#5e1a14', soot: '#2c2418', shadow: 'rgba(28,18,12,0.4)', steel: '#ece0c4', dark: '#1e140e', light: '#fff4dc', gem: '#e0a46a', gem2: '#fff8d0', coin: '#f0c48a', num: '#f8dcae', crit: '#d85a3a', heal: '#c8d890', hurt: '#d85a3a', spirit: '#d0d4e0', fire: '#f8a048' },
  ink: { blood: '#b3141a', blood2: '#b3141a', soot: '#0e0d0c', shadow: null, steel: '#0e0d0c', dark: '#0e0d0c', light: '#efe8da', gem: '#efe8da', gem2: '#0e0d0c', coin: '#efe8da', num: '#efe8da', crit: '#efe8da', heal: '#efe8da', hurt: '#b3141a', spirit: '#efe8da', fire: '#efe8da' },
}
const HATCH = (() => { const c = mkCanvas(4, 4), x = c.getContext('2d'); x.fillStyle = '#0e0d0c'; for (let i = 0; i < 4; i++) { x.fillRect(i, 3 - i, 1, 1); x.fillRect(i, i, 1, 1) } return ctx.createPattern(c, 'repeat') })()
const LINES = (() => { const c = mkCanvas(4, 4), x = c.getContext('2d'); x.fillStyle = '#0e0d0c'; for (let i = 0; i < 4; i++) x.fillRect(i, 3 - i, 1, 1); return ctx.createPattern(c, 'repeat') })()
const SHADEPAT = (() => { const c = mkCanvas(2, 2), x = c.getContext('2d'); x.fillStyle = '#0e0d0c'; x.fillRect(0, 0, 1, 1); x.fillRect(1, 1, 1, 1); return ctx.createPattern(c, 'repeat') })()

/* ---------- world rendering ---------- */
let game = null, ox = 0, oy = 0
const SX = x => Math.round(x - game.cam.x + W / 2 + ox), SY = y => Math.round((y - game.cam.y) * KY + H / 2 + 14 + oy)
const onScreen = (x, y, m) => { const sx = SX(x), sy = SY(y); return sx > -m && sx < W + m && sy > -m && sy < H + m * 1.6 }
function blit(s, st, x, y, z, a, lighter) { const c = s[st]; if (a != null && a < 1) ctx.globalAlpha = a; ctx.drawImage(c, SX(x) - s.px, SY(y) - s.py - (z || 0)); if (lighter) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(c, SX(x) - s.px, SY(y) - s.py - (z || 0)); ctx.globalCompositeOperation = 'source-over' } ctx.globalAlpha = 1 }
function shadow(st, x, y, rx) { const sx = SX(x), sy = SY(y); ctx.beginPath(); ctx.ellipse(sx, sy, rx, rx * KY * 0.7, 0, 0, TAU); if (st === 'ink') { ctx.fillStyle = SHADEPAT; ctx.fill() } else { ctx.fillStyle = COL.golden.shadow; ctx.fill() } }
/* props live on a world grid turned 45 degrees; chunks are seeded so the same field comes back */
const CH = 220
function propsInView(g) {
  const out = [], B = g.biome(), kinds = g.nightN === 1 && g.phase().k === 'night' ? ['flesh', 'cross', 'wheel', 'flesh'] : B.props, x0 = Math.floor((g.cam.x - W / 2 - 80) / CH), x1 = Math.floor((g.cam.x + W / 2 + 80) / CH), y0 = Math.floor((g.cam.y - H / KY / 2 - 80) / CH), y1 = Math.floor((g.cam.y + H / KY / 2 + 160) / CH)
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
    const h = i => h2(cx * 7 + i * 131 + g.dayN * 17, cy * 13 + i * 71), bx = cx * CH, by = cy * CH
    if (Math.abs(bx + CH / 2) < CH && Math.abs(by + CH / 2) < CH) continue
    const kind = kinds[Math.floor(h(1) * kinds.length)]
    if (h(2) < 0.35) { const dx = Math.SQRT1_2, dy = h(3) < 0.5 ? Math.SQRT1_2 : -Math.SQRT1_2, n = 3 + Math.floor(h(4) * 4); for (let i = 0; i < n; i++) out.push({ x: bx + 40 + h(5) * 80 + dx * i * 30, y: by + 40 + h(6) * 80 + dy * i * 30, kind, seed: i % 3 }) }
    else for (let i = 0; i < 2; i++) out.push({ x: bx + h(10 + i) * CH, y: by + h(20 + i) * CH, kind: kinds[Math.floor(h(30 + i) * kinds.length)], seed: Math.floor(h(40 + i) * 3) })
  }
  if (g.bounds) { const b = g.bounds; for (let x = b.x0; x <= b.x1; x += 52) { out.push({ x, y: b.y0 - 4, kind: 'pillar', seed: (x / 52) & 1 }); out.push({ x, y: b.y1 + 8, kind: x % 104 === 0 ? 'brazier' : 'pillar', seed: 2 }) } for (let y = b.y0 + 52; y < b.y1; y += 52) { out.push({ x: b.x0 - 8, y, kind: 'brazier', seed: 1 }); out.push({ x: b.x1 + 8, y, kind: 'brazier', seed: 0 }) } }
  return out
}
function gutsFrame(g) {
  const p = g.p, A = g.armorT > 0
  if (p.spin) { const a = p.spin.a; return gutsSprite(dirOf(a), 's', 4, A) }
  if (p.swing) { const d = dirOf(p.swing.dir), sw = d * (Math.PI / 4) - (p.swing.cur != null ? p.swing.cur : p.swing.a0), k = clamp(Math.round((angDiff(0, sw) + 1.6) / 0.4), 0, GSW - 1); return gutsSprite(d, 's', k, A) }
  if (p.moving) return gutsSprite(dirOf(p.face), 'w', Math.floor(p.walk / (Math.PI / 4)) & 7, A)
  return gutsSprite(dirOf(p.face), 'i', 0, A)
}
function drawWorld(g, st) {
  const C = COL[st], tile = tileCanvas(st === 'golden' ? g.biome().tile : g.nightN === 1 && g.phase().k !== 'day' ? 'eclipse' : 'paper')
  ctx.save(); ctx.translate((((W / 2 - g.cam.x + ox) % 256) + 256) % 256 - 256, (((H / 2 + 14 - g.cam.y * KY + oy) % 256) + 256) % 256 - 256); ctx.fillStyle = ctx.createPattern(tile, 'repeat'); ctx.fillRect(0, 0, W + 512, H + 512); ctx.restore()
  for (const pl of g.pools) { if (!onScreen(pl.x, pl.y, 40)) continue; const c = POOLS[st][pl.r * 6 + pl.s], k = 0.4 + 0.6 * ease(pl.t), w = c.width * k, h = c.height * k; ctx.drawImage(c, SX(pl.x) - w / 2, SY(pl.y) - h / 2, w, h) }
  for (const s of g.stains) { if (!onScreen(s.x, s.y, 4)) continue; ctx.fillStyle = s.soot ? C.soot : s.s > 1 ? C.blood2 : C.blood; if (s.soot) { ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.ellipse(SX(s.x), SY(s.y), 9, 5, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1 } else ctx.fillRect(SX(s.x), SY(s.y), s.s, 1) }
  for (const tl of g.tele) { const a = Math.sin(tl.t * 30) > 0; ctx.fillStyle = a ? COL.ink.blood : C.dark; const x = SX(tl.x), y = SY(tl.y); for (let i = -3; i <= 3; i++) { ctx.fillRect(x + i, y + Math.round(i * 0.5), 1, 1); ctx.fillRect(x + i, y - Math.round(i * 0.5), 1, 1) } }
  /* ground items */
  for (const k of g.gems) { if (!onScreen(k.x, k.y, 6)) continue; const x = SX(k.x), y = SY(k.y) - 3 - Math.round(Math.sin(g.rt * 4 + k.x) * 1), big = k.v > 4; ctx.fillStyle = C.dark; ctx.fillRect(x - 2, y - 3, 5, 7); ctx.fillStyle = C.gem; ctx.fillRect(x - 1, y - 2, 3, 5); ctx.fillStyle = C.gem2; ctx.fillRect(x, y - 2, 1, big ? 4 : 2) }
  for (const k of g.coins) { if (!onScreen(k.x, k.y, 6)) continue; const x = SX(k.x), y = SY(k.y) - 2; ctx.fillStyle = C.dark; ctx.fillRect(x - 2, y - 2, 5, 4); ctx.fillStyle = C.coin; ctx.fillRect(x - 1, y - 1, 3, 2) }
  for (const k of g.pickups) { const x = SX(k.x), y = SY(k.y) - 4; ctx.fillStyle = C.dark; ctx.fillRect(x - 5, y - 4, 11, 8); ctx.fillStyle = k.kind === 'chest' ? C.coin : C.blood; ctx.fillRect(x - 4, y - 3, 9, 6); if (k.kind === 'chest') { ctx.fillStyle = C.dark; ctx.fillRect(x - 4, y - 1, 9, 1) } }
  /* everything standing, painter-sorted by ground depth */
  const L = []
  for (const pr of propsInView(g)) if (onScreen(pr.x, pr.y, 60)) L.push({ y: pr.y, s: propSprite(pr.kind, pr.seed), x: pr.x, sh: pr.kind === 'pillar' || pr.kind === 'rock' ? 10 : 4 })
  for (const e of g.en) { if (!onScreen(e.x, e.y, 70)) continue; const s = sprite(e.type, dirOf(e.face), e.stun > 0 ? 4 : Math.floor(e.anim) & 3, e.type === 'soldier' ? (e.ph > Math.PI ? 1 : 0) : 0); L.push({ y: e.y, s, x: e.x, sh: e.d.r, e }) }
  for (const c of g.corpses) if (onScreen(c.x, c.y, 80)) L.push({ y: c.y - 1, c })
  for (const a of g.allies) L.push({ y: a.y, s: sprite(a.id, dirOf(a.face), a.moving ? Math.floor(a.anim) & 3 : 4), x: a.x, sh: 8, a })
  for (const r of g.riders) L.push({ y: r.y, s: sprite('skullknight', dirOf(r.face), Math.floor(r.anim) & 3), x: r.x, sh: 10 })
  L.push({ y: g.p.y, s: gutsFrame(g), x: g.p.x, sh: 11, guts: 1 })
  const pw = g.weapons.find(w => w.id === 'puck'); if (pw) { const a = pw.ang; L.push({ y: g.p.y + Math.sin(a) * 18, s: sprite('puck', dirOf(a + Math.PI / 2), 4), x: g.p.x + Math.cos(a) * 26, z: 30 + Math.sin(g.rt * 3) * 3, sh: 3 }) }
  for (const it of L) if (it.s && it.sh) shadow(st, it.x, it.y, it.sh)
  for (const it of L) if (it.e && it.e.elite) { ctx.strokeStyle = COL.ink.blood; ctx.beginPath(); ctx.ellipse(SX(it.x), SY(it.y), it.sh + 4, (it.sh + 4) * KY, 0, 0, TAU); ctx.stroke() }
  L.sort((a, b) => a.y - b.y)
  for (const it of L) {
    if (it.c) { drawCorpse(it.c, st); continue }
    if (it.guts) { const p = g.p; blit(it.s, st, it.x, it.y, 0, 1, p.hurtT > 0 && Math.sin(g.rt * 40) > 0); continue }
    if (it.a) { blit(it.s, st, it.x, it.y, 0, it.a.fade ? 1 - it.a.fade : 1); if (it.a.brand) { ctx.fillStyle = COL.ink.blood; ctx.fillRect(SX(it.x) - 1, SY(it.y) - it.s.py + 8, 3, 3) } continue }
    blit(it.s, st, it.x, it.y, it.z || 0, it.e && it.e.flee ? 0.6 : 1, it.e && it.e.flash > 0)
  }
  /* projectiles and enemy fire */
  for (const q of g.pr) {
    const x = SX(q.x), y = SY(q.y) - (q.z || 0) * 0.8, l = Math.hypot(q.vx || 0, q.vy || 0) || 1, dx = (q.vx || 0) / l, dy = ((q.vy || 0) / l) * KY
    if (q.kind === 'knife' || q.kind === 'bolt') { const n = q.kind === 'bolt' ? 7 : 5; ctx.fillStyle = C.dark; for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x - dx * i), Math.round(y - dy * i), 2, 2); ctx.fillStyle = st === 'ink' ? C.light : C.steel; for (let i = 0; i < n - 1; i++) ctx.fillRect(Math.round(x - dx * i), Math.round(y - dy * i), 1, 1) }
    else { ctx.fillStyle = C.dark; ctx.beginPath(); ctx.arc(x, y, q.kind === 'ball' ? 3.5 : 3, 0, TAU); ctx.fill(); ctx.fillStyle = C.light; ctx.fillRect(x - 1, y - 2, 1, 1); if (q.kind === 'bomb') { ctx.fillStyle = Math.sin(g.rt * 40) > 0 ? C.fire : C.light; ctx.fillRect(x + 1, y - 4, 1, 2) } }
  }
  for (const b of g.eb) {
    const x = SX(b.x), y = SY(b.y) - (b.ring ? 0 : 14)
    if (b.ring) { ctx.strokeStyle = C.dark; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, b.R, b.R * KY, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = st === 'ink' ? C.light : '#94764c'; ctx.stroke() }
    else { ctx.fillStyle = C.dark; ctx.beginPath(); ctx.arc(x, y, b.r, 0, TAU); ctx.fill(); ctx.fillStyle = st === 'ink' ? C.light : b.kind === 'orb' ? '#e0a46a' : '#96904e'; ctx.beginPath(); ctx.arc(x, y, b.r - 1.5, 0, TAU); ctx.fill() }
  }
  /* the swing: a crescent of light dragged along the ground at waist height */
  const p = g.p, gx = SX(p.x), gy = SY(p.y) - 20
  if (p.swing && p.swing.cur != null) {
    const s = p.swing, sg = Math.sign(s.a1 - s.a0) || 1, a1 = s.cur, a0 = a1 - sg * Math.min(Math.abs(s.cur - s.a0), 1.6), k = 1 - s.t / s.dur * 0.5
    ctx.save(); ctx.translate(gx, gy); ctx.scale(1, KY); ctx.beginPath(); ctx.arc(0, 0, s.R, a0, a1, sg < 0); ctx.arc(0, 0, s.R * 0.45, a1, a0, sg > 0); ctx.closePath()
    if (st === 'ink') { ctx.fillStyle = C.light; ctx.fill(); ctx.restore(); ctx.save(); ctx.translate(gx, gy); ctx.scale(1, KY); ctx.strokeStyle = C.dark; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, s.R, a0, a1, sg < 0); ctx.stroke() }
    else { ctx.globalAlpha = 0.6 * k; ctx.fillStyle = C.light; ctx.fill() }
    ctx.restore(); ctx.globalAlpha = 1
  }
  if (p.spin) { ctx.save(); ctx.translate(gx, gy); ctx.scale(1, KY); ctx.strokeStyle = st === 'ink' ? C.dark : 'rgba(255,244,220,0.5)'; ctx.lineWidth = 4; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, p.spin.R * (0.7 + i * 0.15), p.spin.a + i * 2, p.spin.a + i * 2 + 1.4); ctx.stroke() } ctx.restore(); ctx.lineWidth = 1 }
  /* effects */
  for (const f of g.fx) {
    const x = SX(f.x || 0), y = SY(f.y || 0), u = f.t / f.d
    if (f.kind === 'boom') { ctx.save(); ctx.translate(x, y); ctx.scale(1, KY); ctx.beginPath(); ctx.arc(0, 0, f.rad * (0.4 + u * 0.6), 0, TAU); if (st === 'ink') { ctx.fillStyle = C.light; ctx.fill(); ctx.strokeStyle = C.dark; ctx.lineWidth = 2; ctx.stroke() } else { ctx.globalAlpha = 1 - u; ctx.fillStyle = u < 0.3 ? '#fff8d0' : '#f8a048'; ctx.fill() } ctx.restore(); ctx.globalAlpha = 1; ctx.lineWidth = 1 }
    else if (f.kind === 'fire') { for (let i = 0; i < 6; i++) { const a = i + g.rt * 3, r = f.rad * 0.5 * h1(i + Math.floor(g.rt * 8)), fx2 = x + Math.cos(a) * r, fy = y + Math.sin(a) * r * KY; ctx.fillStyle = st === 'ink' ? (i & 1 ? C.dark : C.light) : i & 1 ? '#f8a048' : '#ffd890'; ctx.fillRect(fx2 - 1, fy - 4 - (i % 3) * 2, 2, 4 + (i % 3) * 2) } }
    else if (f.kind === 'slash' || f.kind === 'muzzle') { ctx.fillStyle = C.light; ctx.fillRect(x - 4, y - 16, 9, 2) }
    else if (f.kind === 'dust') { for (let i = 0; i < 10; i++) { const a = i * 0.63 + u * 4, r = 6 + u * 22; ctx.fillStyle = st === 'ink' ? C.light : '#fff8d0'; ctx.fillRect(SX(g.p.x) + Math.cos(a) * r, SY(g.p.y) - 24 + Math.sin(a) * r * KY - u * 10, 1, 1) } }
  }
  for (const q of g.parts) { ctx.fillStyle = q.sp ? C.spirit : C.blood; ctx.fillRect(SX(q.x), SY(q.y) - Math.round(q.z * 0.8), 1, q.vz < -40 ? 2 : 1) }
  for (const w of g.wisps) { ctx.fillStyle = st === 'ink' ? C.light : C.spirit; ctx.globalAlpha = 1 - w.t / 0.8; ctx.fillRect(SX(w.x), SY(w.y) - Math.round(w.z), 2, 2) } ctx.globalAlpha = 1
  for (const t of g.texts) { const c = t.col === 'crit' ? C.crit : t.col === 'heal' ? C.heal : t.col === 'hurt' ? C.hurt : C.num; ptext(t.s, SX(t.x), SY(t.y) - t.z * 0.8 - t.t * 14, c, st === 'ink' && t.col === 'hurt' ? C.light : C.dark) }
}
/* corpse halves: the legs topple, the torso flies and lands; a gore stripe marks the cut */
function drawCorpse(c, st) {
  const s = sprite(c.type, dirOf(c.face), c.frame, c.v), cv2 = s[st], cut = s.cut, a = c.t > 7 ? 1 - (c.t - 7) / 2 : 1, gore = st === 'ink' ? COL.ink.blood : '#741c1c', bone = st === 'ink' ? '#efe8da' : '#e8dcb8'
  const stripe = () => { ctx.fillStyle = gore; ctx.fillRect(cut.x0, cut.y - 1, cut.x1 - cut.x0 + 1, 2); ctx.fillStyle = bone; ctx.fillRect(((cut.x0 + cut.x1) >> 1), cut.y - 1, 1, 1) }
  ctx.globalAlpha = a
  const fall = c.fall * ease((c.t - 0.25) / 0.45) * 1.3, fx = SX(c.x), fy = SY(c.y)
  ctx.save(); ctx.translate(fx, fy); ctx.rotate(fall); ctx.translate(-s.px, -s.py); ctx.beginPath(); ctx.rect(0, cut.y, s.w, s.h - cut.y); ctx.clip(); ctx.drawImage(cv2, 0, 0); stripe(); ctx.restore()
  const ux = fx + (c.x2 || 0), uy = fy + (c.y2 || 0) * KY - c.z - (s.py - cut.y)
  ctx.save(); ctx.translate(ux, uy); ctx.rotate(c.a); ctx.translate(-s.px, -cut.y); ctx.beginPath(); ctx.rect(0, 0, s.w, cut.y); ctx.clip(); ctx.drawImage(cv2, 0, 0); stripe(); ctx.restore()
  ctx.globalAlpha = 1
}
/* night: the light shrinks to a circle round guts and the rest of the world is cross-hatched over */
function drawDark(g, st, amt) {
  const r0 = (g.pit ? 130 : g.nightN === 1 ? 84 : 100) * g.light * (0.6 + 0.4 / Math.max(0.4, amt)), x = SX(g.p.x), y = SY(g.p.y) - 14
  /* a taller pool of light on portrait screens, so a phone isn't mostly black */
  const sy = KY * 1.4 * clamp(H / W / 0.8, 1, 1.9)
  const ring = (r, fill, op) => { dctx.globalCompositeOperation = op || 'source-over'; dctx.fillStyle = fill; dctx.save(); dctx.translate(x, y); dctx.scale(1, sy); dctx.beginPath(); dctx.arc(0, 0, r, 0, TAU); dctx.restore(); dctx.fill() }
  dctx.globalCompositeOperation = 'source-over'; dctx.clearRect(0, 0, W, H)
  if (st === 'ink') {
    /* manga night: clear light, a band of sparse lines, a band of cross-hatching, then solid ink */
    dctx.fillStyle = '#0e0d0c'; dctx.fillRect(0, 0, W, H); ring(r0 * 2, '#000', 'destination-out'); ring(r0 * 2, HATCH); ring(r0 * 1.55, '#000', 'destination-out'); ring(r0 * 1.55, LINES); ring(r0, '#000', 'destination-out')
    ctx.drawImage(DK, 0, 0)
  } else {
    dctx.fillStyle = 'rgba(22,14,30,0.75)'; dctx.fillRect(0, 0, W, H); dctx.globalCompositeOperation = 'destination-out'; dctx.save(); dctx.translate(x, y); dctx.scale(1, KY * 1.4)
    const gr = dctx.createRadialGradient(0, 0, r0, 0, 0, r0 * 2); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); dctx.fillStyle = gr; dctx.fillRect(-r0 * 2, -r0 * 2, r0 * 4, r0 * 4); dctx.restore()
    ctx.globalAlpha = amt; ctx.drawImage(DK, 0, 0); ctx.globalAlpha = 1
  }
}
let curStyle = null, wipe = null
function render(dt) {
  const g = game; KY = CAM.ky; const ph = g.phase(), n = nightAmt(ph), st = g.style()
  ox = g.shake > 0 ? Math.round((Math.random() - 0.5) * g.shake) : 0; oy = g.shake > 0 ? Math.round((Math.random() - 0.5) * g.shake) : 0
  if (curStyle && st !== curStyle) wipe = { from: curStyle, t: 0 }; curStyle = st
  drawWorld(g, st)
  /* the page turns: the new style spreads out from guts in a widening circle */
  if (wipe) { wipe.t += dt; const r = ease(wipe.t / 0.9) * Math.hypot(W, H), x = SX(g.p.x), y = SY(g.p.y) - 20; ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(x, y, r, 0, TAU, true); ctx.clip('evenodd'); drawWorld(g, wipe.from); ctx.restore(); ctx.strokeStyle = '#0e0d0c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; if (wipe.t > 0.9) wipe = null }
  if (n > 0 && g.eclipsed) drawDark(g, st, st === 'ink' ? n : n * 0.7)
  else if (n > 0) { ctx.fillStyle = 'rgba(60,20,24,' + (n * 0.45).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H) }
  if (g.flashT > 0) { ctx.globalAlpha = Math.min(1, g.flashT) * 0.6; ctx.fillStyle = st === 'ink' && g.flashC !== '#0e0d0c' ? (g.flashC === '#b3141a' || g.flashC === '#e81010' ? '#b3141a' : '#efe8da') : g.flashC; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1 }
  if (st === 'ink') { ctx.fillStyle = '#0e0d0c'; ctx.fillRect(0, 0, W, 2); ctx.fillRect(0, H - 2, W, 2); ctx.fillRect(0, 0, 2, H); ctx.fillRect(W - 2, 0, 2, H) }
  const gray = g.sense >= 1 && st === 'golden' ? 'grayscale(1)' : ''; if (cv.style.filter !== gray) cv.style.filter = gray
}

/* ---------- hud ---------- */
const hudSet = (el, k, v) => { if (el['_' + k] !== v) { el['_' + k] = v; if (k === 'text') el.textContent = v; else if (k === 'w') el.style.width = v; else if (k === 'hide') el.hidden = v; else if (k === 'cls') el.className = v } }
function meter(label, v, cls) { return `<div class="m ${cls || ''}"><span>${label}</span><i><b style="width:${Math.round(clamp(v, 0, 1) * 100)}%"></b></i></div>` }
let lastMeters = ''
function hud() {
  const g = game, p = g.p, ph = g.phase(), hide = g.sense >= 2
  hudSet($('hud'), 'cls', (hide ? 'faded ' : '') + (g.style() === 'ink' ? 'ink' : 'gold'))
  hudSet($('hpb'), 'w', Math.round((p.hp / p.maxHp) * 100) + '%'); hudSet($('hpt'), 'text', Math.ceil(p.hp) + ' / ' + Math.round(p.maxHp))
  hudSet($('xpb'), 'w', Math.round((p.xp / p.next) * 100) + '%'); hudSet($('clock'), 'text', fmtT(g.t))
  hudSet($('phase'), 'text', g.pit ? 'THE PIT · NIGHT ' + g.nightN : ph.k === 'day' ? 'DAY ' + g.dayN + ' · ' + g.biome().name : ph.k === 'night' ? (g.nightN === 1 ? 'THE ECLIPSE' : 'NIGHT ' + g.nightN) : ph.k.toUpperCase())
  hudSet($('lvl'), 'text', 'LV ' + p.lvl); hudSet($('kills'), 'text', p.kills + ' slain'); hudSet($('gold'), 'text', p.gold + ' gold')
  let m = ''
  if (g.branded) m += meter('BRAND', g.brand / 100, 'red')
  if (g.rageOn) m += g.armorT > 0 ? meter('ARMOR', g.armorT / g.armorDur, 'red') + meter('OVER', g.rage / 100) : meter('RAGE', g.rage / 100)
  if (g.bleed > 0) m += '<div class="tag red">BLEEDING</div>'
  if (g.sense) m += '<div class="tag">SENSE LOSS ' + 'I'.repeat(g.sense) + '</div>'
  for (const a of g.allies) m += '<div class="tag' + (a.brand ? ' red' : '') + '">' + ALLY[a.id].name + ' ' + a.lvl + '</div>'
  if (!g.eclipsed && g.t > 100) m += '<div class="tag red">ECLIPSE ' + fmtT(DAY1 + DUSK - g.t) + '</div>'
  if (m !== lastMeters) { lastMeters = m; $('meters').innerHTML = m }
  const b = g.boss; hudSet($('boss'), 'hide', !b); if (b) { hudSet($('bossn'), 'text', b.d.boss); hudSet($('bossb'), 'w', Math.round(clamp(b.hp / b.maxHp, 0, 1) * 100) + '%') }
  const ban = g.ban; hudSet($('ban'), 'hide', !ban); if (ban) { hudSet($('bant'), 'text', ban.t); hudSet($('bans'), 'text', ban.sub); $('ban').style.opacity = Math.min(1, ban.a * 4, (ban.d - ban.a) * 2) }
}

/* ---------- menus ---------- */
let state = 'title', paused = false, pver = -1
function showOv(id) { for (const o of document.querySelectorAll('.ov')) o.hidden = o.id !== id }
function cardHTML(c, i) { return `<button class="card${c.evo ? ' evo' : c.relic ? ' relic' : ''}" data-i="${i}"><span class="k">${i + 1}</span><b>${c.name}</b><em>${c.evo ? 'EVOLUTION' : c.relic ? 'RELIC' : c.isNew ? 'NEW' : 'LV ' + c.lvl}</em><p>${c.desc}</p></button>` }
function syncMenus() {
  const g = game; if (state !== 'play') return
  if (paused) { showOv('ovPause'); return }
  if (g.pver === pver) return; pver = g.pver; const pd = g.pending
  if (!pd) { showOv(null); return }
  if (pd.type === 'level' || pd.type === 'chest') { $('pickT').textContent = pd.title; $('cards').innerHTML = pd.choices.map(cardHTML).join(''); showOv('ovPick') }
  else if (pd.type === 'shop') {
    $('shopT').textContent = pd.title; $('shopG').textContent = pd.gold + ' gold'; $('shopN').textContent = pd.note || 'Three items of one tag make a set: elf, brand or steel.'
    $('items').innerHTML = pd.items.map((it, i) => `<button class="card${it.sold ? ' sold' : ''}" data-i="${i}" ${it.sold || g.p.gold < it.price ? 'disabled' : ''}><span class="k">${i + 1}</span><b>${it.name}</b><em>${it.sold ? 'SOLD' : it.price + ' gold · ' + it.vendor}</em><p>${it.desc}${it.tags.length ? ' <small>' + it.tags.join(' · ') + '</small>' : ''}</p></button>`).join('')
    $('reroll').textContent = 'Reroll (' + g.reroll + ' gold)'; $('reroll').disabled = g.p.gold < g.reroll; showOv('ovShop')
  } else if (pd.type === 'dead') {
    $('deadS').innerHTML = `Survived <b>${fmtT(g.t)}</b> · level <b>${g.p.lvl}</b> · <b>${g.p.kills}</b> slain · reached ${g.nightN ? (g.nightN === 1 ? 'the Eclipse' : 'night ' + g.nightN) : 'day ' + g.dayN}`; showOv('ovDead')
  }
}
function choose(i) { if (game && game.pending && !paused) { game.choose(i); syncMenus() } }
$('cards').addEventListener('click', e => { const b = e.target.closest('.card'); if (b) choose(+b.dataset.i) })
$('items').addEventListener('click', e => { const b = e.target.closest('.card'); if (b) choose(+b.dataset.i) })
$('reroll').onclick = () => choose('reroll'); $('go').onclick = () => choose('go')
function start(opts) { game = new Game(opts); game.view = { w: W, h: H }; state = 'play'; paused = false; pver = -1; curStyle = null; wipe = null; showOv(null); $('hud').hidden = false }
$('startB').onclick = () => start(); $('againB').onclick = () => start(); $('resumeB').onclick = () => { paused = false; pver = -1; showOv(null) }
const togglePause = () => { if (state !== 'play' || game.over) return; paused = !paused; pver = -1; if (!paused) showOv(null); syncMenus() }
addEventListener('blur', () => { if (state === 'play' && !paused && !game.pending) togglePause() })

/* ---------- input: wasd/arrows, or drag anywhere on the screen as a joystick ---------- */
const keys = {}
addEventListener('keydown', e => {
  keys[e.code] = 1
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause()
  if (/^Digit[1-4]$/.test(e.code)) choose(+e.code.slice(5) - 1)
  if (e.code === 'Enter' || e.code === 'Space') { if (state === 'title') start(); else if (game && game.over) start(); else if (game && game.pending && game.pending.type === 'shop') choose('go'); else if (paused) togglePause() }
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault()
})
addEventListener('keyup', e => { keys[e.code] = 0 })
const stick = { id: null, x: 0, y: 0, dx: 0, dy: 0 }
cv.addEventListener('pointerdown', e => { if (stick.id != null) return; stick.id = e.pointerId; stick.x = e.clientX; stick.y = e.clientY; stick.dx = stick.dy = 0; cv.setPointerCapture(e.pointerId); const s = $('stick'); s.hidden = false; s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px'; $('knob').style.transform = '' })
cv.addEventListener('pointermove', e => { if (e.pointerId !== stick.id) return; let dx = e.clientX - stick.x, dy = e.clientY - stick.y; const l = Math.hypot(dx, dy), R = 44; if (l > R) { dx *= R / l; dy *= R / l } stick.dx = dx / R; stick.dy = dy / R; $('knob').style.transform = `translate(${dx}px,${dy}px)` })
const endStick = e => { if (e.pointerId !== stick.id) return; stick.id = null; stick.dx = stick.dy = 0; $('stick').hidden = true }
cv.addEventListener('pointerup', endStick); cv.addEventListener('pointercancel', endStick)
function readInput() {
  let x = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), y = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0)
  if (stick.id != null && Math.hypot(stick.dx, stick.dy) > 0.15) { x = stick.dx; y = stick.dy }
  if (AUTO.on) { AUTO.t -= 1 / 60; if (AUTO.t <= 0) { AUTO.t = 0.8 + Math.random() * 1.5; AUTO.a += (Math.random() - 0.5) * 2.5 } x = Math.cos(AUTO.a); y = Math.sin(AUTO.a) }
  game.input.x = x; game.input.y = y
}

/* ---------- loop ---------- */
const AUTO = { on: false, t: 0, a: 0 }, PERF = { frames: 0, ms: 0 }
let last = performance.now(), acc = 0, speed = 1
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now
  if (state === 'play') {
    const t0 = performance.now(); readInput()
    if (!paused) { acc += dt * speed; let n = 0; while (acc >= 1 / 60 && n < 10 * speed) { game.step(1 / 60); acc -= 1 / 60; n++ } if (acc > 0.25) acc = 0 }
    if (AUTO.on && game.pending && !paused) { if (game.pending.type === 'shop') { game.choose(0); game.choose('go') } else if (game.pending.type !== 'dead') game.choose(Math.floor(Math.random() * game.pending.choices.length)) }
    render(paused ? 0 : dt * speed); hud(); syncMenus(); PERF.ms += performance.now() - t0; PERF.frames++
  }
  else if (game) {
    /* behind the title a demo guts wanders the field on his own */
    AUTO.t -= dt; if (AUTO.t <= 0) { AUTO.t = 1 + Math.random() * 1.5; AUTO.a += (Math.random() - 0.5) * 2.5 } game.input.x = Math.cos(AUTO.a) * 0.6; game.input.y = Math.sin(AUTO.a) * 0.6
    game.step(dt); if (game.pending) game.pending.type === 'shop' ? game.choose('go') : game.choose(0); render(dt)
  }
  if (WARM.length) warmUp(state === 'play' ? 3 : 8)
  requestAnimationFrame(frame)
}
resize(); game = new Game({ god: true, seed: 1 }); game.view = { w: W, h: H }; game.ban = null; showOv('ovTitle'); $('hud').hidden = true; requestAnimationFrame(frame)
/* test hooks for the headless smoke run; harmless in play */
window.__BZ = { get g() { return game }, start, auto: on => (AUTO.on = on), speed: v => (speed = v), perf: () => { const r = { frames: PERF.frames, ms: PERF.ms }; PERF.frames = 0; PERF.ms = 0; return r }, warmLeft: () => WARM.length,
  /* step + render n frames back to back, reading a pixel each frame so the gpu work is counted too */
  bench: n => { const t0 = performance.now(); for (let i = 0; i < n; i++) { game.step(1 / 60); render(1 / 60); ctx.getImageData(0, 0, 1, 1) } return (performance.now() - t0) / n },
  horde: (n, types) => { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, r = 60 + Math.random() * 200; game.spawn(types[i % types.length], game.p.x + Math.cos(a) * r, game.p.y + Math.sin(a) * r * 0.9) } } }
