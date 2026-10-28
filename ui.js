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
const FONT = { 0: '75557', 1: '26227', 2: '71747', 3: '71717', 4: '55711', 5: '74717', 6: '74757', 7: '71111', 8: '75757', 9: '75717', '+': '02720', '-': '00700', A: '25755', B: '65656', C: '34443', D: '65556', E: '74647', F: '74644', G: '34553', H: '55755', I: '72227', J: '11153', K: '55655', L: '44447', M: '57755', N: '65555', O: '25552', P: '65644', Q: '25563', R: '65655', S: '34216', T: '72222', U: '55557', V: '55552', W: '55775', X: '55255', Y: '55222', Z: '71247', ' ': '00000', '!': '22202', '.': '00002' }
function ptext(s, x, y, col, out) {
  x = Math.round(x - s.length * 2); y = Math.round(y)
  for (const pass of out ? [0, 1] : [1]) { ctx.fillStyle = pass ? col : out
    for (let i = 0; i < s.length; i++) { const gl = FONT[s[i]] || FONT[' ']; for (let r = 0; r < 5; r++) { const bits = +gl[r]; for (let c = 0; c < 3; c++) if (bits & (4 >> c)) { if (pass) ctx.fillRect(x + i * 4 + c, y + r, 1, 1); else ctx.fillRect(x + i * 4 + c - 1, y + r - 1, 3, 3) } } } }
}
const COL = {
  golden: { blood: '#7e1616', blood2: '#5e1a14', soot: '#2c2418', shadow: 'rgba(28,18,12,0.4)', steel: '#ece0c4', dark: '#1e140e', light: '#fff4dc', gem: '#e0a46a', gem2: '#fff8d0', coin: '#f0c48a', num: '#f8dcae', crit: '#d85a3a', heal: '#c8d890', hurt: '#d85a3a', spirit: '#d0d4e0', fire: '#f8a048' },
  ink: { blood: '#b3141a', blood2: '#b3141a', soot: '#0e0d0c', shadow: null, steel: '#0e0d0c', dark: '#0e0d0c', light: '#efe8da', gem: '#efe8da', gem2: '#0e0d0c', coin: '#efe8da', num: '#efe8da', crit: '#efe8da', heal: '#efe8da', hurt: '#b3141a', spirit: '#efe8da', fire: '#efe8da' },
}
/* diagonal line screens for the night falloff: one direction only, so they never read as a checker */
const diag = n => { const c = mkCanvas(n, n), x = c.getContext('2d'); x.fillStyle = '#0e0d0c'; for (let i = 0; i < n; i++) x.fillRect(i, n - 1 - i, 1, 1); return ctx.createPattern(c, 'repeat') }
const DENSE = diag(3), SPARSE = diag(6)

/* ---------- world rendering ---------- */
let game = null, ox = 0, oy = 0
const SX = x => Math.round(x - game.cam.x + W / 2 + ox), SY = y => Math.round((y - game.cam.y) * KY + H / 2 + 14 + oy)
const onScreen = (x, y, m) => { const sx = SX(x), sy = SY(y); return sx > -m && sx < W + m && sy > -m && sy < H + m * 1.6 }
function blit(s, st, x, y, z, a, lighter) { const c = s[st]; if (a != null && a < 1) ctx.globalAlpha = a; ctx.drawImage(c, SX(x) - s.px, SY(y) - s.py - (z || 0)); if (lighter) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(c, SX(x) - s.px, SY(y) - s.py - (z || 0)); ctx.globalCompositeOperation = 'source-over' } ctx.globalAlpha = 1 }
function shadow(st, x, y, rx) { const sx = SX(x), sy = SY(y); ctx.beginPath(); ctx.ellipse(sx, sy, rx, rx * KY * 0.7, 0, 0, TAU); if (st === 'ink') { ctx.fillStyle = '#0e0d0c'; ctx.fill() } else { ctx.fillStyle = COL.golden.shadow; ctx.fill() } }
/* props live on a world grid turned 45 degrees; chunks are seeded so the same field comes back */
const CH = 220
/* things that burn: light radius, colour, flame height above the ground (px) and size */
const LIT = { torch: { r: 90, c: [255, 160, 80], z: 30, s: 1 }, campfire: { r: 130, c: [255, 150, 70], z: 5, s: 1.7 }, brazier: { r: 100, c: [255, 170, 90], z: 15, s: 1.2 }, wagon: { r: 150, c: [255, 130, 60], z: 12, s: 2.2 } }
const EYES = { grunbeld: [255, 160, 60], rosine: [220, 240, 255], crawler: [255, 120, 40], troll: [255, 120, 40], imp: [255, 150, 60], zodd: [255, 90, 40], count: [255, 200, 90], pitlord: [255, 200, 90], ghost: [190, 220, 255], wraith: [190, 220, 255], godhand: [255, 60, 40] }
let LIGHTS = []
function flame(x, y, s, st, seed, t) {
  for (let i = 0; i < 4; i++) {
    const k = n2(t * 9 + i * 3.1, seed), w = (2.6 - i * 0.5) * s, h = (5 + k * 4 - i) * s, fx = x + (i - 1.5) * 1.2 * s + Math.sin(t * 11 + i) * 0.8
    ctx.fillStyle = st === 'ink' ? (i === 0 ? '#0e0d0c' : '#efe8da') : ['#7e2a10', '#e0601c', '#f8a048', '#ffe8b0'][i]
    ctx.beginPath(); ctx.moveTo(fx - w, y); ctx.quadraticCurveTo(fx - w * 0.6, y - h * 0.5, fx, y - h); ctx.quadraticCurveTo(fx + w * 0.6, y - h * 0.5, fx + w, y); ctx.fill()
  }
}
function propsInView(g) {
  const out = [], B = g.biome(), kinds = g.nightN === 1 && g.phase().k === 'night' ? ['flesh', 'cross', 'wheel', 'flesh'] : B.props, x0 = Math.floor((g.cam.x - W / 2 - 80) / CH), x1 = Math.floor((g.cam.x + W / 2 + 80) / CH), y0 = Math.floor((g.cam.y - H / KY / 2 - 80) / CH), y1 = Math.floor((g.cam.y + H / KY / 2 + 160) / CH)
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
    const h = i => h2(cx * 7 + i * 131 + g.dayN * 17, cy * 13 + i * 71), bx = cx * CH, by = cy * CH
    if (Math.abs(bx + CH / 2) < CH && Math.abs(by + CH / 2) < CH) continue
    const kind = kinds[Math.floor(h(1) * kinds.length)], id = cx + ',' + cy + ','
    if (h(2) < 0.35 && !LIT[kind]) { const dx = Math.SQRT1_2, dy = h(3) < 0.5 ? Math.SQRT1_2 : -Math.SQRT1_2, n = 3 + Math.floor(h(4) * 4); for (let i = 0; i < n; i++) out.push({ x: bx + 40 + h(5) * 80 + dx * i * 30, y: by + 40 + h(6) * 80 + dy * i * 30, kind, seed: i % 3, id: id + i }) }
    else for (let i = 0; i < 2; i++) out.push({ x: bx + h(10 + i) * CH, y: by + h(20 + i) * CH, kind: kinds[Math.floor(h(30 + i) * kinds.length)], seed: Math.floor(h(40 + i) * 3), id: id + 'b' + i })
  }
  if (g.bounds) { const b = g.bounds; for (let x = b.x0; x <= b.x1; x += 52) { out.push({ x, y: b.y0 - 4, kind: 'pillar', seed: (x / 52) & 1 }); out.push({ x, y: b.y1 + 8, kind: x % 104 === 0 ? 'brazier' : 'pillar', seed: 2, id: 'pb' + x }) } for (let y = b.y0 + 52; y < b.y1; y += 52) { out.push({ x: b.x0 - 8, y, kind: 'brazier', seed: 1, id: 'pl' + y }); out.push({ x: b.x1 + 8, y, kind: 'brazier', seed: 0, id: 'pr' + y }) } }
  return out
}
function gutsFrame(g) {
  const p = g.p, A = g.armorT > 0, bl = g.goreStage(), sc = g.eclipsed
  if (p.spin) { const a = p.spin.a; return gutsSpriteSoft(dirOf(a), 's', 4, A, bl, sc) }
  if (p.swing) { const d = dirOf(p.swing.dir), sw = d * (Math.PI / 4) - (p.swing.cur != null ? p.swing.cur : p.swing.a0), k = clamp(Math.round((angDiff(0, sw) + 1.6) / 0.4), 0, GSW - 1); return gutsSpriteSoft(d, 's', k, A, bl, sc) }
  if (p.moving) return gutsSpriteSoft(dirOf(p.face), 'w', Math.floor(p.walk / (Math.PI / 4)) & 7, A, bl, sc)
  return gutsSpriteSoft(dirOf(p.face), 'i', 0, A, bl, sc)
}
/* fresh blood glistens: a glint runs down the visible blade. drenched, it drips from the tip onto the ground */
const DRIPS = []; let dripT = 0
function bladeFx(g, s, st) {
  const bl = g.goreStage(), dt = Math.max(0, Math.min(0.1, g.rt - dripT)); dripT = g.rt
  if ((bl === 2 || bl === 3) && s.run && s.run.length) {
    const i = Math.floor(g.rt * 7) % (s.run.length + 5), q = s.run[i]
    if (q) { const x = SX(g.p.x) + q[0], y = SY(g.p.y) + q[1]; ctx.fillStyle = st === 'ink' ? COL.ink.light : COL.golden.light; ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + 1, y - 1, 1, 1) }
  }
  if (bl === 3 && s.tip && DRIPS.length < 24 && Math.random() < dt * 4) DRIPS.push({ x: g.p.x + s.tip[0], y: g.p.y + s.tip[1], z: s.tip[2], vz: -8 })
  ctx.fillStyle = COL[st].blood
  for (let i = DRIPS.length - 1; i >= 0; i--) {
    const d = DRIPS[i]; d.vz -= 340 * dt; d.z += d.vz * dt
    if (d.z <= 0) { DRIPS.splice(i, 1); g.stains.push({ x: d.x, y: d.y, s: 1 }); if (g.stains.length > 1600) g.stains.splice(0, 200); continue }
    ctx.fillRect(SX(d.x), SY(d.y) - Math.round(d.z * 0.8), 1, d.vz < -40 ? 2 : 1)
  }
}
function drawWorld(g, st) {
  const C = COL[st], tile = tileCanvas(st === 'golden' ? g.biome().tile : g.nightN === 1 && g.phase().k !== 'day' ? 'eclipse' : 'paper')
  ctx.save(); ctx.translate((((W / 2 - g.cam.x + ox) % 256) + 256) % 256 - 256, (((H / 2 + 14 - g.cam.y * KY + oy) % 256) + 256) % 256 - 256); ctx.fillStyle = ctx.createPattern(tile, 'repeat'); ctx.fillRect(0, 0, W + 512, H + 512); ctx.restore()
  /* at night the blood thins out to a few clean pools, so it reads as pools and not as noise */
  const night = st === 'ink'
  for (const pl of g.pools) { if (!onScreen(pl.x, pl.y, 40)) continue; const c = POOLS[st][pl.r * 6 + pl.s], k = (0.4 + 0.6 * ease(pl.t)) * (night ? 0.7 : 1), w = c.width * k, h = c.height * k; ctx.drawImage(c, SX(pl.x) - w / 2, SY(pl.y) - h / 2, w, h) }
  for (let i = night ? g.stains.length % 4 : 0; i < g.stains.length; i += night ? 4 : 1) { const s = g.stains[i]; if (!onScreen(s.x, s.y, 4) || (night && s.soot)) continue; ctx.fillStyle = s.soot ? C.soot : s.s > 1 ? C.blood2 : C.blood; if (s.soot) { ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.ellipse(SX(s.x), SY(s.y), 9, 5, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1 } else ctx.fillRect(SX(s.x), SY(s.y), s.s, 1) }
  for (const tl of g.tele) { const a = Math.sin(tl.t * 30) > 0; ctx.fillStyle = a ? COL.ink.blood : C.dark; const x = SX(tl.x), y = SY(tl.y); for (let i = -3; i <= 3; i++) { ctx.fillRect(x + i, y + Math.round(i * 0.5), 1, 1); ctx.fillRect(x + i, y - Math.round(i * 0.5), 1, 1) } }
  /* ground items */
  for (const k of g.gems) { if (!onScreen(k.x, k.y, 6)) continue; const x = SX(k.x), y = SY(k.y) - 3 - Math.round(Math.sin(g.rt * 4 + k.x) * 1), big = k.v > 4; ctx.fillStyle = C.dark; ctx.fillRect(x - 2, y - 3, 5, 7); ctx.fillStyle = C.gem; ctx.fillRect(x - 1, y - 2, 3, 5); ctx.fillStyle = C.gem2; ctx.fillRect(x, y - 2, 1, big ? 4 : 2) }
  for (const k of g.coins) { if (!onScreen(k.x, k.y, 6)) continue; const x = SX(k.x), y = SY(k.y) - 2; ctx.fillStyle = C.dark; ctx.fillRect(x - 2, y - 2, 5, 4); ctx.fillStyle = C.coin; ctx.fillRect(x - 1, y - 1, 3, 2) }
  for (const k of g.pickups) { const x = SX(k.x), y = SY(k.y) - 4; if (k.kind === 'item' || k.kind === 'flask') { const c = k.kind === 'flask' ? '#c8302a' : { common: '#c9b78e', rare: '#5a8fd0', epic: '#a65ad0', legendary: '#e0962a' }[k.item.rar], b = Math.sin(g.rt * 6 + k.x) > 0.6; ctx.fillStyle = C.dark; ctx.fillRect(x - 4, y - 5, 9, 9); ctx.fillStyle = st === 'ink' && k.kind === 'item' ? C.light : c; ctx.fillRect(x - 3, y - 4, 7, 7); if (b) { ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 8, 1, 3); ctx.fillRect(x - 2, y - 7, 3, 1) } continue } ctx.fillStyle = C.dark; ctx.fillRect(x - 5, y - 4, 11, 8); ctx.fillStyle = k.kind === 'chest' ? C.coin : C.blood; ctx.fillRect(x - 4, y - 3, 9, 6); if (k.kind === 'chest') { ctx.fillStyle = C.dark; ctx.fillRect(x - 4, y - 1, 9, 1) } }
  /* everything standing, painter-sorted by ground depth */
  const L = [], p0 = g.p, sn = g.snuffed || (g.snuffed = new Set()), dark = nightAmt(g.phase()) > 0.3; LIGHTS = []
  for (const pr of propsInView(g)) {
    if (!onScreen(pr.x, pr.y, 160)) continue; const lt = LIT[pr.kind], it = { y: pr.y, s: propSprite(pr.kind, pr.seed), x: pr.x, sh: pr.kind === 'pillar' || pr.kind === 'rock' ? 10 : 4 }
    if (lt && !sn.has(pr.id)) {
      /* a swing knocks a torch over and sets the ground alight; spirits drifting through snuff the flames */
      if (p0.swing && pr.kind === 'torch' && Math.hypot(pr.x - p0.x, pr.y - p0.y) < p0.swing.R) { sn.add(pr.id); g.fx.push({ kind: 'fire', x: pr.x, y: pr.y, rad: 30, t: 0, d: 3, tick: 0, dmg: 6 }); continue }
      if (dark && g.t % 0.5 < 0.02) for (const e of g.en) if (e.d.spirit && Math.abs(e.x - pr.x) < 14 && Math.abs(e.y - pr.y) < 14 && Math.random() < 0.3) { sn.add(pr.id); break }
      it.lit = lt; it.seed = pr.seed + pr.x * 0.01; LIGHTS.push({ x: pr.x, y: pr.y, z: lt.z, r: lt.r, c: lt.c, i: 0.75 + 0.25 * n2(g.rt * 7, pr.x * 0.1) })
    } else if (lt) it.smoke = 1
    if (onScreen(pr.x, pr.y, 60)) L.push(it)
  }
  for (const e of g.en) {
    const B = BOSS[e.type]; if (!onScreen(e.x, e.y, B ? 160 : 70)) continue
    if (B) { if (!e.warm) { e.warm = 1; bossWarm(e.type, dirOf(e.face)) } const [an, k] = bossFrame(e, g.rt); e._spr = bossSprite(e.type, an, Math.min(k, BFRAMES[an] - 1), dirOf(e.face)); L.push({ y: e.y, s: e._spr, x: e.x, z: e.z || 0, sh: B.shadow, e }); continue }
    /* in reach of guts they swing: two attack frames alternate */
    const near = Math.hypot(e.x - g.p.x, e.y - g.p.y) < e.d.r + 22, f = e.stun > 0 ? 4 : near ? 5 + (Math.floor(g.rt * 4 + e.ph) & 1) : Math.floor(e.anim) & 3
    const s = sprite(e.type, dirOf(e.face), f, e.type === 'soldier' ? (e.ph > Math.PI ? 1 : 0) : 0); L.push({ y: e.y, s, x: e.x, sh: e.d.r, e }); if (e.lantern) LIGHTS.push({ x: e.x + Math.cos(e.face + 1.2) * 8, y: e.y + Math.sin(e.face + 1.2) * 8, z: 20, r: 60, c: [255, 200, 120], i: 0.85 + 0.15 * Math.sin(g.rt * 9 + e.ph) }) }
  for (const c of g.corpses) if (onScreen(c.x, c.y, 80)) L.push({ y: c.y - 1, c })
  for (const a of g.allies) L.push({ y: a.y, s: sprite(a.id, dirOf(a.face), a.moving ? Math.floor(a.anim) & 3 : 4), x: a.x, sh: 8, a })
  for (const r of g.riders) L.push({ y: r.y, s: sprite('skullknight', dirOf(r.face), Math.floor(r.anim) & 3), x: r.x, sh: 10 })
  L.push({ y: g.p.y, s: gutsFrame(g), x: g.p.x, sh: 11, guts: 1 })
  const pw = g.weapons.find(w => w.id === 'puck'); if (pw) { const a = pw.ang, x = g.p.x + Math.cos(a) * 26, y = g.p.y + Math.sin(a) * 18; L.push({ y, s: sprite('puck', dirOf(a + Math.PI / 2), 4), x, z: 30 + Math.sin(g.rt * 3) * 3, sh: 3 }); LIGHTS.push({ x, y, z: 30, r: 55, c: [200, 255, 170], i: 0.8 }) }
  /* guts always carries a little light, and the brand pulses red on his neck */
  LIGHTS.push({ x: g.p.x, y: g.p.y, z: 24, r: 80, c: [255, 225, 180], i: 1 })
  if (g.branded) LIGHTS.push({ x: g.p.x, y: g.p.y, z: 34, r: 30 + g.brand * 0.4, c: [255, 50, 30], i: (0.45 + 0.35 * Math.sin(g.rt * 7)) * (0.3 + g.brand / 140) })
  if (g.armorT > 0) LIGHTS.push({ x: g.p.x, y: g.p.y, z: 10, r: 70, c: [255, 70, 30], i: 0.8 + 0.2 * Math.sin(g.rt * 13) })
  for (const f of g.fx) if (f.kind === 'boom' || f.kind === 'fire' || f.kind === 'bfire' || f.kind === 'muzzle') LIGHTS.push({ x: f.x, y: f.y, z: 6, r: f.kind === 'boom' ? f.rad * 3 : f.kind === 'fire' ? 75 : 45, c: [255, 170, 80], i: f.kind === 'fire' ? 0.7 + 0.3 * Math.random() : 1 - f.t / f.d })
  for (const it of L) if (it.s && it.sh) shadow(st, it.x, it.y, it.sh)
  for (const it of L) if (it.e && it.e.elite) { ctx.strokeStyle = COL.ink.blood; ctx.beginPath(); ctx.ellipse(SX(it.x), SY(it.y), it.sh + 4, (it.sh + 4) * KY, 0, 0, TAU); ctx.stroke() }
  /* mutated foes wear a second ring: pale for swift, double iron for iron-hide, pulsing red for the ones that burst */
  for (const it of L) { const m = it.e && it.e.mut; if (!m) continue; const r = it.sh + 7, x = SX(it.x), y = SY(it.y); ctx.strokeStyle = m === 'swift' ? C.light : m === 'iron' ? C.steel : Math.sin(g.rt * 10) > 0 ? COL.ink.blood : C.dark; ctx.beginPath(); ctx.ellipse(x, y, r, r * KY, 0, 0, TAU); ctx.stroke(); if (m === 'iron') { ctx.beginPath(); ctx.ellipse(x, y, r + 2, (r + 2) * KY, 0, 0, TAU); ctx.stroke() } }
  /* the tell before a shot or a charge: a red line on the ground along the locked aim */
  for (const it of L) { const e = it.e; if (!e || !(e.rs === 1 || e.rs === 2) || !e.d.role) continue; const len = e.d.role === 'charge' ? 170 : Math.hypot(g.p.x - e.x, g.p.y - e.y), x0 = SX(e.x), y0 = SY(e.y), x1 = SX(e.x + Math.cos(e.aim) * len), y1 = SY(e.y + Math.sin(e.aim) * len)
    ctx.strokeStyle = st === 'ink' ? (Math.sin(g.rt * 30) > 0 ? COL.ink.blood : C.dark) : 'rgba(200,40,26,0.75)'; ctx.lineWidth = e.d.role === 'charge' ? 3 : 1; ctx.setLineDash(e.rs === 1 ? [4, 3] : []); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1 }
  L.sort((a, b) => a.y - b.y)
  for (const it of L) {
    if (it.c) { drawCorpse(it.c, st); continue }
    if (it.guts) { const p = g.p; if (g.armorT > 0) frenzyAura(g, st, it.s); blit(it.s, st, it.x, it.y, 0, 1, p.hurtT > 0 && Math.sin(g.rt * 40) > 0); bladeFx(g, it.s, st); if (p.healT > 0) healFlash(it.s, st, p); continue }
    if (it.lit || it.smoke) { blit(it.s, st, it.x, it.y, 0, 1); const x = SX(it.x), y = SY(it.y) - (it.lit || LIT.torch).z; if (it.lit) flame(x, y + 2, it.lit.s, st, it.seed, g.rt); else { ctx.fillStyle = st === 'ink' ? '#0e0d0c' : '#5c5a5a'; for (let k = 0; k < 3; k++) ctx.fillRect(x + Math.round(Math.sin(g.rt * 2 + k) * 2), y - 3 - ((g.rt * 8 + k * 5) % 14), 1, 1) } continue }
    if (it.e && it.e.lantern) { blit(it.s, st, it.x, it.y, 0, 1, it.e.flash > 0); const x = SX(it.x + Math.cos(it.e.face + 1.2) * 8), y = SY(it.y + Math.sin(it.e.face + 1.2) * 8) - 16; ctx.fillStyle = '#1e140e'; ctx.fillRect(x - 2, y - 3, 4, 5); ctx.fillStyle = st === 'ink' ? '#efe8da' : '#ffd890'; ctx.fillRect(x - 1, y - 2, 2, 3); continue }
    if (it.a) { blit(it.s, st, it.x, it.y, it.a.z || 0, it.a.fade ? 1 - it.a.fade : it.a.down > 0 ? 0.35 : 1); if (it.a.brand) { const x = SX(it.x), y = SY(it.y) - it.s.py + it.s.top - 12; ctx.save(); ctx.translate(x, y); ctx.shadowColor = '#ff2a10'; ctx.shadowBlur = 6; ctx.fillStyle = '#ff4020'; ctx.fill(BRAND2D); ctx.restore() } continue }
    blit(it.s, st, it.x, it.y, it.z || 0, it.e && it.e.vanish > 0 ? 0.12 : it.e && it.e.flee ? 0.6 : 1, it.e && it.e.flash > 0)
    /* ganishka's weak point: while his eyes are open a gold-red diamond pulses between them */
    if (it.e && it.e.type === 'ganishka' && it.e.weakT > 0) { const x = SX(it.x), y = SY(it.y) - it.s.py + it.s.top + Math.round(it.s.h * 0.2), r = 3 + (Math.sin(g.rt * 14) > 0 ? 1 : 0); ctx.fillStyle = '#ffe8b0'; for (let k = -r; k <= r; k++) ctx.fillRect(x - (r - Math.abs(k)), y + k, (r - Math.abs(k)) * 2 + 1, 1); ctx.fillStyle = '#d0281a'; ctx.fillRect(x - 1, y - 1, 3, 3) }
  }
  /* projectiles and enemy fire */
  for (const q of g.pr) {
    const x = SX(q.x), y = SY(q.y) - (q.z || 0) * 0.8, l = Math.hypot(q.vx || 0, q.vy || 0) || 1, dx = (q.vx || 0) / l, dy = ((q.vy || 0) / l) * KY
    if (q.kind === 'wave') { ctx.strokeStyle = st === 'ink' ? C.dark : 'rgba(255,240,210,.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x - dx * 6, y - dy * 6, 9, Math.atan2(dy, dx) - 1, Math.atan2(dy, dx) + 1); ctx.stroke(); ctx.lineWidth = 1; continue }
    if (q.kind === 'knife' || q.kind === 'bolt') { const n = q.kind === 'bolt' ? 7 : 5; ctx.fillStyle = C.dark; for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x - dx * i), Math.round(y - dy * i), 2, 2); ctx.fillStyle = st === 'ink' ? C.light : C.steel; for (let i = 0; i < n - 1; i++) ctx.fillRect(Math.round(x - dx * i), Math.round(y - dy * i), 1, 1) }
    else { ctx.fillStyle = C.dark; ctx.beginPath(); ctx.arc(x, y, q.kind === 'ball' ? 3.5 : 3, 0, TAU); ctx.fill(); ctx.fillStyle = C.light; ctx.fillRect(x - 1, y - 2, 1, 1); if (q.kind === 'bomb') { ctx.fillStyle = Math.sin(g.rt * 40) > 0 ? C.fire : C.light; ctx.fillRect(x + 1, y - 4, 1, 2) } }
  }
  for (const b of g.eb) {
    const x = SX(b.x), y = SY(b.y) - (b.ring ? 0 : 14)
    if (b.ring) { ctx.strokeStyle = C.dark; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, b.R, b.R * KY, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = st === 'ink' ? C.light : '#94764c'; ctx.stroke() }
    else if (b.kind === 'arrow') { const l = Math.hypot(b.vx, b.vy) || 1, dx = b.vx / l, dy = (b.vy / l) * KY; ctx.fillStyle = C.dark; for (let i = 0; i < 7; i++) ctx.fillRect(Math.round(x - dx * i), Math.round(y - dy * i), 2, 2); ctx.fillStyle = st === 'ink' ? C.light : '#e8d8b0'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1) }
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
    else if (f.kind === 'acid' || f.kind === 'dust') {
      const k = Math.min(1, f.t * 3, (f.d - f.t) * 2); ctx.save(); ctx.translate(x, y); ctx.scale(1, KY); ctx.beginPath(); ctx.arc(0, 0, f.rad, 0, TAU)
      if (st === 'ink') { ctx.fillStyle = f.kind === 'acid' ? DENSE : SPARSE; ctx.globalAlpha = k; ctx.fill(); ctx.strokeStyle = C.dark; ctx.lineWidth = 1.2; ctx.stroke() }
      else { ctx.globalAlpha = k * (f.kind === 'acid' ? 0.6 : 0.32); ctx.fillStyle = f.kind === 'acid' ? '#7c7a40' : '#d8ccb4'; ctx.fill(); if (f.core) { ctx.beginPath(); ctx.arc(0, 0, f.core, 0, TAU); ctx.globalAlpha = k * 0.4; ctx.fillStyle = '#f0e0c0'; ctx.fill() } }
      ctx.restore(); ctx.globalAlpha = 1; ctx.lineWidth = 1
      if (f.kind === 'acid') for (let i = 0; i < 3; i++) { const a = i * 2.1 + g.rt * 2, r = f.rad * 0.6 * h1(i + Math.floor(g.rt * 2)); ctx.fillStyle = st === 'ink' ? C.light : '#c8c070'; ctx.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r * KY, 2, 1) }
    }
    else if (f.kind === 'fire' || f.kind === 'bfire') { for (let i = 0; i < 6; i++) { const a = i + g.rt * 3, r = f.rad * 0.5 * h1(i + Math.floor(g.rt * 8)), fx2 = x + Math.cos(a) * r, fy = y + Math.sin(a) * r * KY; ctx.fillStyle = st === 'ink' ? (i & 1 ? C.dark : C.light) : i & 1 ? '#f8a048' : '#ffd890'; ctx.fillRect(fx2 - 1, fy - 4 - (i % 3) * 2, 2, 4 + (i % 3) * 2) } }
    else if (f.kind === 'slash' || f.kind === 'muzzle') { ctx.fillStyle = C.light; ctx.fillRect(x - 4, y - 16, 9, 2) }
    else if (f.kind === 'dust') { for (let i = 0; i < 10; i++) { const a = i * 0.63 + u * 4, r = 6 + u * 22; ctx.fillStyle = st === 'ink' ? C.light : '#fff8d0'; ctx.fillRect(SX(g.p.x) + Math.cos(a) * r, SY(g.p.y) - 24 + Math.sin(a) * r * KY - u * 10, 1, 1) } }
  }
  for (const q of g.parts) { ctx.fillStyle = q.sp ? C.spirit : C.blood; ctx.fillRect(SX(q.x), SY(q.y) - Math.round(q.z * 0.8), 1, q.vz < -40 ? 2 : 1) }
  for (const w of g.wisps) { ctx.fillStyle = st === 'ink' ? C.light : C.spirit; ctx.globalAlpha = 1 - w.t / 0.8; ctx.fillRect(SX(w.x), SY(w.y) - Math.round(w.z), 2, 2) } ctx.globalAlpha = 1
  for (const t of g.texts) { const c = t.col === 'crit' ? C.crit : t.col === 'heal' ? C.heal : t.col === 'hurt' ? C.hurt : C.num; ptext(t.s, SX(t.x), SY(t.y) - t.z * 0.8 - t.t * 14, c, st === 'ink' && t.col === 'hurt' ? C.light : C.dark) }
}
/* corpse halves: the legs topple, the torso flies and lands; a gore stripe marks the cut */
function drawCorpse(c, st) {
  /* an apostle first collapses (three frames), and only then splits */
  if (c.dying > 0) { const k = Math.min(2, Math.floor((1 - c.dying) * 3)), s = bossSprite(c.type, 'death', k, dirOf(c.face)); ctx.drawImage(s[st], SX(c.x) - s.px, SY(c.y) - s.py); return }
  const s = BOSS[c.type] ? bossSprite(c.type, 'death', 2, dirOf(c.face)) : sprite(c.type, dirOf(c.face), c.frame, c.v), cv2 = s[st], cut = s.cut, a = c.t > 7 ? 1 - (c.t - 7) / 2 : 1, gore = st === 'ink' ? COL.ink.blood : '#741c1c', bone = st === 'ink' ? '#efe8da' : '#e8dcb8'
  const stripe = () => { ctx.fillStyle = gore; ctx.fillRect(cut.x0, cut.y - 1, cut.x1 - cut.x0 + 1, 2); ctx.fillStyle = bone; ctx.fillRect(((cut.x0 + cut.x1) >> 1), cut.y - 1, 1, 1) }
  ctx.globalAlpha = a
  const fall = c.fall * ease((c.t - 0.25) / 0.45) * 1.3, fx = SX(c.x), fy = SY(c.y)
  ctx.save(); ctx.translate(fx, fy); ctx.rotate(fall); ctx.translate(-s.px, -s.py); ctx.beginPath(); ctx.rect(0, cut.y, s.w, s.h - cut.y); ctx.clip(); ctx.drawImage(cv2, 0, 0); stripe(); ctx.restore()
  const ux = fx + (c.x2 || 0), uy = fy + (c.y2 || 0) * KY - c.z - (s.py - cut.y)
  ctx.save(); ctx.translate(ux, uy); ctx.rotate(c.a); ctx.translate(-s.px, -cut.y); ctx.beginPath(); ctx.rect(0, 0, s.w, cut.y); ctx.clip(); ctx.drawImage(cv2, 0, 0); stripe(); ctx.restore()
  ctx.globalAlpha = 1
}
/* dark night: a low-res light map (deep moonlight plus every flame, lantern and glow as a flickering
   point light) multiplied over the painted scene, so colour survives only near the fires */
const LM = mkCanvas(8, 8), lctx = LM.getContext('2d')
function drawNight(g, n) {
  const w = (W + 1) >> 1, h = (H + 1) >> 1; if (LM.width !== w || LM.height !== h) { LM.width = w; LM.height = h }
  const amb = [255 + (22 - 255) * n, 255 + (28 - 255) * n, 255 + (50 - 255) * n]
  lctx.globalCompositeOperation = 'source-over'; lctx.fillStyle = `rgb(${amb.map(Math.round)})`; lctx.fillRect(0, 0, w, h); lctx.globalCompositeOperation = 'lighter'
  /* the nearest few dozen lights are plenty; a lantern crowd shouldn't turn into one orange blob */
  const px = g.p.x, py = g.p.y; if (LIGHTS.length > 36) LIGHTS.sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py)).length = 36
  for (const l of LIGHTS) {
    const x = SX(l.x) / 2, y = (SY(l.y) - l.z) / 2, r = (l.r / 2) * (0.92 + 0.08 * l.i); if (x < -r || y < -r || x > w + r || y > h + r) continue
    const k = l.i * n, gr = lctx.createRadialGradient(x, y, 0, x, y, r), c = l.c
    gr.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${Math.min(1, k)})`); gr.addColorStop(0.45, `rgba(${c[0]},${c[1] * 0.8 | 0},${c[2] * 0.6 | 0},${(k * 0.45).toFixed(3)})`); gr.addColorStop(1, 'rgba(0,0,0,0)')
    lctx.fillStyle = gr; lctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  ctx.globalCompositeOperation = 'multiply'; ctx.imageSmoothingEnabled = true; ctx.drawImage(LM, 0, 0, W, H); ctx.imageSmoothingEnabled = false; ctx.globalCompositeOperation = 'source-over'
  /* out in the dark, demons are only their eyes */
  if (n > 0.4) { ctx.globalCompositeOperation = 'lighter'; for (const e of g.en) { const c = EYES[e.type]; if (!c || !onScreen(e.x, e.y, 10)) continue; const s = e._spr || sprite(e.type, dirOf(e.face), 4, 0), x = SX(e.x) + Math.round(Math.cos(e.face) * 2 * e.d.sc), y = SY(e.y) - s.py + s.top + Math.round(3 * e.d.sc), a = (n - 0.4) * 1.6
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${Math.min(1, a)})`; ctx.fillRect(x - 2, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); ctx.fillStyle = `rgba(${c[0]},${c[1] >> 1},${c[2] >> 2},${Math.min(0.5, a * 0.5)})`; ctx.fillRect(x - 3, y - 1, 6, 3) }
    ctx.globalCompositeOperation = 'source-over' }
}
/* the level-up heal: a green-white glow washes over guts (plain white in ink) */
function healFlash(s, st, p) {
  const k = p.healT / 0.5, x = SX(p.x), y = SY(p.y)
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k * 0.9; ctx.drawImage(s[st], x - s.px, y - s.py)
  ctx.globalAlpha = k * (st === 'ink' ? 0.6 : 0.45); ctx.fillStyle = st === 'ink' ? '#ffffff' : '#a8ffb8'; ctx.beginPath(); ctx.ellipse(x, y - 22, 16 + (1 - k) * 10, 26 + (1 - k) * 10, 0, 0, TAU); ctx.fill()
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1
}
/* frenzy: the armor's red-black flames lick up around guts, embers trail him, an afterimage lags behind */
const AFT = [], EMB = []
function frenzyAura(g, st, s) {
  const x = SX(g.p.x), y = SY(g.p.y), red = st === 'ink' ? '#b3141a' : '#d0281a'
  AFT.forEach((a, k) => { ctx.globalAlpha = 0.12 + k * 0.06; ctx.drawImage(a.s[st], SX(a.x) - a.s.px, SY(a.y) - a.s.py) }); ctx.globalAlpha = 1
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + g.rt * 1.7, bx = x + Math.cos(a) * 10, by = y - 4 + Math.sin(a) * 5, hgt = 22 + 18 * n2(g.rt * 6 + i, i * 3.3), lean = Math.sin(g.rt * 5 + i) * 4
    ctx.fillStyle = i % 3 === 0 ? '#0e0d0c' : red; ctx.globalAlpha = i % 3 === 0 ? 0.8 : 0.7
    ctx.beginPath(); ctx.moveTo(bx - 3, by); ctx.quadraticCurveTo(bx + lean, by - hgt * 0.6, bx + lean * 1.5, by - hgt); ctx.quadraticCurveTo(bx + lean * 0.5, by - hgt * 0.4, bx + 3, by); ctx.fill()
  }
  ctx.globalAlpha = 1
  for (const e of EMB) { ctx.fillStyle = e.t < 0.3 ? (st === 'ink' ? '#b3141a' : '#ff8a3a') : red; ctx.fillRect(SX(e.x), SY(e.y) - Math.round(e.z), 1, 1) }
}
function frenzyTick(g, dt) {
  const p = g.p
  if (g.armorT > 0) {
    if ((AFT.t = (AFT.t || 0) - dt) <= 0) { AFT.t = 0.06; AFT.push({ x: p.x, y: p.y, s: gutsFrame(g) }); if (AFT.length > 3) AFT.shift() }
    for (let k = 0; k < 3; k++) EMB.push({ x: p.x + (Math.random() - 0.5) * 18, y: p.y + (Math.random() - 0.5) * 8, z: 6 + Math.random() * 30, vz: 20 + Math.random() * 30, t: 0 })
  } else AFT.length = 0
  for (const e of EMB) { e.t += dt; e.z += e.vz * dt } while (EMB.length && EMB[0].t > 0.9) EMB.shift(); if (EMB.length > 120) EMB.splice(0, EMB.length - 120)
}
/* ink at night: the light shrinks to a circle round guts and the rest is lined over, then solid ink */
function drawDark(g, st, amt) {
  const r0 = (g.pit ? 130 : g.nightN === 1 ? 84 : 100) * g.light * (0.6 + 0.4 / Math.max(0.4, amt)), x = SX(g.p.x), y = SY(g.p.y) - 14
  /* a taller pool of light on portrait screens, so a phone isn't mostly black */
  const sy = KY * 1.4 * clamp(H / W / 0.8, 1, 1.9)
  const ring = (r, fill, op) => { dctx.globalCompositeOperation = op || 'source-over'; dctx.fillStyle = fill; dctx.save(); dctx.translate(x, y); dctx.scale(1, sy); dctx.beginPath(); dctx.arc(0, 0, r, 0, TAU); dctx.restore(); dctx.fill() }
  dctx.globalCompositeOperation = 'source-over'; dctx.clearRect(0, 0, W, H)
  dctx.fillStyle = '#0e0d0c'; dctx.fillRect(0, 0, W, H); ring(r0 * 2, '#000', 'destination-out'); ring(r0 * 2, DENSE); ring(r0 * 1.55, '#000', 'destination-out'); ring(r0 * 1.55, SPARSE); ring(r0, '#000', 'destination-out')
  ctx.drawImage(DK, 0, 0)
}
/* boss telegraphs, rasterised once per change into a ground-aligned canvas (camera moves are just a blit).
   day: a blood-ochre wash with a dark rim; ink: black and white only. solid means it lands next, faint means after */
function drawTel(e, st) {
  const T = e.tel; if (!T || !T.sh) return
  if (!T.c || T.cv !== T.ver || T.cst !== st) {
    const b = T.sh.bb, x0 = Math.floor(b[0]) - 2, y0 = Math.floor(b[1] * KY) - 2, w = Math.min(900, Math.ceil(b[2] - b[0]) + 4), h = Math.min(600, Math.ceil((b[3] - b[1]) * KY) + 4), reg = new Uint8Array(w * h)
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) reg[j * w + i] = T.sh(x0 + i + 0.5, (y0 + j + 0.5) / KY)
    const c = T.c && T.c.width === w && T.c.height === h ? T.c : mkCanvas(w, h), cx = c.getContext('2d'), img = cx.createImageData(w, h), d = img.data, ink = st === 'ink'
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = j * w + i, r = reg[k]; if (!r) continue
      let edge = 0; for (const q of [k - 1, k + 1, k - w, k + w]) { const rr = q >= 0 && q < w * h ? reg[q] : 0; if (!rr) edge = 2; else if (rr === 2 && r === 1 && edge < 1) edge = 1 }
      const edge2 = !edge && [k - 2, k + 2, k - 2 * w, k + 2 * w].some(q => q < 0 || q >= w * h || !reg[q]); let col, a
      if (ink) { const x = i + x0, y = j + y0, on = r === 3 ? 0 : edge === 2 ? 1 : edge2 ? 0 : edge === 1 ? (x + y) & 1 : r === 1 ? ((x + y) % 3 === 0 || (x - y + 3000) % 3 === 0 ? 1 : 0) : (x + y) % 4 === 0 ? 1 : 0; col = on ? [14, 13, 12] : [239, 232, 218]; a = 255 }
      else { if (r === 3) { col = [248, 220, 174]; a = 0.85 } else if (edge === 2) { col = [58, 14, 20]; a = 0.9 } else if (edge2) { col = [248, 220, 174]; a = 0.5 } else if (edge === 1) { col = [58, 14, 20]; a = 0.5 } else if (r === 1) { col = [176, 42, 34]; a = 0.44 + (((i >> 1) + (j >> 1)) & 1 ? 0.05 : 0) } else { col = [176, 42, 34]; a = 0.2 } a *= 255 }
      d[k * 4] = col[0]; d[k * 4 + 1] = col[1]; d[k * 4 + 2] = col[2]; d[k * 4 + 3] = a
    }
    cx.putImageData(img, 0, 0); T.c = c; T.cv = T.ver; T.cst = st; T.x0 = x0; T.y0 = y0
  }
  /* in the dark the wash is laid on twice so it still reads against the night */
  const tx = Math.round(T.x0 - game.cam.x + W / 2 + ox), ty = Math.round(T.y0 - game.cam.y * KY + H / 2 + 14 + oy); ctx.drawImage(T.c, tx, ty); if (st === 'golden' && nightAmt(game.phase()) > 0.5) ctx.drawImage(T.c, tx, ty)
  for (const [x, y, s] of T.labels || []) ptext(s, SX(x), SY(y) - 2, st === 'ink' ? '#efe8da' : '#f8dcae', '#0e0d0c')
}
/* rosine's valley: banks of mist drifting through the trees */
function drawMist(g, n) {
  ctx.save(); ctx.globalAlpha = 0.16 * (1 - n * 0.5); ctx.fillStyle = '#e8e4dc'
  for (let k = 0; k < 7; k++) { const x = ((h1(k) * 900 + g.rt * (6 + k * 2) - g.cam.x) % 900 + 900) % 900 - 210, y = ((h1(k + 9) * 700 - g.cam.y * KY) % 700 + 700) % 700 - 210; ctx.beginPath(); ctx.ellipse(x, y, 140 + k * 12, 34 + k * 3, 0, 0, TAU); ctx.fill() }
  ctx.restore()
}
let curStyle = null, wipe = null
function render(dt) {
  const g = game; KY = CAM.ky; const ph = g.phase(), n = nightAmt(ph), st = g.style()
  ox = g.shake > 0 ? Math.round((Math.random() - 0.5) * g.shake) : 0; oy = g.shake > 0 ? Math.round((Math.random() - 0.5) * g.shake) : 0
  if (curStyle && st !== curStyle) wipe = { from: curStyle, t: 0 }; curStyle = st
  frenzyTick(g, dt)
  /* the eclipse's apostles are heavy to bake: queue their frames during the golden age so the flood doesn't hitch */
  if (g.t > 40 && !g.warmEcl) { g.warmEcl = 1; for (const t of ['horse', 'bloat', 'winged', 'snake', 'lzodd', 'lgrun', 'lcount', 'lrosine', 'archer', 'lancer']) for (let d = 0; d < 8; d++) for (let f = 0; f < 5; f++) WARM.push(() => sprite(t, d, f, 0)) }
  /* each look draws its own world: painted (dark under the light map at night) or ink (lined falloff at night) */
  const world = s => { drawWorld(g, s); if (s === 'ink') { if (n > 0.5) drawDark(g, s, n) } else if (n > 0) drawNight(g, n) }
  world(st)
  /* the page turns: the new style spreads out from guts in a widening circle */
  if (wipe) { wipe.t += dt; const r = ease(wipe.t / 0.9) * Math.hypot(W, H), x = SX(g.p.x), y = SY(g.p.y) - 20; ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(x, y, r, 0, TAU, true); ctx.clip('evenodd'); world(wipe.from); ctx.restore(); ctx.strokeStyle = '#0e0d0c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; if (wipe.t > 0.9) wipe = null }
  if (g.biome().mist && st === 'golden') drawMist(g, n)
  for (const e of g.en) if (e.tel) drawTel(e, st)
  /* the frenzy pulses red at the edges of the screen */
  if (g.armorT > 0) { const k = 0.28 + 0.14 * Math.sin(g.rt * 6), gr = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.55); gr.addColorStop(0, 'rgba(179,20,26,0)'); gr.addColorStop(1, `rgba(179,20,26,${k.toFixed(3)})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H) }
  if (g.flashT > 0) { ctx.globalAlpha = Math.min(1, g.flashT) * 0.6; ctx.fillStyle = st === 'ink' && g.flashC !== '#0e0d0c' ? (g.flashC === '#b3141a' || g.flashC === '#e81010' ? '#b3141a' : '#efe8da') : g.flashC; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1 }
  if (st === 'ink') { ctx.fillStyle = '#0e0d0c'; ctx.fillRect(0, 0, W, 2); ctx.fillRect(0, H - 2, W, 2); ctx.fillRect(0, 0, 2, H); ctx.fillRect(W - 2, 0, 2, H) }
  drawEclipse(g, ph, st)
  /* sense loss works on the world only (the hud is dom over the canvas and keeps its colours): grey, then dim and blurred */
  const sf = g.sense >= 2 ? 'grayscale(1) brightness(.72) blur(1px)' : g.sense === 1 && st === 'golden' ? 'grayscale(1)' : ''; if (cv.style.filter !== sf) cv.style.filter = sf
}
/* the eclipse, unmistakable: the world goes black and blood-red (ink re-inked through a crimson multiply), and a small
   pixel-art black sun hangs in the sky clear of the hud, its corona in dithered bands of the game's gold, orange and blood,
   chunky flares flickering through four baked frames, the five of the god hand standing in silhouette beneath it */
const ECOL = ['#ffe8b0', '#f8a048', '#d0281a', '#7e1616'], BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
let ESUN = null, GODSIL = null
function eclipseSun(r) {
  const fl = Math.round(r * 2.7), S = fl * 2 + 1, frames = []
  for (let fr = 0; fr < 4; fr++) {
    const c = mkCanvas(S, S), x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data
    const flare = Array.from({ length: 12 }, (_, i) => ({ a: (i / 12) * TAU + (h1(i * 7 + fr) - 0.5) * 0.25, l: r * (2 + 0.7 * h1(i * 13 + fr * 5)), w: 0.12 + 0.08 * h1(i + fr * 3) }))
    const put = (i, hex) => { const v = parseInt(hex.slice(1), 16); d[i] = v >> 16; d[i + 1] = (v >> 8) & 255; d[i + 2] = v & 255; d[i + 3] = 255 }
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const dx = px - fl, dy = py - fl, dist = Math.hypot(dx, dy), i = (py * S + px) * 4, th = (BAYER[(py & 3) * 4 + (px & 3)] + 0.5) / 16
      if (dist <= r) { put(i, dist > r - 1 ? '#2a0604' : '#050303'); continue }
      /* corona: three bands, each dithered into the next with a bayer threshold */
      const u = (dist - r) / (r * 0.95)
      if (u < 1) { const band = u * 3, k = Math.floor(band), f2 = band - k; put(i, ECOL[f2 > th ? k + 1 : k]); continue }
      /* flares: chunky 2px wedges beyond the corona */
      const cx2 = (px >> 1) * 2 - fl, cy2 = (py >> 1) * 2 - fl, cd = Math.hypot(cx2, cy2), ca = Math.atan2(cy2, cx2)
      for (const F of flare) { let da = Math.abs(((ca - F.a + 3 * Math.PI) % TAU) - Math.PI); if (cd < F.l && da < F.w * (1 - (cd - r) / (F.l - r))) { put(i, cd < r * 2.1 ? ECOL[1] : (cd / F.l > th ? ECOL[3] : ECOL[2])); break } }
    }
    x.putImageData(img, 0, 0); frames.push(c)
  }
  return { r, fl, frames }
}
function drawEclipse(g, ph, st) {
  const k = ph.night === 1 ? (ph.k === 'dusk' ? ph.u : ph.k === 'night' ? 1 : ph.k === 'dawn' ? 1 - ph.u : 0) : 0; if (k <= 0) return
  if (st === 'ink' && g.eclipseOn()) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#c42a1c'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over' }
  else { ctx.globalAlpha = 0.55 * k; ctx.fillStyle = '#2a0604'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1 }
  /* about a sixth of the screen tall, at whole internal pixels: left of the boss bar on a wide screen, under it on a tall one */
  const r = Math.max(6, Math.round(H * 0.034)); if (!ESUN || ESUN.r !== r) ESUN = eclipseSun(r)
  const tall = H > W, cx = Math.round(tall ? W * 0.2 : W * 0.27), cy = Math.round(tall ? H * 0.2 : H * 0.15)
  if (!GODSIL) { const sp = bake(o => drawGodhand(o), { t: 0.4 }, 2 * (Math.PI / 4), 0.42, [200, 280, 0.78]), c = mkCanvas(sp.w, sp.h), x = c.getContext('2d'); x.drawImage(sp.golden, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#050303'; x.fillRect(0, 0, sp.w, sp.h); GODSIL = { c, sp } }
  ctx.globalAlpha = k; ctx.drawImage(ESUN.frames[Math.floor(g.rt * 5) & 3], cx - ESUN.fl, cy - ESUN.fl)
  const { c, sp } = GODSIL, base = cy + Math.round(r * 2.9)
  for (const dx of [-2, -1, 0, 1, 2]) { const x = cx + dx * Math.round(sp.w * 0.8) - (sp.w >> 1), y = base - sp.h - (dx === 0 ? 3 : Math.abs(dx) === 2 ? -2 : 0); ctx.drawImage(c, x, y); ctx.fillStyle = '#ff3a1a'; const ey = y + Math.round(sp.h * 0.18), ex = x + (sp.w >> 1); ctx.fillRect(ex - 1, ey, 1, 1); ctx.fillRect(ex + 1, ey, 1, 1) }
  ctx.globalAlpha = 1
}

/* ---------- hud: the brand sigil (hud.css). state rides on classes: ink, night, sense, hot brand, frenzy, hit, level-up ---------- */
const hudSet = (el, k, v) => { if (el['_' + k] !== v) { el['_' + k] = v; if (k === 'text') el.textContent = v; else if (k === 'w') el.style.width = v; else if (k === 'hide') el.hidden = v; else if (k === 'cls') el.className = v; else if (k === 'off') el.setAttribute('stroke-dashoffset', v) } }
const pct = v => (clamp(v, 0, 1) * 100).toFixed(1) + '%'
/* the xp bar eases toward its target; on a level-up it runs to full, wraps to empty, flashes and throws sparks */
const XP = { shown: 0, lvl: 1, wrap: 0, t: 0, flash: 0 }
function xpBar(p, dt) {
  if (p.lvl < XP.lvl) { XP.lvl = p.lvl; XP.shown = 0; XP.wrap = 0 }
  if (p.lvl > XP.lvl) { XP.wrap += p.lvl - XP.lvl; XP.lvl = p.lvl; levelBurst() }
  const target = clamp(p.xp / p.next, 0, 1); if (XP.flash > 0) XP.flash -= dt
  if (XP.wrap) { XP.shown += (1.05 - XP.shown) * Math.min(1, dt * 14); if (XP.shown >= 1) { XP.shown = 0; XP.wrap-- } } else XP.shown += (target - XP.shown) * Math.min(1, dt * 8)
  hudSet($('xpb'), 'w', pct(XP.shown)); hudSet($('lvl'), 'text', 'LV ' + p.lvl); hudSet($('xpn'), 'text', fmtN(Math.floor(p.xp)) + ' / ' + fmtN(p.next) + ' xp'); hudSet($('sgx'), 'off', (75 - 75 * XP.shown).toFixed(1))
}
function levelBurst() {
  XP.flash = 0.7; const b = $('xpburst'); b.innerHTML = ''
  for (let i = 0; i < 14; i++) { const s = document.createElement('i'), a = Math.random() * Math.PI - Math.PI, r = 18 + Math.random() * 30; s.style.left = 4 + Math.random() * 92 + '%'; s.style.top = '3px'; s.style.setProperty('--dx', (Math.cos(a) * r).toFixed(0) + 'px'); s.style.setProperty('--dy', (Math.sin(a) * r).toFixed(0) + 'px'); b.appendChild(s) }
  setTimeout(() => { b.innerHTML = '' }, 800)
}
/* chip-away trails: the pale bar behind hp (and the boss) holds for a beat, then drains down to the real value */
const CHIP = { hp: 1, hpHold: 0, hpLast: 1, boss: 1, bossHold: 0, bossLast: 1, hit: 0 }
function chip(key, v, dt) {
  if (v < CHIP[key + 'Last'] - 0.001) { CHIP[key + 'Hold'] = 0.45; if (key === 'hp') CHIP.hit = 0.25 }
  CHIP[key + 'Last'] = v; if (v > CHIP[key]) CHIP[key] = v; else if ((CHIP[key + 'Hold'] -= dt) <= 0) CHIP[key] = Math.max(v, CHIP[key] - dt * 0.9)
  return CHIP[key]
}
let lastTags = '', hudT = 0
function hud() {
  const g = game, p = g.p, ph = g.phase(), now = performance.now(), dt = Math.min(0.1, (now - (hudT || now)) / 1000); hudT = now
  if (CHIP.hit > 0) CHIP.hit -= dt
  const hpv = p.hp / p.maxHp, hc = chip('hp', hpv, dt), ink = g.style() === 'ink'
  hudSet($('hud'), 'cls', [ink ? 'ink' : 'gold', nightAmt(ph) > 0.5 ? 'night' : '', g.eclipseOn() ? 'eclipse' : '', g.inkMode || g.brand > 70 ? 'hot' : '', g.armorT > 0 ? 'frenzy' : '', CHIP.hit > 0 ? 'hit' : '', XP.flash > 0 ? 'lvup' : ''].filter(Boolean).join(' '))
  hudSet($('hpb'), 'w', pct(hpv)); hudSet($('hpc'), 'w', pct(hc)); hudSet($('hpt'), 'text', fmtN(Math.ceil(p.hp)) + ' / ' + fmtN(p.maxHp))
  hudSet($('mb'), 'hide', !g.branded); hudSet($('mbf'), 'w', pct(g.brand / 100))
  hudSet($('mr'), 'hide', !g.rageOn); hudSet($('mrl'), 'text', g.armorT > 0 ? 'FRENZY' : 'RAGE'); hudSet($('mrf'), 'w', pct(g.armorT > 0 ? g.armorT / g.armorDur : g.rage / 100)); hudSet($('mro'), 'w', pct(g.armorT > 0 ? g.rage / 100 : 0))
  /* the same values as rings round the brand sigil */
  hudSet($('sgh'), 'off', (75 - 75 * clamp(hpv, 0, 1)).toFixed(1)); hudSet($('sgc'), 'off', (75 - 75 * clamp(hc, 0, 1)).toFixed(1)); hudSet($('sgb'), 'off', (75 - 75 * (g.branded ? g.brand / 100 : 0)).toFixed(1))
  hudSet($('sgr'), 'off', (75 - 75 * clamp(g.rageOn ? (g.armorT > 0 ? g.armorT / g.armorDur : g.rage / 100) : 0, 0, 1)).toFixed(1)); hudSet($('sigtext'), 'text', fmtN(Math.ceil(p.hp)) + ' · LV ' + p.lvl)
  xpBar(p, dt); hudSet($('clock'), 'text', fmtT(g.t))
  hudSet($('phase'), 'text', g.pit ? 'THE PIT · NIGHT ' + g.nightN : ph.k === 'day' ? 'DAY ' + g.dayN + ' · ' + g.biome().name : ph.k === 'night' ? (g.nightN === 1 ? 'THE ECLIPSE' : 'NIGHT ' + g.nightN) : ph.k.toUpperCase())
  hudSet($('kills'), 'text', fmtN(p.kills) + ' slain'); hudSet($('gold'), 'text', fmtN(p.gold) + ' gold')
  let m = ''
  const pk = (g.eclipsed ? 'S' : '') + (ink ? 'ink' : 'golden'); if (pk !== PORTK) { PORTK = pk; $('portrait').setAttribute('href', PORTRAIT[pk] || (PORTRAIT[pk] = portrait(g.eclipsed, ink ? 'ink' : 'golden'))) }
  if (g.inkMode) m += '<span class="tag red">' + BRANDICON + 'THE BRAND BURNS · BLEEDING</span>'
  if (g.sense) m += '<span class="tag sense">SENSE LOSS ' + 'I'.repeat(g.sense) + '</span>'
  /* a big band lists its named members and folds the raiders into one line */
  if (!g.eclipsed && g.t > 100) m += '<span class="tag red">ECLIPSE ' + fmtT(DAY1 + DUSK - g.t) + '</span>'
  if (m !== lastTags) { lastTags = m; $('tags').innerHTML = m }
  const b = g.boss; hudSet($('boss'), 'hide', !b); if (b) { const v = clamp(b.hp / b.maxHp, 0, 1); hudSet($('bossn'), 'text', b.d.boss); hudSet($('bossb'), 'w', pct(v)); hudSet($('bossc'), 'w', pct(chip('boss', v, dt))) } else CHIP.boss = CHIP.bossLast = 1
  altarHud(g, dt)
  const ban = g.ban; hudSet($('ban'), 'hide', !ban); if (ban) { hudSet($('ban'), 'cls', ban.t === 'THE ECLIPSE' ? 'eclipse' : ''); hudSet($('bant'), 'text', ban.t); hudSet($('bans'), 'text', ban.sub); $('ban').style.opacity = Math.min(1, ban.a * 4, (ban.d - ban.a) * 2) }
}
const PORTRAIT = {}; let PORTK = ''
/* the brand of sacrifice, drawn as carved strokes. one unit is its height; it is 0.625 wide. a stem with a small pointed
   crown; two arms start just off the stem near the top, swing out to elbows and back in to meet it at 0.4; from there a
   closed lower diamond flares out and comes to a point at the foot. arms are thickest at the elbows and taper to fine ends */
const BRAND = [
  [[0, -0.03, 0.008], [0, 0.07, 0.045], [0, 0.4, 0.058], [0, 0.98, 0.05]],
  [[-0.02, 0.08, 0.012], [-0.06, 0.04, 0.006]], [[0.02, 0.08, 0.012], [0.06, 0.04, 0.006]],
  [[-0.125, 0.045, 0.016], [-0.275, 0.195, 0.078], [-0.012, 0.4, 0.05]], [[0.125, 0.045, 0.016], [0.275, 0.195, 0.078], [0.012, 0.4, 0.05]],
  [[-0.01, 0.41, 0.06], [-0.29, 0.68, 0.075], [0, 0.985, 0.045]], [[0.01, 0.41, 0.06], [0.29, 0.68, 0.075], [0, 0.985, 0.045]],
]
/* one stroke becomes a polygon: offset each sampled point along the normal by half its width, with a seeded wobble */
function brandPath(cx, top, H, seed) {
  let d = '', k = seed || 1
  const jit = () => { k = (k * 16807) % 2147483647; return (k / 2147483647 - 0.5) * 0.009 }
  for (const S of BRAND) {
    const pts = []; for (let i = 0; i + 1 < S.length; i++) { const [x0, y0, w0] = S[i], [x1, y1, w1] = S[i + 1], n = 7; for (let j = i ? 1 : 0; j <= n; j++) { const t = j / n; pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w0 + (w1 - w0) * t]) } }
    const L = [], Rr = []
    pts.forEach((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, w = p[2] / 2
      L.push([p[0] + nx * (w + jit()), p[1] + ny * (w + jit())]); Rr.push([p[0] - nx * (w + jit()), p[1] - ny * (w + jit())]) })
    const poly = L.concat(Rr.reverse()).map(([x, y]) => (cx + x * H).toFixed(2) + ' ' + (top + y * H).toFixed(2))
    d += 'M' + poly.join('L') + 'Z'
  }
  return d
}
$('brandmark').setAttribute('d', brandPath(60, 88, 15, 7))
const BRAND2D = new Path2D(brandPath(0, -5, 10, 5))
const BRANDICON = `<svg class="bicon" viewBox="0 0 14 22" aria-hidden="true"><path d="${brandPath(7, 1, 20, 3)}"/></svg>`
/* the portrait: a proper bust of guts, swordless, half-turned toward you, rendered big and cropped to head and shoulders,
   in the style the world is in and with the eye he loses at the eclipse */
function portrait(scar, st) {
  const s = bake(o => drawGuts(o), { t: 0, noSword: 1, scar }, 1.95, 2.2, [120, 160, 0.92]), u = U * 2.2, hy = s.py - 84 * u * CAM.kz, sz = Math.round(30 * u)
  const c = mkCanvas(sz, sz); c.getContext('2d').drawImage(s[st], -(s.px - sz / 2), -(hy - sz * 0.42)); return c.toDataURL()
}

/* ---------- menus ---------- */
let state = 'title', paused = false, pver = -1
function showOv(id) { for (const o of document.querySelectorAll('.ov')) o.hidden = o.id !== id }
const cardBody = (id, i, rar, tag, name, desc, dis) => `<button class="card r-${rar}" data-i="${i}" ${dis ? 'disabled' : ''}><i class="ico"><img src="${iconURL(id)}" alt=""></i><span class="txt"><em>${rar}${tag ? ' · ' + tag : ''}</em><b>${name}</b><p>${desc}</p></span><span class="k">${i + 1}</span></button>`
function cardHTML(c, i) { return cardBody(c.id, i, c.rar, c.evo ? 'evolution' : c.relic ? 'relic' : c.isNew ? 'new' : 'level ' + c.lvl, c.name, c.desc) }
function syncMenus() {
  const g = game; if (state !== 'play') return
  if (paused) { showOv('ovPause'); return }
  if (g.pver === pver) return; pver = g.pver; const pd = g.pending
  if (!pd) { showOv(null); return }
  if (pd.type === 'level' || pd.type === 'chest') { $('pickT').textContent = pd.title; $('cards').innerHTML = pd.choices.map(cardHTML).join(''); showOv('ovPick') }
  else if (pd.type === 'shop') {
    $('shopT').textContent = pd.title; $('shopG').textContent = pd.gold + ' gold'; $('shopN').textContent = pd.note || 'Three items of one tag make a set: elf, brand or steel.'
    $('items').innerHTML = pd.items.map((it, i) => cardBody(it.key, i, it.rar, it.sold ? 'sold' : it.price + ' gold · ' + it.vendor, it.name, it.desc + (it.tags.length ? ' <small>' + it.tags.join(' · ') + '</small>' : ''), it.sold || g.p.gold < it.price)).join('')
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
  if (altarKey(e)) { e.preventDefault(); return }
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
    game.opts.autoAbil = AUTO.on
    if (!paused && !PANEL) { acc += dt * speed; let n = 0; while (acc >= 1 / 60 && n < 10 * speed) { game.step(1 / 60); acc -= 1 / 60; n++ } if (acc > 0.25) acc = 0 }
    if (AUTO.on && game.pending && !paused) { if (game.pending.type === 'shop') { game.choose(0); game.choose('go') } else if (game.pending.type !== 'dead') game.choose(Math.floor(Math.random() * game.pending.choices.length)) }
    render(paused || PANEL ? 0 : dt * speed); hud(); syncMenus(); drawPanel(); PERF.ms += performance.now() - t0; PERF.frames++
  }
  else if (game) {
    /* behind the title a demo guts wanders the field on his own */
    AUTO.t -= dt; if (AUTO.t <= 0) { AUTO.t = 1 + Math.random() * 1.5; AUTO.a += (Math.random() - 0.5) * 2.5 } game.input.x = Math.cos(AUTO.a) * 0.6; game.input.y = Math.sin(AUTO.a) * 0.6
    game.step(dt); if (game.pending) game.pending.type === 'shop' ? game.choose('go') : game.choose(0); render(dt)
  }
  if (WARM.length) warmUp(state === 'play' ? 3 : 8)
  requestAnimationFrame(frame)
}
resize(); game = new Game({ god: true, seed: 1, autoAbil: 1 }); game.view = { w: W, h: H }; game.ban = null; showOv('ovTitle'); $('hud').hidden = true; requestAnimationFrame(frame)
/* test hooks for the headless smoke run; harmless in play */
window.__BZ = { get g() { return game }, start, auto: on => (AUTO.on = on), speed: v => (speed = v), perf: () => { const r = { frames: PERF.frames, ms: PERF.ms }; PERF.frames = 0; PERF.ms = 0; return r }, warmLeft: () => WARM.length,
  /* step + render n frames back to back, reading a pixel each frame so the gpu work is counted too */
  bench: n => { const t0 = performance.now(); for (let i = 0; i < n; i++) { game.step(1 / 60); render(1 / 60); ctx.getImageData(0, 0, 1, 1) } return (performance.now() - t0) / n },
  horde: (n, types) => { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, r = 60 + Math.random() * 200; game.spawn(types[i % types.length], game.p.x + Math.cos(a) * r, game.p.y + Math.sin(a) * r * 0.9) } } }
