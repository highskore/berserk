/* figures in 3d, ~100 units = guts' height. local frame: x forward, y left, z up, feet at the origin */
const clothFold = (x, y) => 1 - 0.14 * Math.max(0, Math.sin(x * 0.9 + y * 0.25)) + (h2(x, y) - 0.5) * 0.08
const mail = (x, y) => ((x + y) & 1 ? 0.8 : 1.05)
const veins = (x, y) => 1 + (n2(x * 0.5, y * 0.5) - 0.5) * 0.35 + (h2(x, y) - 0.5) * 0.1
const V3 = (p, x, y, z) => [p[0] + x, p[1] + y, p[2] + z]

/* torso frame: lean tips forward about the hip, twist turns the upper body (sword swings) */
function torsoF(hz, lean, tw) {
  const cl = Math.cos(lean), sl = Math.sin(lean), ct = Math.cos(tw), st = Math.sin(tw)
  return (x, y, z) => { const X = x * ct - y * st, Y = x * st + y * ct; return [X * cl + z * sl, Y, hz + z * cl - X * sl] }
}
/* legs with a walk cycle. the bones are sized from the standing hip height so a planted leg is nearly
   straight (knees only bend on the bob and the stride), and the knee points forward and a touch out */
function legs(T, o, k) {
  const p = o.walk || 0, mv = o.mv || 0, st = k.stance || 6, Ls = (k.hipZ - 2 - 4) / 0.975, l1 = Ls * 0.51, l2 = Ls * 0.49
  for (const s of [1, -1]) {
    const ph = s > 0 ? p : p + Math.PI, foot = [(k.fx || 0) * s + Math.sin(ph) * 10 * mv, s * (k.wide || 6.5), Math.max(0, Math.cos(ph)) * 4.5 * mv]
    const hip = T(0, s * st, -2), ank = [foot[0] - 1, foot[1], foot[2] + 4], kn = ik3(hip, ank, l1, l2, [1, s * 0.18, 0.1])
    k.thigh(hip, kn, s); k.shin(kn, ank, s); k.boot(ank, foot, s)
  }
}
const disc = (C, r, m, a, p, z) => { for (let k = 0; k < 12; k++) { const a0 = (k / 12) * TAU, a1 = ((k + 1) / 12) * TAU; tri(C, V3(C, Math.cos(a0) * r, Math.sin(a0) * r, z || 0), V3(C, Math.cos(a1) * r, Math.sin(a1) * r, z || 0), m, a, p, { n: [0, 0, 1] }) } }

/* the dragonslayer: a slab of iron turned flat to the eye, notched. bl is its blood stage: 0 clean, 1-3 fresh specks,
   streaks, drenched, 4-5 dried specks and streaks. one field sets the coat so each stage only adds to the last */
const BLADE = { tip: null, run: null }
function dragonslayer(B, d, w, bl) {
  const L0 = 6, TL = 92, L = 104, HW = 7.4, P = (a, c) => v3.add(v3.add(B, d, a), w, c)
  cap(v3.add(B, d, -9), v3.add(B, d, 3), 1.6, 1.6, MAT.LEATHER, 0.8, 17, { tex: (x, y, tt) => (Math.floor(tt * 6) % 2 ? 0.65 : 1) })
  sph(v3.add(B, d, -10), 2.2, MAT.IRON, 0.9, 17); cap(P(4, -9), P(4, 9), 1.7, 1.7, MAT.IRON, 0.85, 17)
  bl = bl || 0; const q = bl > 3 ? bl - 3 : bl, wet = bl > 0 && bl < 4, thr = [2, 0.8, 0.6, 0.38][q], BM = wet ? MAT.BLOOD : MAT.DRIED
  const coat = (a, v) => 0.42 * n2(a / 2.4 + 5, v * 7) + 0.34 * n2(a / 9 + 3, v * 2.2) + 0.26 * Math.abs(v - 0.5) * 2 + 0.22 * (a / L) - (a < 22 ? 0.3 : 0)
  const tex = (x, y, u, v) => {
    const a = L0 + u * (TL - L0); if ((v < 0.09 || v > 0.91) && h1(Math.floor(a / 2.2) * 7 + (v > 0.5 ? 3 : 1)) > 0.8) return -1
    if (coat(a, v) > thr) return -2
    return (0.86 + (n2(a / 3, v * 4) - 0.5) * 0.3 + (h2(x, y) - 0.5) * 0.08) * (v > 0.84 ? 1.18 : v < 0.12 ? 0.8 : 1)
  }
  /* fresh blood catches the light in a few wet beads; dried blood is matte */
  const btex = (x, y, u, v) => (tex(x, y, u, v) !== -2 ? -1 : wet ? (h2(x, y) > 0.94 ? 1.7 : 0.85 + (h2(x, y) - 0.5) * 0.2) : 0.75 + (h2(x, y) - 0.5) * 0.25)
  quad(P(L0, -HW), P(TL, -HW), P(TL, HW), P(L0, HW), MAT.STEEL, 1, 17, { tex: (x, y, u, v) => { const k = tex(x, y, u, v); return k === -2 ? -1 : k } })
  if (q) quad(P(L0, -HW), P(TL, -HW), P(TL, HW), P(L0, HW), BM, 0.7, 17, { tex: btex })
  /* drenched: the point is red to the tip and beads hang off the low edge */
  if (q === 3) tri(P(TL, -HW), P(L, 0), P(TL, HW), MAT.BLOOD, 0.75, 17, { tex: (x, y) => (h2(x, y) > 0.94 ? 1.6 : 0.9) })
  else tri(P(TL, -HW), P(L, 0), P(TL, HW), MAT.STEEL, 0.9, 17, { tex: (x, y) => 0.9 + (h2(x, y) - 0.5) * 0.1 })
  if (q === 3) {
    const lo = w[2] < 0 ? 1 : -1
    for (const [a, r] of [[48, 1.1], [70, 1.3], [86, 1.2]]) sph(v3.add(P(a, lo * HW), [0, 0, -1.6]), r, MAT.BLOOD, 0.8, 17)
    sph(v3.add(P(L - 2, 0), [0, 0, -2]), 1.4, MAT.BLOOD, 0.85, 17)
  }
  BLADE.tip = P(L - 2, 0); BLADE.run = [0.5, 0.62, 0.74, 0.86, 0.96].map(k => P(L0 + k * (L - L0), 0))
}

/* guts' hair: short, thick, black, rough clumps of uneven size and angle; the mass has a broken rim */
function clump(H, dir, len, r0, r1, bend, seed, a) {
  const d = v3.norm(dir), side = v3.norm(v3.cross(d, [0, 0, 1])), j = (h1(seed) - 0.5) * bend, str = (x, y) => 0.85 + 0.3 * h2(x * 3 + seed, y)
  const A = v3.add(H, d, 5), M = v3.add(v3.add(A, d, len * 0.55), side, j), E = v3.add(v3.add(M, d, len * 0.45), side, j * 1.4)
  cap(A, M, r0, (r0 + r1) / 2, MAT.HAIR, a, 14, { tex: str }); cap(M, E, (r0 + r1) / 2, r1, MAT.HAIR, a * 0.95, 14, { tex: str })
}
function hair(H) {
  sph(v3.add(H, [-1, 0, 2]), 7, MAT.HAIR, 0.8, 14, { tex: (x, y, dx, dy) => { const q = n2(dx * 3.5 + 7, dy * 3.5 + 1); return dx * dx + dy * dy > 0.72 && q < 0.45 ? -1 : 0.7 + q * 0.55 } })
  for (let s = 0, n = 0; n < 30 && s < 180; s++) {
    const az = h1(11 + s * 3) * TAU, el = -0.35 + (Math.PI / 2 + 0.35) * Math.sqrt(h1(11 + s * 5 + 1)), d = [Math.cos(az) * Math.cos(el), Math.sin(az) * Math.cos(el), Math.sin(el)]
    if (d[0] > 0.45 && d[2] < 0.55) continue
    const r = h1(11 + s * 7 + 2); n++; clump(H, d, 1.2 + r * r * 4, 1.5 + r * 1.3, 0.35, 2.6, s + 11, 0.74 + r * 0.14)
  }
  for (const y of [-2.6, -0.6, 1.8]) clump(H, [1, y * 0.18, 0.35], 1.4 + h1(y * 9 + 4) * 2, 1.5, 0.4, 1.6, y * 7, 0.72)
}

/* ---------- GUTS ---------- */
/* o: {t, walk, mv, swing: blade angle around him (local) or null, armor: berserker armor on, bl: blade blood stage, scar} */
function drawGuts(o) {
  const t = o.t || 0, mv = o.mv || 0, p = o.walk || 0, sw = o.swing, A = o.armor
  const hz = 47 + (mv ? -1.6 * Math.abs(Math.cos(p)) : 0), lean = 0.08 + mv * 0.12 + (sw != null ? 0.14 : 0) + (A ? 0.1 : 0)
  const tw = sw != null ? Math.max(-0.7, Math.min(0.7, Math.atan2(Math.sin(sw), Math.cos(sw)) * 0.45)) : 0, T = torsoF(hz, lean, tw)
  const PL = A ? MAT.IRON : MAT.ARMOR
  legs(T, { walk: p, mv }, { hipZ: 47, fx: sw != null ? 6 : 3, wide: sw != null ? 10 : 7.5, stance: 6.5,
    thigh: (a, b, s) => cap(a, b, 6.4, 5, A ? MAT.IRON : MAT.CLOTH, 0.55, s > 0 ? 7 : 5, { tex: clothFold }),
    shin: (a, b, s) => { const c = v3.lerp(a, b, 0.3); cap(a, c, 4.6, 4.9, PL, 0.64, s > 0 ? 8 : 6, { tex: grime(0.1) }); cap(c, b, 4.9, 3.6, PL, 0.64, s > 0 ? 8 : 6, { tex: grime(0.1) }); sph(a, 4.6, PL, 0.74, s > 0 ? 8 : 6) },
    boot: (a, f, s) => { const bm = A ? MAT.IRON : MAT.LEATHER; sph([a[0] - 1.2, a[1], f[2] + 2.8], 3.6, bm, 0.66, s > 0 ? 8 : 6); cap([a[0], a[1], f[2] + 2.8], [f[0] + 8.5, f[1], f[2] + 1.8], 3.8, 2.8, bm, 0.7, s > 0 ? 8 : 6) } })
  sph(T(0, 0, 0), 9, MAT.CLOTH, 0.6, 10)
  sph(T(1, 0, -2), 9.6, PL, 0.55, 12, { tex: (x, y) => (y % 3 === 0 ? 0.7 : 1), sq: 0.8 })
  cap(T(0, 0, 3), T(1, 0, 14), 9, 10, A ? MAT.IRON : MAT.LEATHER, 0.6, 11)
  sph(T(-3, 0, 21), 10.5, PL, 0.55, 11, { tex: grime(0.1, 0.15) })
  for (const s of [1, -1]) sph(T(3, s * 5.5, 23), 8.6, PL, 0.66, 11, { tex: grime(0.12, 0.2) })
  cap(T(-2, -11, 4), T(4, 0, 2), 1.8, 1.8, MAT.LEATHER, 0.7, 12); cap(T(4, 0, 2), T(-2, 11, 4), 1.8, 1.8, MAT.LEATHER, 0.7, 12)
  /* the cloak drags behind when he moves */
  const blow = mv * 0.8 + (sw != null ? 0.4 : 0), N = 6, top = [], mid = [], bot = []
  for (let k = 0; k <= N; k++) {
    const s = k / N, y = lerp(-13, 13, s), w = Math.sin(t * 4.6 + s * 5) * (1.2 + blow * 2)
    top.push(T(-7 - Math.abs(y) * 0.1, y, 29)); mid.push(v3.add(T(-11, y * 1.12, 12), [-blow * 8 + w * 0.4, 0, blow * 4]))
    bot.push([T(-12, 0, 0)[0] - 4 - blow * 22 + w, y * 1.3 + w * 0.6, 14 + blow * 12 - (k % 2) * 3 - h1(k * 7) * 4])
  }
  const ctex = (x, y) => 0.85 + Math.sin(x * 0.7 + y * 0.2 + t * 4.6) * 0.12 + (h2(x, y) - 0.5) * 0.1
  for (let k = 0; k < N; k++) { quad(top[k], top[k + 1], mid[k + 1], mid[k], MAT.CLOAK, 0.62, 1, { tex: ctex }); quad(mid[k], mid[k + 1], bot[k + 1], bot[k], MAT.CLOAK, 0.6, 1, { tex: ctex }) }
  const SR = T(1, -13, 28), SL = T(1, 13, 28), Hc = T(3.5, 0, 42)
  sph(v3.add(SR, [-1, -1, 1]), 7, PL, 0.72, 15, { tex: grime(0.15, 0.2), sq: 0.8 }); sph(v3.add(SR, [2, -2.5, -5]), 4.4, PL, 0.62, 15)
  sph(v3.add(SL, [-1, 1, 1]), 6, MAT.IRON, 0.7, 15, { tex: grime(0.15, 0.2), sq: 0.85 })
  if (A) for (const s of [1, -1]) for (let k = 0; k < 3; k++) cap(v3.add(s > 0 ? SL : SR, [-2 + k * 2, s * 3, 4]), v3.add(s > 0 ? SL : SR, [-4 + k * 2, s * 7, 10 - k]), 1.4, 0.3, MAT.IRON, 0.8, 15)
  cap(T(-4, -11, 31), T(-7, 0, 32), 2.8, 3.4, MAT.CLOAK, 0.62, 16); cap(T(-7, 0, 32), T(-4, 11, 31), 3.4, 2.8, MAT.CLOAK, 0.62, 16)
  cap(T(1.5, 0, 30), v3.add(Hc, [0, 0, -4]), 5.8, 5.2, A ? MAT.IRON : MAT.SKIN, 0.85, 13)
  if (A) beastHelm(Hc, t); else gutsHead(Hc, t, o.scar)
  let HR, HL, d, w
  if (sw != null) { d = v3.norm([Math.cos(sw), Math.sin(sw), -0.08]); w = v3.norm(v3.cross(d, v3.add([0, 0, 1], eyeLocal(), 0.4))); HR = v3.add([1, 0, hz + 16], d, 17); HL = v3.add(HR, d, -5.5) }
  else { HR = T(11, -9, 17 + Math.sin(p) * mv); d = v3.norm(v3.sub(v3.add(SR, [-2, 0, 9]), HR)); w = v3.norm(v3.cross(d, eyeLocal())); HL = T(3 - Math.sin(p) * 7 * mv, 16, -2) }
  const eR = ik3(SR, HR, 16, 16.5, [-0.3, -1, -0.5]), eL = ik3(SL, HL, 16, 16, [-0.4, 1, -0.4])
  cap(SL, eL, 5.6, 4.6, A ? MAT.IRON : MAT.CLOTH, 0.45, 2); cap(eL, HL, 4.4, 3.8, MAT.IRON, 0.7, 3, { tex: (x, y, tt) => (Math.floor(tt * 5) % 2 ? 0.72 : 1) }); sph(eL, 3.2, MAT.IRON, 0.8, 3); sph(HL, 3.6, MAT.IRON, 0.75, 4)
  if (!o.noSword) dragonslayer(HR, d, w, o.bl)
  cap(SR, eR, 6, 5, A ? MAT.IRON : MAT.CLOTH, 0.55, 18, { tex: clothFold }); cap(eR, HR, 5, 3.8, PL, 0.68, 19, { tex: grime(0.12) }); sph(eR, 3.8, PL, 0.75, 19); sph(HR, 3.8, A ? MAT.IRON : MAT.LEATHER, 0.6, 19)
}
/* guts' face, "iron jaw": a square jaw on a thick neck, one heavy brow ridge over narrowed slit eyes, the scar across
   the nose. from the eclipse on (scar) his right eye, y < 0, is a closed scarred line */
function gutsHead(H, t, scar) {
  const S = MAT.SKIN, at = (x, y, z) => v3.add(H, [x, y, z])
  sph(at(0, 0, 0.6), 6.1, S, 0.85, 13)
  for (const s of [1, -1]) cap(at(0.5, s * 3.8, -2.4), at(4.4, s * 2.9, -5.4), 2.1, 1.8, S, 0.82, 13)
  cap(at(4.2, -2.4, -5.6), at(4.2, 2.4, -5.6), 2, 2, S, 0.9, 13); sph(at(5.2, 0, -6), 1.9, S, 0.92, 13)
  for (const s of [1, -1]) cap(at(5.6, s * 0.6, 2.1), at(5.2, s * 3.6, 2.3), 1.1, 0.9, S, 0.95, 13)
  cap(at(6.2, 0, 1.4), at(7.2, 0, -1.6), 0.9, 1.3, S, 0.95, 13)
  for (const s of [1, -1]) {
    const E = at(5.9, s * 2.3, 0.6)
    if (scar && s < 0) { cap(v3.add(E, [0.3, 0, 2.4]), v3.add(E, [0.4, 0.3, -2.6]), 0.4, 0.4, MAT.GORE, 0.5, 13, { fl: 1 }); cap(v3.add(E, [0.4, -0.9, 0]), v3.add(E, [0.4, 0.9, 0]), 0.35, 0.35, MAT.DARK, 0.2, 13, { fl: 1 }) }
    else cap(v3.add(E, [0.4, -0.9, 0]), v3.add(E, [0.4, 0.9, 0.15 * s]), 0.45, 0.4, MAT.DARK, 0.1, 13, { fl: 1 })
    sph(at(0, s * 6.3, 0), 1.6, S, 0.8, 13)
  }
  cap(at(7, -2.6, 1.6), at(7.2, 2.4, 0.4), 0.38, 0.38, MAT.GORE, 0.55, 13, { fl: 1 })
  cap(at(6.6, -1.8, -3.6), at(6.9, 0, -3.3), 0.4, 0.4, MAT.DARK, 0.2, 13, { fl: 1 }); cap(at(6.9, 0, -3.3), at(6.6, 1.8, -3.6), 0.4, 0.4, MAT.DARK, 0.2, 13, { fl: 1 })
  sph(at(0.5, -3.6, -6.5), 1, MAT.BRAND, 0.6 + 0.4 * Math.sin(t * 7), 13)
  hair(H)
}
/* the berserker armor's wolf helm: a snout, slit eyes that burn */
function beastHelm(H, t) {
  sph(H, 7.4, MAT.IRON, 0.75, 14, { tex: grime(0.15, 0.2) }); cap(v3.add(H, [3, 0, -1]), v3.add(H, [10, 0, -3]), 5, 2.6, MAT.IRON, 0.8, 14)
  for (const s of [1, -1]) { sph(v3.add(H, [6.4, s * 2.6, 1]), 0.9, MAT.EYE, 1, 14); cap(v3.add(H, [-2, s * 4, 5]), v3.add(H, [-7, s * 6, 10]), 1.6, 0.4, MAT.IRON, 0.85, 14) }
  for (let k = 0; k < 4; k++) cap(v3.add(H, [7 + k * 0.8, (k - 1.5) * 1.1, -4.5]), v3.add(H, [7.5 + k * 0.8, (k - 1.5) * 1.1, -6.5]), 0.6, 0.2, MAT.BONE, 1, 14)
}

/* ---------- FOLK: soldiers, knights, the hawks, boscogn, the skull knight ---------- */
/* o: {walk, mv, atk, torso, legs, head, hairM, skin, weap, shield, cloak, bw} */
function drawFolk(o) {
  const t = o.t || 0, mv = o.mv == null ? 1 : o.mv, p = o.walk || 0, atk = o.atk || 0, bw = o.bw || 1
  const hz = 44 - (mv ? 1.4 * Math.abs(Math.cos(p)) : 0), T = torsoF(hz, 0.1 + atk * 0.1, 0), tm = MAT[o.torso || 'MAIL'], tt = tm === MAT.MAIL ? mail : grime(0.12, 0.15), lm = MAT[o.legs || 'CLOTH']
  legs(T, { walk: p, mv }, { hipZ: 44, fx: 3, wide: 6.2 * bw, stance: 5.2 * bw,
    thigh: (a, b, s) => cap(a, b, 5 * bw, 3.8 * bw, lm, 0.7, s > 0 ? 5 : 2, { tex: clothFold }),
    shin: (a, b, s) => cap(a, b, 3.6 * bw, 2.8 * bw, lm === MAT.ARMOR ? MAT.ARMOR : MAT.LEATHER, 0.65, s > 0 ? 6 : 3),
    boot: (a, f, s) => cap(a, [f[0] + 7, f[1], f[2] + 1.2], 3, 2.3, MAT.LEATHER, 0.6, s > 0 ? 6 : 3) })
  if (o.cloak) { const b = -6 - mv * 6; quad(T(-6, -10 * bw, 27), T(-6, 10 * bw, 27), [b - 6, 14 * bw, 10], [b - 6, -14 * bw, 10], MAT[o.cloak], 0.6, 1) }
  sph(T(0, 0, 0), 8 * bw, tm, 0.85, 7, { tex: tt }); cap(T(0, 0, 4), T(1, 0, 22), 8.4 * bw, 9.6 * bw, tm, 0.85, 7, { tex: tt })
  if (o.tabard) cap(T(1, 0, 2), T(1, 0, 20), 9 * bw, 9.8 * bw, MAT.TABARD, 0.85, 8, { tex: (x, y, q, s) => (Math.abs(s) > 0.92 ? -1 : 1 + (h2(x, y) - 0.5) * 0.14) })
  cap(T(0, -9 * bw, 4), T(0, 9 * bw, 4), 1.6, 1.6, MAT.LEATHER, 0.6, 8)
  const SR = T(1, -10.5 * bw, 25), SL = T(1, 10.5 * bw, 25), Hc = T(3, 0, 37), sm = tm === MAT.MAIL ? MAT.MAIL : tm
  sph(SR, 4.8 * bw, sm, 0.9, 13, { tex: tt }); sph(SL, 4.8 * bw, sm, 0.9, 13, { tex: tt })
  const skin = MAT[o.skin || 'SKIN'], hd = o.head || 'kettle'
  cap(T(1, 0, 27), Hc, 3.6, 3.6, hd === 'kettle' ? MAT.MAIL : skin, 0.8, 9)
  if (hd === 'helm' || hd === 'horned') {
    sph(Hc, 6, MAT.IRON, 0.8, 11, { tex: grime(0.12, 0.2) }); cap(v3.add(Hc, [5, -3, 0.5]), v3.add(Hc, [5, 3, 0.5]), 0.7, 0.7, MAT.DARK, 0.1, 11, { fl: 1 })
    if (hd === 'horned') for (const s of [1, -1]) cap(v3.add(Hc, [0, s * 5, 3]), v3.add(Hc, [-2, s * 10, 10]), 2, 0.5, MAT.BONE, 0.85, 11)
  } else if (hd === 'skull') {
    sph(Hc, 6, MAT.BONE, 0.85, 11); for (const s of [1, -1]) { sph(v3.add(Hc, [5, s * 2.2, 0.5]), 1.5, MAT.DARK, 0.1, 11); cap(v3.add(Hc, [-1, s * 4, 4]), v3.add(Hc, [-4, s * 7, 9]), 1.6, 0.4, MAT.BONE, 0.9, 11) }
    cap(v3.add(Hc, [4, 0, -4]), v3.add(Hc, [6, 0, -5]), 2.6, 2, MAT.BONE, 0.8, 11)
  } else {
    sph(Hc, hd === 'kettle' ? 5.6 : 5.4, hd === 'kettle' ? MAT.MAIL : skin, 0.82, 9, { tex: hd === 'kettle' ? mail : undefined })
    sph(v3.add(Hc, [3, 0, -0.6]), 3.8, skin, 0.85, 10); sph(v3.add(Hc, [6.2, 0, -0.4]), 1.2, skin, 0.9, 10)
    for (const s of [1, -1]) sph(v3.add(Hc, [6, s * 1.8, 0.6]), 0.5, MAT.DARK, 0.1, 10, { fl: 1 })
    if (hd === 'kettle') { sph(v3.add(Hc, [0, 0, 2.6]), 5.8, MAT.STEEL, 0.9, 11, { sq: 0.75 }); disc(v3.add(Hc, [0, 0, 2]), 9, MAT.STEEL, 0.78, 11, -1.2) }
    else if (hd === 'witch') { const C = v3.add(Hc, [-0.5, 0, 3]); disc(C, 11, MAT.CLOAK, 0.6, 11, -1); for (let k = 0; k < 10; k++) { const a0 = (k / 10) * TAU, a1 = ((k + 1) / 10) * TAU; tri(v3.add(C, [-5, 2, 17]), v3.add(C, [Math.cos(a0) * 5.5, Math.sin(a0) * 5.5, 0]), v3.add(C, [Math.cos(a1) * 5.5, Math.sin(a1) * 5.5, 0]), MAT.CLOAK, 0.65, 11) } }
    else if (o.hairM) { sph(v3.add(Hc, [-1.2, 0, 1.6]), 5.8, MAT[o.hairM], 0.75, 11, { tex: (x, y, dx, dy) => (dx * dx + dy * dy > 0.75 && n2(dx * 3, dy * 3) < 0.4 ? -1 : 0.8 + h2(x, y) * 0.3) }); if (o.long) cap(v3.add(Hc, [-3, 0, 0]), v3.add(Hc, [-6, 0, -9]), 4, 2.4, MAT[o.hairM], 0.72, 11) }
  }
  /* weapon in the right hand, shield or second hand on the left */
  let HR = T(10, -8, 12 + atk * 22), HL = T(2, 13 * bw, -4); const wp = o.weap || 'sword'
  if (wp === 'spear' || wp === 'axe' || wp === 'hammer') {
    HR = T(12 + atk * 8, -6, 14); HL = T(4 + atk * 6, 4, 16); const d = v3.norm([1, 0.05, (wp === 'spear' ? 0.12 : 0.9) - atk * (wp === 'spear' ? 0.1 : 1.4)])
    const L = wp === 'spear' ? 62 : 46; cap(v3.add(HL, d, -20), v3.add(HR, d, L), 1.1 * bw, 1.1 * bw, MAT.WOOD, 0.8, 12)
    const tip = v3.add(HR, d, L), w = v3.norm(v3.cross(d, [0, 0, 1]))
    if (wp === 'spear') tri(v3.add(tip, w, -2.4), v3.add(tip, d, 11), v3.add(tip, w, 2.4), MAT.STEEL, 1, 12)
    else if (wp === 'axe') { tri(v3.add(tip, d, -12), v3.add(v3.add(tip, w, 13), d, -4), v3.add(tip, d, 3), MAT.STEEL, 1, 12); tri(v3.add(tip, d, -12), v3.add(v3.add(tip, w, -13), d, -4), v3.add(tip, d, 3), MAT.STEEL, 0.9, 12) }
    else cap(v3.add(tip, w, -6), v3.add(tip, w, 7), 4, 2, MAT.IRON, 0.8, 12)
  } else if (wp === 'staff') {
    HR = T(10, -8, 10 + atk * 8); cap(v3.add(HR, [0, 0, -30]), v3.add(HR, [2, 0, 28]), 1, 1, MAT.WOOD, 0.8, 12); sph(v3.add(HR, [2, 0, 31]), 2.6, MAT.EYE, 1, 12)
  } else if (wp === 'crossbow') {
    HR = T(10, -5, 18); HL = T(12, 3, 18); const d = [1, 0, 0.05]; cap(v3.add(HR, d, -6), v3.add(HR, d, 16), 1.5, 1.2, MAT.WOOD, 0.8, 12)
    cap(v3.add(v3.add(HR, d, 14), [0, -1, 0], 9), v3.add(v3.add(HR, d, 14), [0, 1, 0], 9), 0.9, 0.9, MAT.STEEL, 0.9, 12)
  } else {
    const d = v3.norm([0.6, -0.1, 0.8 - atk * 1.6]), L = wp === 'knife' ? 8 : 32
    cap(v3.add(HR, d, -3), v3.add(HR, d, 1), 1, 1, MAT.LEATHER, 0.6, 12); cap(v3.add(HR, d, 1.5), v3.add(HR, d, L), 1.5, 0.6, MAT.STEEL, 1, 12)
    if (wp === 'knife') { HL = T(8, 9, 16); cap(HL, v3.add(HL, [5, 2, 3]), 1.2, 0.5, MAT.STEEL, 1, 12) }
  }
  if (o.shield) { HL = T(9, 10 * bw, 14); const C = v3.add(HL, [2, 1, 0]); for (let k = 0; k < 10; k++) { const a0 = (k / 10) * TAU, a1 = ((k + 1) / 10) * TAU; tri(C, v3.add(C, [0, Math.cos(a0) * 9, Math.sin(a0) * 9]), v3.add(C, [0, Math.cos(a1) * 9, Math.sin(a1) * 9]), MAT[o.shield], 0.75, 15, { n: [1, 0, 0.3] }) } sph(C, 2, MAT.IRON, 0.9, 15) }
  const eR = ik3(SR, HR, 13, 12.5, [-0.3, -1, -0.6]), eL = ik3(SL, HL, 13, 12.5, [-0.3, 1, -0.6]), am = tm === MAT.MAIL ? MAT.MAIL : tm === MAT.ARMOR || tm === MAT.IRON ? tm : skin
  cap(SL, eL, 3.8 * bw, 3.2 * bw, am, 0.75, 13, { tex: tt }); cap(eL, HL, 3.2 * bw, 2.6 * bw, am, 0.75, 13, { tex: tt }); sph(HL, 2.6 * bw, MAT.LEATHER, 0.6, 14)
  cap(SR, eR, 3.8 * bw, 3.2 * bw, am, 0.9, 13, { tex: tt }); cap(eR, HR, 3.2 * bw, 2.6 * bw, am, 0.9, 13, { tex: tt }); sph(HR, 2.7 * bw, MAT.LEATHER, 0.7, 14)
}
const FOLK = {
  soldier: o => drawFolk(Object.assign({ tabard: 1, weap: o.v ? 'spear' : 'sword' }, o)),
  knight: o => drawFolk(Object.assign({ torso: 'ARMOR', legs: 'ARMOR', head: 'helm', shield: 'WOOD', tabard: 1 }, o)),
  boscogn: o => drawFolk(Object.assign({ torso: 'ARMOR', legs: 'ARMOR', head: 'horned', weap: 'axe', cloak: 'TABARD', bw: 1.25 }, o)),
  casca: o => drawFolk(Object.assign({ torso: 'LEATHER', head: 'bare', skin: 'LEATHER', hairM: 'HAIR', weap: 'sword', cloak: 'CLOTH' }, o)),
  judeau: o => drawFolk(Object.assign({ torso: 'LEATHER', head: 'bare', hairM: 'WOOD', long: 1, weap: 'knife', cloak: 'CLOTH' }, o)),
  pippin: o => drawFolk(Object.assign({ torso: 'ARMOR', head: 'bare', weap: 'hammer', bw: 1.35 }, o)),
  corkus: o => drawFolk(Object.assign({ torso: 'MAIL', head: 'bare', hairM: 'WOOD', weap: 'crossbow', cloak: 'CLOTH' }, o)),
  serpico: o => drawFolk(Object.assign({ torso: 'LEATHER', head: 'bare', hairM: 'BONE', weap: 'sword', cloak: 'CLOTH', bw: 0.92 }, o)),
  isidro: o => drawFolk(Object.assign({ torso: 'CLOTH', head: 'bare', hairM: 'HAIR', weap: 'knife', bw: 0.85 }, o)),
  schierke: o => drawFolk(Object.assign({ torso: 'CLOAK', legs: 'CLOAK', head: 'witch', weap: 'staff', cloak: 'CLOAK', bw: 0.8 }, o)),
  sellsword: o => drawFolk(Object.assign({ torso: 'MAIL', head: 'kettle', weap: 'axe', tabard: 1, bw: 1.15 }, o)),
  skullknight: o => drawFolk(Object.assign({ torso: 'IRON', legs: 'ARMOR', head: 'skull', shield: 'IRON', cloak: 'CLOAK', weap: 'sword', bw: 1.15 }, o)),
  archer: o => drawFolk(Object.assign({ head: 'kettle', weap: 'crossbow', tabard: 1 }, o)),
  lancer: o => drawFolk(Object.assign({ torso: 'ARMOR', legs: 'ARMOR', head: 'helm', weap: 'spear', tabard: 1, bw: 1.05 }, o)),
  /* the rest of the band of the hawk */
  rickert: o => drawFolk(Object.assign({ torso: 'CLOTH', head: 'bare', hairM: 'WOOD', weap: 'knife', cloak: 'CLOTH', bw: 0.78 }, o)),
  gaston: o => drawFolk(Object.assign({ torso: 'ARMOR', head: 'bare', hairM: 'HAIR', weap: 'sword', shield: 'IRON', cloak: 'CLOTH', bw: 1.1 }, o)),
  griffith: o => drawFolk(Object.assign({ torso: 'STEEL', legs: 'STEEL', head: 'bare', hairM: 'BONE', long: 1, weap: 'sword', cloak: 'BONE', bw: 0.92 }, o)),
  raider: o => drawFolk(Object.assign({ head: 'kettle', weap: 'sword', cloak: 'CLOTH' }, o)),
}

/* ---------- LESSER APOSTLES: the eclipse's horde. a horse-skulled stalker, a bloated maw-sack, a winged
   harpy and a serpent-tailed thing, all flesh and bone like the bosses but man-sized ---------- */
function drawLesser(o) {
  const k = o.k, t = o.t || 0, p = o.walk || 0, mv = o.mv == null ? 1 : o.mv, atk = o.atk || 0, fm = MAT.FLESH
  const fl = (x, y) => 0.8 + (n2(x * 0.22, y * 0.22) - 0.5) * 0.45
  const limb = (a, b, r0, r1, pr) => cap(a, b, r0, r1, fm, 0.8, pr, { tex: veins })
  const claw = (Hh, pr) => { for (let i = -1; i <= 1; i++) cap(Hh, v3.add(Hh, [7, i * 2.5, -5]), 1.2, 0.3, MAT.BONE, 0.95, pr) }
  if (k === 'horse') {
    /* a gaunt biped with a horse's skull, mane of spines, long clawed arms */
    for (const s of [1, -1]) { const ph = s > 0 ? p : p + Math.PI, f = [Math.sin(ph) * 12 * mv, s * 7, Math.max(0, Math.cos(ph)) * 6 * mv], hp = [0, s * 6, 50], kn = ik3(hp, [f[0] - 4, f[1], 8], 28, 26, [1, s * 0.2, 0]); limb(hp, kn, 5, 3.4, s > 0 ? 6 : 2); limb(kn, [f[0] - 4, f[1], 8], 3.4, 2.4, s > 0 ? 6 : 2); cap([f[0] - 4, f[1], 8], f, 2.4, 1.6, MAT.BONE, 0.8, s > 0 ? 6 : 2) }
    sph([0, 0, 52], 9, fm, 0.75, 8, { tex: fl }); cap([1, 0, 54], [6, 0, 80], 8, 11, fm, 0.8, 8, { tex: (x, y) => fl(x, y) * (y % 3 === 0 ? 0.78 : 1) })
    for (let i = 0; i < 6; i++) cap([-2 - i * 0.4, 0, 62 + i * 4], [-9 - i, 0, 64 + i * 5], 1.6, 0.3, MAT.BONE, 0.9, 9)
    const N = [10, 0, 86]; cap([6, 0, 80], N, 4, 3.6, fm, 0.8, 10, { tex: veins })
    const H = [14 + atk * 4, 0, 94]; sph(H, 5.5, MAT.BONE, 0.85, 11); cap(H, v3.add(H, [16, 0, -9 - atk * 3]), 4.6, 2.4, MAT.BONE, 0.88, 11)
    cap(v3.add(H, [6, 0, -6]), v3.add(H, [15, 0, -13 - atk * 6]), 2.6, 1.6, MAT.BONE, 0.7, 11); for (const s of [1, -1]) sph(v3.add(H, [3, s * 3.6, 1]), 1.3, MAT.EYE, 1, 12)
    for (const s of [1, -1]) cap(v3.add(H, [-2, s * 3, 4]), v3.add(H, [-6, s * 5, 12]), 1.4, 0.4, MAT.BONE, 0.9, 12)
    for (const s of [1, -1]) { const S = [6, s * 11, 78], Hh = s > 0 ? v3.lerp([14, 14, 40], [36, 6, 60], atk) : [20, -14, 44 + Math.sin(t * 3) * 3], E = ik3(S, Hh, 22, 22, [-0.4, s, -0.4]); limb(S, E, 3.6, 2.6, s > 0 ? 3 : 13); limb(E, Hh, 2.6, 1.8, s > 0 ? 3 : 13); claw(Hh, s > 0 ? 3 : 13) }
  } else if (k === 'bloat') {
    /* a sack of flesh on stubby legs, a ring of mouths round the belly and a little head stuck on top */
    const br = Math.sin(t * 2) * 1.5
    for (const s of [1, -1]) { const ph = s > 0 ? p : p + Math.PI, f = [Math.sin(ph) * 6 * mv, s * 12, Math.max(0, Math.cos(ph)) * 3 * mv]; limb([0, s * 11, 16], f, 6, 4, s > 0 ? 3 : 1) }
    sph([0, 0, 34 + br], 26, fm, 0.7, 5, { tex: (x, y) => fl(x, y) + (h2(x >> 2, y >> 2) < 0.08 ? -0.25 : 0) })
    for (let i = 0; i < 5; i++) { const a = -0.9 + i * 0.45, c = [Math.cos(a) * 24, Math.sin(a) * 24, 30 + (i % 2) * 8]; sph(c, 4.6, MAT.GORE, 0.4, 6); for (let j = -1; j <= 1; j++) sph(v3.add(c, [1.5, j * 2.2, 3]), 0.8, MAT.BONE, 1, 7); for (let j = -1; j <= 1; j++) sph(v3.add(c, [1.5, j * 2.2, -3]), 0.8, MAT.BONE, 1, 7) }
    const H = [6, 0, 62 + br]; sph(H, 6, MAT.SKIN, 0.75, 8); for (const s of [1, -1]) sph(v3.add(H, [5, s * 2, 1]), 0.9, MAT.EYE, 1, 9)
    for (const s of [1, -1]) { const S = [8, s * 22, 46], Hh = [22 + atk * 8, s * 22, 30 + atk * 10]; limb(S, Hh, 4, 2.6, s > 0 ? 3 : 11); claw(Hh, s > 0 ? 3 : 11) }
  } else if (k === 'winged') {
    /* a lean harpy hanging in the air on bat wings, talons forward */
    const z = 22 + Math.sin(t * 8) * 3
    for (const s of [1, -1]) { const hp = [0, s * 4, 40 + z], kn = [6, s * 5, 28 + z]; limb(hp, kn, 3.4, 2.4, 2); limb(kn, [2, s * 5, 16 + z], 2.4, 1.6, 2); claw([2, s * 5, 16 + z], 2) }
    sph([0, 0, 42 + z], 7, fm, 0.75, 6, { tex: fl }); cap([1, 0, 44 + z], [4, 0, 64 + z], 6.4, 8, fm, 0.82, 6, { tex: fl })
    const H = [8 + atk * 3, 0, 74 + z]; sph(H, 5.4, fm, 0.85, 9, { tex: veins }); cap(v3.add(H, [3, 0, -2]), v3.add(H, [11, 0, -6 - atk * 4]), 3, 0.8, MAT.BONE, 0.9, 9)
    for (const s of [1, -1]) { sph(v3.add(H, [4, s * 2.2, 1.2]), 1, MAT.EYE, 1, 10); cap(v3.add(H, [-1, s * 3, 3]), v3.add(H, [-7, s * 5, 9]), 1.6, 0.4, MAT.BONE, 0.9, 10) }
    const fl2 = 0.6 + 0.4 * Math.sin(t * 16); for (const s of [1, -1]) bzBatWing([-2, s * 7, 64 + z], s, 52, 0.55 + fl2 * 0.4, 0.25 + fl2 * 0.5, 0.25, s > 0 ? 1 : 14, MAT.DARK, MAT.BONE)
    for (const s of [1, -1]) { const S = [5, s * 9, 62 + z], Hh = [18 + atk * 10, s * 10, 50 + z]; limb(S, Hh, 2.6, 1.8, 12); claw(Hh, 12) }
  } else {
    /* a man's torso on a coiled serpent's tail that sways as it slithers */
    const n = 14, P = []; for (let i = 0; i <= n; i++) { const u = i / n; P.push([-u * 46, Math.sin(p * 1.2 + u * 6) * 10 * (0.3 + u), 6 + (1 - u) * 26 * (u < 0.25 ? 1 : 0.4) + Math.max(0, 0.25 - u) * 40]) }
    for (let i = 0; i < n; i++) cap(P[i], P[i + 1], 9 - i * 0.5, 9 - (i + 1) * 0.5, fm, 0.7, 2, { tex: (x, y) => ((x + ((y >> 2) & 1) * 2) % 4 === 0 ? 0.72 : 1) * fl(x, y) })
    const T = [2, 0, 40]; sph(T, 9, fm, 0.75, 6, { tex: fl }); cap(T, [4, 0, 62], 8.6, 10.4, fm, 0.82, 6, { tex: (x, y) => fl(x, y) * (y % 3 === 0 ? 0.76 : 1) })
    const H = [8 + atk * 3, 0, 74]; sph(H, 6.4, fm, 0.85, 9, { tex: veins }); cap(v3.add(H, [4, 0, -3]), v3.add(H, [10, 0, -6 - atk * 6]), 4, 2.6, MAT.DARK, 0.1, 9)
    for (const s of [1, -1]) { sph(v3.add(H, [5, s * 2.4, 1.4]), 1, MAT.EYE, 1, 10); cap(v3.add(H, [-2, s * 3, 4]), v3.add(H, [-3, s * 9, 3]), 1.8, 0.4, MAT.BONE, 0.9, 10) }
    for (const s of [1, -1]) { const S = [4, s * 12, 60], Hh = s > 0 ? v3.lerp([14, 14, 38], [34, 6, 52], atk) : [18, -15, 40], E = ik3(S, Hh, 16, 16, [-0.4, s, -0.5]); limb(S, E, 3.4, 2.6, s > 0 ? 3 : 13); limb(E, Hh, 2.6, 1.8, s > 0 ? 3 : 13); claw(Hh, s > 0 ? 3 : 13) }
  }
}

/* ---------- BEASTS: the possessed, crawlers, trolls and imps ---------- */
function drawBeast(o) {
  const k = o.k || 'demon', t = o.t || 0, p = o.walk || 0, mv = o.mv == null ? 1 : o.mv, reach = o.atk || 0, lurch = Math.sin(p) * 2
  const R = k === 'troll' ? 1.7 : 1, low = k === 'crawler', fly = k === 'imp' ? 26 + Math.sin(t * 9) * 2 : 0
  const fm = MAT.FLESH, hip = [-2, 0, (low ? 24 : 40) + fly + Math.abs(Math.cos(p)) * 1.5], sh = [low ? 20 : 12 + lurch * 0.3, 0, low ? 28 + fly : 62 + fly], head = v3.add(sh, [low ? 11 : 10, 0, low ? 2 : 2])
  if (!fly) for (const s of [1, -1]) {
    const ph = s > 0 ? p : p + Math.PI, foot = [4 + Math.sin(ph) * 10 * mv, s * 7 * R, Math.max(0, Math.cos(ph)) * 5 * mv], ank = [foot[0] - 3, foot[1], 6]
    const hp = v3.add(hip, [0, s * 5 * R, 0]), kn = ik3(hp, ank, low ? 14 : 22, low ? 13 : 20, [1, s * 0.3, 0.2])
    cap(hp, kn, 4 * R, 2.6 * R, fm, 0.8, s > 0 ? 6 : 2, { tex: veins }); cap(kn, ank, 2.6 * R, 1.7 * R, fm, 0.8, s > 0 ? 6 : 2, { tex: veins }); sph(kn, 2.8 * R, fm, 0.9, s > 0 ? 6 : 2)
    cap(ank, [foot[0] + 6, foot[1], 0.6], 1.8 * R, 0.8, fm, 0.8, s > 0 ? 6 : 2); cap(ank, [foot[0] + 5, foot[1] + s * 2, 0.4], 1.1, 0.5, MAT.BONE, 0.8, s > 0 ? 6 : 2)
  } else { cap(hip, v3.add(hip, [-8, 3, -14]), 2.4, 0.8, fm, 0.8, 2); cap(hip, v3.add(hip, [-6, -3, -15]), 2.4, 0.8, fm, 0.8, 2) }
  if (k === 'imp') for (const s of [1, -1]) {
    const W = 1, b = v3.add(sh, [-4, s * 4, 2]), fl = Math.sin(t * 18) * 0.4
    tri(b, v3.add(b, [-14 * W, s * 22 * W, 18 * W + fl * 10]), v3.add(b, [-22 * W, s * 10 * W, -2 + fl * 6]), MAT.DARK, 0.4, 1, { tex: (x, y, u, v) => (u + v > 0.92 && h2(x, y) < 0.5 ? -1 : 1) })
  }
  sph(v3.add(hip, [1, 0, -1]), 7 * R, fm, 0.75, 8, { tex: veins }); cap(v3.add(hip, [2, 0, 4]), v3.add(sh, [-3, 0, 2]), 6 * R, 9 * R, fm, 0.85, 8, { tex: veins })
  sph(v3.add(sh, [-3, 0, 1]), 9 * R, fm, 0.82, 8, { tex: (x, y) => veins(x, y) * (y % 3 === 0 ? 0.75 : 1) })
  for (let i = 0; i < 7; i++) { const q = v3.lerp(v3.add(hip, [-3, 0, 5 * R]), v3.add(sh, [-8 * R, 0, 6 * R]), i / 6); cap(q, v3.add(q, [-2.4 * R, 0, 3 * R]), 1.4 * R, 0.4, MAT.BONE, 0.9, 9) }
  cap(v3.add(sh, [1, 0, 2]), head, 3.2 * R, 2.6 * R, fm, 0.85, 10, { tex: veins }); sph(head, 5 * R, fm, 0.9, 10, { tex: veins })
  const jaw = 0.5 + 0.5 * Math.sin(t * 6) + reach * 0.6
  cap(v3.add(head, [3 * R, 0, -3 * R]), v3.add(head, [8 * R, 0, (-4 - jaw * 2) * R]), 3 * R, 2 * R, MAT.DARK, 0.15, 10)
  cap(v3.add(head, [2 * R, 0, -5 * R]), v3.add(head, [8 * R, 0, (-6 - jaw * 3) * R]), 2.8 * R, 1.8 * R, fm, 0.8, 10, { tex: veins })
  for (let i = 0; i < 4; i++) sph(v3.add(head, [(4 + i * 1.3) * R, (i - 1.5) * R, (-3.2 - jaw * 1.2) * R]), 0.6 * R, MAT.BONE, 1, 10)
  for (const s of [1, -1]) {
    sph(v3.add(head, [4.2 * R, s * 2 * R, 0.8 * R]), 0.9 * R, MAT.EYE, 1, 10)
    cap(v3.add(head, [-1, s * 2, 3]), v3.add(head, [-6, s * 4, 9]), 1.5, 0.4, MAT.BONE, 0.9, 10)
  }
  for (const s of [1, -1]) {
    const S = v3.add(sh, [2, s * 8 * R, -1]), Hh = low ? [32 + Math.sin(p + s) * 6, s * 9, 2] : s > 0 ? v3.lerp([8, 10 * R, 32 * R / 1.3 + fly], [34, 6, 50 + fly], reach) : v3.lerp([24, -9 * R, 34 + fly], [34, -6, 44 + fly], reach)
    const e = ik3(S, Hh, (low ? 15 : 17) * Math.sqrt(R), (low ? 15 : 17) * Math.sqrt(R), [-0.4, s, low ? 0.6 : -0.6])
    cap(S, e, 3.2 * R, 2.2 * R, fm, 0.85, s > 0 ? 3 : 12, { tex: veins }); cap(e, Hh, 2.2 * R, 1.6 * R, fm, 0.85, s > 0 ? 3 : 12, { tex: veins }); sph(e, 2.2 * R, fm, 0.9, s > 0 ? 3 : 12)
    for (let i = -1; i <= 1; i++) cap(Hh, v3.add(Hh, [6, i * 2.5, -5 + Math.sin(t * 11 + i)]), 1.1, 0.35, MAT.BONE, 0.95, s > 0 ? 3 : 12)
  }
}

/* ---------- SPIRITS: the dead that come for the brand, and the howling host ---------- */
function drawSpirit(o) {
  const t = o.t || 0, n = o.host ? 3 : 1, wob = Math.sin(t * 5 + (o.walk || 0)) * 2
  for (let i = 0; i < 5; i++) { const s = i / 4; sph([-s * 22, Math.sin(t * 4 + s * 4) * 3 * s, 34 - s * 20 + wob * (1 - s)], 8 - s * 5, MAT.GHOST, 0.85 - s * 0.2, 2 + i, { tex: (x, y) => 0.85 + h2(x, y) * 0.25 }) }
  for (let j = 0; j < n; j++) {
    const H = [4, (j - (n - 1) / 2) * 10, 40 + wob + (j === 1 ? 6 : 0)]
    sph(H, 6, MAT.GHOST, 0.95, 8 + j); for (const s of [1, -1]) sph(v3.add(H, [4.6, s * 2.2, 0.6]), 1.6, MAT.DARK, 0.1, 8 + j)
    cap(v3.add(H, [4, 0, -3.5]), v3.add(H, [5.6, 0, -6.5 - Math.abs(Math.sin(t * 7)) * 2]), 1.8, 1.3, MAT.DARK, 0.1, 8 + j)
  }
  for (const s of [1, -1]) cap([0, s * 6, 32 + wob], [16, s * 9, 28 + wob + Math.sin(t * 6 + s) * 4], 1.6, 0.6, MAT.GHOST, 0.8, 12)
}

/* ---------- APOSTLES: the count, the pit apostle ---------- */
function drawApostle(o) {
  const t = o.t || 0, p = o.walk || 0, br = Math.sin(t * 1.7), roar = o.atk || 0, fm = MAT.FLESH
  const fl = (x, y) => { const m = n2(x * 0.2, y * 0.2); return 0.82 + (m - 0.5) * 0.5 + (h2(x >> 1, y >> 1) < 0.05 ? -0.3 : 0) }
  for (const s of [1, -1]) { const ph = s > 0 ? p : p + Math.PI, f = [Math.sin(ph) * 8, s * 14, Math.max(0, Math.cos(ph)) * 4]; cap([0, s * 12, 30], f, 9, 5, fm, 0.6, s > 0 ? 3 : 1, { tex: fl }); cap(f, v3.add(f, [8, 0, 0]), 4, 2, MAT.BONE, 0.7, s > 0 ? 3 : 1) }
  sph([-4, 0, 40 + br], 24, fm, 0.68, 4, { tex: fl }); sph([6, 0, 62 + br], 18, fm, 0.7, 4, { tex: fl })
  sph([14, 0, 40], 9, MAT.GORE, 0.4, 5, { tex: (x, y) => 0.6 + n2(x * 0.4, y * 0.4) * 0.6 })
  sph([18, 0, 42], 4.5, MAT.SKIN, 0.65, 6); for (const s of [1, -1]) sph([22, s * 1.6, 43], 0.8, MAT.DARK, 0.1, 6)
  for (let k = 0; k < 6; k++) cap([-10 + k * 4, (h1(k) - 0.5) * 16, 70 + br - k], [-14 + k * 4, (h1(k) - 0.5) * 20, 82 - k * 1.5], 2.4, 0.5, MAT.BONE, 0.65, 7)
  const H = [20 + roar * 3, 0, 76 + br]
  sph(H, 9, fm, 0.72, 8, { tex: fl }); cap(v3.add(H, [5, 0, -4]), v3.add(H, [13, 0, -8 - roar * 6]), 6, 4, MAT.DARK, 0.1, 8)
  for (let k = 0; k < 5; k++) { sph(v3.add(H, [7 + k * 1.4, (k - 2) * 1.8, -3]), 0.8, MAT.BONE, 1, 8); sph(v3.add(H, [7 + k * 1.4, (k - 2) * 1.8, -8 - roar * 5]), 0.8, MAT.BONE, 1, 8) }
  for (const [ex, ey] of [[6, -3], [6, 3], [4, 0], [3, -5], [3, 5]]) sph(v3.add(H, [ex, ey, 3]), 1, MAT.EYE, 1, 9)
  if (o.horns) for (const s of [1, -1]) { let q = v3.add(H, [-3, s * 6, 5]); for (let k = 0; k < 6; k++) { const n = v3.add(q, [-2 - k * 0.5, s * 3, 3 - k]); cap(q, n, 3 - k * 0.4, 2.6 - k * 0.4, MAT.BONE, 0.7, 9); q = n } }
  for (const s of [1, -1]) { const S = [8, s * 18, 66], E = [22, s * 24, 46 + Math.sin(t * 2 + s)], Hh = [34 + roar * 8, s * 18, 20 + roar * 20]; cap(S, E, 8, 6, fm, 0.7, s > 0 ? 2 : 10, { tex: fl }); cap(E, Hh, 6, 4, fm, 0.7, s > 0 ? 2 : 10, { tex: fl })
    for (let k = -1; k <= 1; k++) cap(Hh, v3.add(Hh, [10, k * 4, -6]), 1.8, 0.4, MAT.BONE, 0.8, s > 0 ? 2 : 10) }
}

/* ---------- A HAND OF GOD: a hovering cloaked shape with a raven helm and black wings ---------- */
function drawGodhand(o) {
  const t = o.t || 0, z = 18 + Math.sin(t * 1.5) * 3, N = 10
  for (const s of [1, -1]) for (let k = 0; k < 3; k++) { const b = [-4, s * 8, 70 + z], fl = Math.sin(t * 2 + k) * 4; tri(b, [-20 - k * 6, s * (46 - k * 8), 96 + z - k * 14 + fl], [-14 - k * 4, s * (18 + k * 6), 30 + z + k * 6], MAT.DARK, 0.35 + k * 0.05, 1) }
  for (let k = 0; k < N; k++) { const a0 = (k / N) * TAU, a1 = ((k + 1) / N) * TAU, R0 = 9, R1 = 26 + Math.sin(t * 3 + k) * 2
    quad([Math.cos(a0) * R0, Math.sin(a0) * R0, 72 + z], [Math.cos(a1) * R0, Math.sin(a1) * R0, 72 + z], [Math.cos(a1) * R1, Math.sin(a1) * R1, z + (k % 2) * 4], [Math.cos(a0) * R1, Math.sin(a0) * R1, z + (k % 2) * 4], MAT.CLOAK, 0.6, 3, { tex: (x, y) => 0.85 + Math.sin(x * 0.8) * 0.12 }) }
  const H = [3, 0, 84 + z]; sph(H, 7.5, MAT.BONE, 0.85, 6); cap(v3.add(H, [4, 0, 0]), v3.add(H, [13, 0, -7]), 3.4, 0.6, MAT.BONE, 0.9, 6)
  for (const s of [1, -1]) { cap(v3.add(H, [-2, s * 5, 4]), v3.add(H, [-9, s * 9, 13]), 2, 0.5, MAT.BONE, 0.85, 6); sph(v3.add(H, [6, s * 2.4, 1]), 0.9, MAT.DARK, 0.1, 6) }
  for (const s of [1, -1]) cap([4, s * 10, 72 + z], [16, s * 14, 56 + z], 2.4, 1.6, MAT.CLOAK, 0.6, 7)
}

/* ---------- PUCK ---------- */
function drawPuck(o) {
  const t = o.t || 0, f = Math.sin(t * 30) * 0.5
  for (const s of [1, -1]) tri([-1, s * 2, 12], [-6, s * 13, 20 + f * 6], [-8, s * 6, 6 + f * 4], MAT.SMEAR, 0.9, 1)
  cap([0, 0, 4], [0, 0, 11], 2.4, 2.8, MAT.CLOTH, 0.7, 2); sph([1, 0, 15], 4.6, MAT.SKIN, 0.9, 3); for (const s of [1, -1]) { sph([4.6, s * 1.6, 15.5], 0.7, MAT.DARK, 0.1, 3); cap([-1, s * 4, 15], [-3, s * 7, 18], 1, 0.3, MAT.SKIN, 0.9, 3) }
}

/* ---------- PROPS: battlefield debris, fortress stones, eclipse flesh ---------- */
function drawProp(k, s) {
  const r = i => h1(s * 31 + i)
  if (k === 'tree') { const br = (a, b, w, d) => { cap(a, b, w, w * 0.65, MAT.WOOD, 0.6, 1); if (d > 3) return; for (let i = 0; i < 2; i++) { const L = v3.len(v3.sub(b, a)) * 0.7, ang = r(d * 5 + i) * TAU; br(b, v3.add(b, [Math.cos(ang) * L * 0.6, Math.sin(ang) * L * 0.6, L * 0.75]), w * 0.6, d + 1) } }; br([0, 0, 0], [2, 1, 46], 4.5, 0) }
  else if (k === 'stake') { cap([0, 0, 0], [1, 0, 46], 2.6, 2, MAT.WOOD, 0.75, 1); sph([1.5, 0, 50], 4.5, MAT.BONE, 0.85, 2); for (const q of [-1, 1]) sph([5, q * 1.6, 50.5], 1, MAT.DARK, 0.1, 2) }
  else if (k === 'rock') { sph([0, 0, 4], 9 + r(1) * 5, MAT.STONE, 0.75, 1, { sq: 0.7 }); sph([3, 3, 9], 5 + r(2) * 3, MAT.STONE, 0.8, 2) }
  else if (k === 'spear') { cap([0, 0, 0], [6, 2, 64], 1.1, 1.1, MAT.WOOD, 0.8, 1); tri([5, 2, 60], [7.5, 2.6, 74], [7, 1, 60], MAT.STEEL, 1, 1) }
  else if (k === 'cross') { cap([0, 0, 0], [0, 0, 60], 2.6, 2.4, MAT.WOOD, 0.7, 1); cap([0, -14, 46], [0, 14, 46], 2.2, 2.2, MAT.WOOD, 0.7, 1) }
  else if (k === 'wheel') { cap([0, 0, 0], [0, 0, 70], 2.2, 1.8, MAT.WOOD, 0.7, 1); for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, b = ((i + 1) / 12) * TAU; cap([Math.cos(a) * 14, Math.sin(a) * 14, 72], [Math.cos(b) * 14, Math.sin(b) * 14, 72], 1.4, 1.4, MAT.WOOD, 0.7, 2) } sph([2, 0, 76], 6, MAT.FLESH, 0.6, 3); cap([2, 0, 76], [10, 6, 70], 2, 1.4, MAT.FLESH, 0.6, 3) }
  else if (k === 'banner') { cap([0, 0, 0], [0, 0, 70], 1.2, 1.2, MAT.WOOD, 0.8, 1); quad([0, 0, 68], [0, -18, 64 + r(1) * 4], [0, -16, 44], [0, 0, 46], MAT.TABARD, 0.8, 2) }
  else if (k === 'pillar') { cap([0, 0, 0], [0, 0, 40 + r(1) * 30], 8, 7, MAT.STONE, 0.75, 1, { tex: (x, y) => (y % 6 === 0 ? 0.7 : 1) }) }
  else if (k === 'torch') { cap([0, 0, 0], [0, 0, 52], 1.6, 1.4, MAT.WOOD, 0.75, 1); cap([0, 0, 50], [0, 0, 56], 2.6, 2, MAT.CLOTH, 0.6, 2) }
  else if (k === 'campfire') { for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + r(1); cap([Math.cos(a) * 10, Math.sin(a) * 10, 2], [-Math.cos(a) * 3, -Math.sin(a) * 3, 7], 2, 1.6, MAT.WOOD, 0.6, 1) } for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; sph([Math.cos(a) * 13, Math.sin(a) * 13, 2], 3, MAT.STONE, 0.7, 2, { sq: 0.7 }) } }
  else if (k === 'wagon') { quad([-20, -10, 14], [20, -10, 14], [20, 10, 14], [-20, 10, 14], MAT.WOOD, 0.6, 1, { n: [0, 0, 1], tex: (x, y) => (x % 5 === 0 ? 0.6 : 0.9 + h2(x, y) * 0.2) }); for (const s of [-1, 1]) { quad([-20, s * 10, 14], [20, s * 10, 14], [20, s * 10, 24], [-20, s * 10, 24], MAT.WOOD, 0.55, 2, { tex: (x, y) => (h2(x >> 1, y) < 0.15 ? -1 : 0.85) }); for (const xw of [-12, 12]) { const C = [xw, s * 12, 9]; for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, b = ((i + 1) / 10) * TAU; cap(v3.add(C, [Math.cos(a) * 9, 0, Math.sin(a) * 9]), v3.add(C, [Math.cos(b) * 9, 0, Math.sin(b) * 9]), 1.2, 1.2, MAT.WOOD, 0.6, 3) } } } sph([4, 0, 16], 7, MAT.DARK, 0.2, 4, { sq: 0.6 }) }
  else if (k === 'brazier') { cap([0, 0, 0], [0, 0, 22], 2, 2, MAT.IRON, 0.7, 1); sph([0, 0, 24], 7, MAT.IRON, 0.7, 2, { sq: 0.5 }); for (let i = 0; i < 4; i++) sph([(r(i) - 0.5) * 6, (r(i + 4) - 0.5) * 6, 28 + i * 2], 2.6 - i * 0.4, MAT.EYE, 1, 3) }
  else if (k === 'flesh') { for (let i = 0; i < 4; i++) sph([(r(i) - 0.5) * 20, (r(i + 9) - 0.5) * 20, 4 + r(i + 3) * 6], 6 + r(i + 5) * 6, MAT.FLESH, 0.7, 1 + i, { tex: veins }); sph([0, 0, 12], 3, MAT.EYE, 1, 6) }
  else if (k === 'sword') { const d = v3.norm([r(1) - 0.5, r(2) - 0.5, 3]); cap([0, 0, 0], v3.add([0, 0, 0], d, 40), 2.2, 1.4, MAT.STEEL, 0.9, 1); cap(v3.add([0, 0, 0], d, 34), v3.add(v3.add([0, 0, 0], d, 34), [0, 6, 0]), 1.2, 1.2, MAT.IRON, 0.8, 2) }
}

/* ---------- THE KUSHAN INVASION, and the apostles of the run's middle: picked takes A. signature shapes (turbans,
   masks, the moth's wings, the emperor's crown) are oversized on purpose so they read at play size ---------- */
const kHead = o => { const mv = o.mv == null ? 1 : o.mv, p = o.walk || 0, hz = 44 - (mv ? 1.4 * Math.abs(Math.cos(p)) : 0), T = torsoF(hz, 0.1 + (o.atk || 0) * 0.1, 0); return { T, H: T(3, 0, 37) } }
const kWrap = (x, y) => ((y >> 1) % 3 === 0 ? 0.72 : 1) * (0.92 + h2(x, y) * 0.12)
const kScales = (x, y) => (((x >> 1) + ((y >> 1) & 1)) % 2 ? 0.74 : 1.04)
/* a tall kushan turban: three stacked wraps tapering to a peak, a jewel at the front and a plume */
function kTurban(H, m, k) {
  const M = MAT[m || 'BONE'], s = k || 1
  sph(v3.add(H, [-0.6, 0, 3.4 * s]), 8.8 * s, M, 0.9, 12, { sq: 0.7, tex: kWrap }); sph(v3.add(H, [-1, 0, 8.6 * s]), 8 * s, M, 0.92, 12, { sq: 0.75, tex: kWrap }); sph(v3.add(H, [-1.4, 0, 13 * s]), 5.6 * s, M, 0.95, 12, { tex: kWrap })
  cap(v3.add(H, [-1.6, 0, 15 * s]), v3.add(H, [-2.6, 0, 20 * s]), 1.8, 0.3, M, 0.95, 12); sph(v3.add(H, [6.2 * s, 0, 5 * s]), 1.6, MAT.BRAND, 0.9, 13); cap(v3.add(H, [5.6 * s, 0, 6.4 * s]), v3.add(H, [4 * s, 0, 16 * s]), 0.9, 0.3, MAT.EYE, 0.9, 13)
}
const kVeil = (H, m) => { cap(v3.add(H, [5.2, -3.4, -1.6]), v3.add(H, [5.2, 3.4, -1.6]), 2.6, 2.6, MAT[m || 'DARK'], 0.3, 13); tri(v3.add(H, [6, -3, -3]), v3.add(H, [6, 3, -3]), v3.add(H, [5, 0, -9]), MAT[m || 'DARK'], 0.3, 13, { n: [1, 0, 0] }) }
function kTalwar(Hd, d, L, pr) { const w = v3.norm(v3.cross(d, [0, 0, 1])); let q = v3.add(Hd, d, 2); for (let i = 0; i < 6; i++) { const n = v3.add(v3.add(q, d, L / 6), w, i * 0.35); cap(q, n, 1.7 - i * 0.18, 1.5 - i * 0.18, MAT.STEEL, 1, pr); q = n } cap(v3.add(Hd, w, -3), v3.add(Hd, w, 3), 0.8, 0.8, MAT.EYE, 0.8, pr) }
function kShield(C, r, pr) { for (let k = 0; k < 12; k++) { const a0 = (k / 12) * TAU, a1 = ((k + 1) / 12) * TAU; tri(C, v3.add(C, [0, Math.cos(a0) * r, Math.sin(a0) * r]), v3.add(C, [0, Math.cos(a1) * r, Math.sin(a1) * r]), k % 2 ? MAT.TABARD : MAT.LEATHER, 0.8, pr, { n: [1, 0, 0.3] }) } sph(C, r * 0.25, MAT.EYE, 0.9, pr + 1) }
function kBow(T) { const C = T(13, -5, 20), R = 20; let prev = null; for (let i = 0; i <= 8; i++) { const a = -1 + i * 0.25, q = v3.add(C, [Math.cos(a * 1.6) * 4 - 4 + (Math.abs(a) > 0.8 ? 3 : 0), 0, a * R]); if (prev) cap(prev, q, 1.9, 1.9, MAT.WOOD, 0.85, 14); prev = q } cap(v3.add(C, [-4, 0, -R]), v3.add(C, [-4, 0, R]), 0.35, 0.35, MAT.BONE, 0.9, 14); cap(T(-5, 8, 30), T(-7, 9, 6), 2.6, 2.4, MAT.LEATHER, 0.7, 2); for (let k = 0; k < 4; k++) cap(T(-5, 8 + k * 0.8, 30), T(-4, 7 + k, 38), 0.4, 0.4, MAT.BONE, 0.9, 2) }
function kKatar(Hd, pr) { cap(v3.add(Hd, [0, -2, 0]), v3.add(Hd, [0, 2, 0]), 0.7, 0.7, MAT.IRON, 0.8, pr); tri(v3.add(Hd, [1, -2, 0]), v3.add(Hd, [1, 2, 0]), v3.add(Hd, [14, 0, -2]), MAT.STEEL, 1, pr, { n: [0, 0, 1] }) }
function kMask(H, m) { sph(v3.add(H, [3.4, 0, 0.4]), 5.2, MAT[m || 'BONE'], 0.95, 13, { sq: 1.15 }); for (const s of [1, -1]) cap(v3.add(H, [8, s * 1.2, 1.4]), v3.add(H, [7.6, s * 3.2, 1.4]), 0.6, 0.5, MAT.DARK, 0.1, 13, { fl: 1 }) }
function kHood(H) { sph(v3.add(H, [-1, 0, 1.4]), 7.6, MAT.CLOAK, 0.6, 12, { tex: kWrap }); cap(v3.add(H, [-2, 0, 4]), v3.add(H, [-8, 0, -8]), 5, 3, MAT.CLOAK, 0.55, 12) }
const kBody = (o, x) => drawFolk(Object.assign({ torso: 'MAIL', legs: 'CLOTH', head: 'bare', skin: 'LEATHER', weap: 'knife' }, x, o))
const KUSH = {
  /* line infantry: tall cream turban, red face cloth, scale coat, curved talwar and a round painted shield */
  ksoldier: o => { kBody(o, { cloak: 'TABARD' }); const { T, H } = kHead(o); kTurban(H, 'BONE'); kVeil(H, 'TABARD'); cap(T(1, 0, 4), T(1, 0, 20), 9.4, 10.2, MAT.MAIL, 0.85, 8, { tex: kScales }); kTalwar(T(10, -8, 12 + (o.atk || 0) * 22), v3.norm([0.6, -0.1, 0.8 - (o.atk || 0) * 1.6]), 30, 15); kShield(T(10, 11, 14), 10, 16) },
  /* archer: tall turban, face cloth, a big recurve bow and quiver */
  karcher: o => { kBody(o, { torso: 'CLOTH', cloak: 'CLOTH', bw: 0.95 }); const { T, H } = kHead(o); kTurban(H, 'BONE', 1.05); kVeil(H, 'TABARD'); kBow(T) },
  /* bakiraka: dark wrapped hood, plain bone mask with slit eyes, a katar on each fist */
  bakiraka: o => { drawFolk(Object.assign({ torso: 'CLOAK', legs: 'CLOAK', head: 'bare', skin: 'LEATHER', weap: 'knife', cloak: 'CLOAK', bw: 0.9 }, o)); const { T, H } = kHead(o); kHood(H); kMask(H, 'BONE'); kKatar(T(10, -8, 12 + (o.atk || 0) * 22), 15); kKatar(T(4, 13, -2), 15) },
  /* silat: lanky, long black hair, a mouth cover, the urumi's ten ribbon blades whipping from his hand */
  silat: o => { drawFolk(Object.assign({ torso: 'CLOTH', head: 'bare', skin: 'LEATHER', hairM: 'HAIR', long: 1, weap: 'knife', cloak: 'TABARD', bw: 0.86 }, o)); const { T, H } = kHead(o); kVeil(H, 'CLOTH'); const Hd = T(10, -8, 12 + (o.atk || 0) * 22), t = o.t || 0
    for (let r = 0; r < 10; r++) { let q = Hd; for (let i = 0; i < 6; i++) { const n = v3.add(q, [5 + i * 0.6, Math.sin(r * 0.63 + t * 4 + i * 0.5) * (3 + i * 1.6), -1 + Math.cos(r * 0.63 + i * 0.4) * (2 + i * 1.4)]); cap(q, n, 0.35, 0.3, MAT.STEEL, 1, 15); q = n } } },
  /* daka: a deformed horned beast-soldier in scraps of kushan scale, with a curved blade */
  daka: o => { drawFolk(Object.assign({ torso: 'FLESH', legs: 'CLOTH', skin: 'FLESH', head: 'bare', weap: 'sword', bw: 1.45 }, o)); const { T, H } = kHead(o)
    for (const s of [1, -1]) { let q = v3.add(H, [-1, s * 4, 4]); for (let k = 0; k < 5; k++) { const n = v3.add(q, [-1.5 - k, s * (1.6 - k * 0.2), 2.4 - k * 1.4]); cap(q, n, 2.2 - k * 0.38, 2 - k * 0.38, MAT.BONE, 0.85, 13); q = n } }
    cap(v3.add(H, [5, 0, -3]), v3.add(H, [10, 0, -6]), 3.4, 2.4, MAT.DARK, 0.1, 13); for (const s of [1, -1]) sph(v3.add(H, [6, s * 2.2, 1]), 1.1, MAT.EYE, 1, 13); cap(T(1, -11, 26), T(1, 11, 26), 4, 4, MAT.MAIL, 0.85, 14, { tex: kScales }) },
  /* sorcerer: an old sage under a huge cream turban, a long white beard, a glowing staff */
  sorcerer: o => { drawFolk(Object.assign({ torso: 'TABARD', legs: 'CLOAK', head: 'bare', skin: 'LEATHER', weap: 'staff', cloak: 'CLOAK', bw: 0.88 }, o)); const { T, H } = kHead(o); kTurban(H, 'BONE', 1.25); cap(v3.add(H, [4.6, 0, -3]), v3.add(H, [5, 0, -16]), 3.6, 0.8, MAT.BONE, 0.95, 13); for (let k = 0; k < 3; k++) sph(T(16, -6, 54 + k * 3), 2.4 - k * 0.4, MAT.EYE, 1, 16) },
}
/* the war elephant of the columns: hide and tusk, a painted caparison, a howdah with a canopy and an archer riding it */
function drawElephant(o) {
  const p = o.walk || 0, mv = o.mv == null ? 1 : o.mv, hide = MAT.FLESH, ht = (x, y) => 0.82 + (n2(x * 0.15, y * 0.3) - 0.5) * 0.3
  for (const [fx, s] of [[18, 1], [18, -1], [-20, 1], [-20, -1]]) { const ph = (s > 0) === (fx > 0) ? p : p + Math.PI, f = [fx + Math.sin(ph) * 7 * mv, s * 12, Math.max(0, Math.cos(ph)) * 4 * mv]; cap([fx, s * 12, 46], f, 8, 7, hide, 0.7, s > 0 ? 3 : 1, { tex: ht }); sph(f, 7.4, MAT.BONE, 0.7, s > 0 ? 3 : 1, { sq: 0.4 }) }
  sph([0, 0, 56], 28, hide, 0.7, 5, { sq: 0.82, tex: ht }); sph([-14, 0, 56], 24, hide, 0.68, 4, { sq: 0.85, tex: ht })
  const Hh = [30, 0, 66 + (o.atk || 0) * 6]; sph(Hh, 15, hide, 0.72, 7, { tex: ht }); for (const s of [1, -1]) tri(v3.add(Hh, [-4, s * 8, 10]), v3.add(Hh, [-10, s * 26, 6]), v3.add(Hh, [-6, s * 15, -18]), hide, 0.6, 6)
  let q = v3.add(Hh, [12, 0, -4]); for (let i = 0; i < 7; i++) { const n = v3.add(q, [2.2 + (o.atk || 0) * 2, Math.sin(p + i) * 0.8, -6.4 + (o.atk || 0) * 5]); cap(q, n, 5 - i * 0.5, 4.5 - i * 0.5, hide, 0.75, 8, { tex: (x, y, t) => ((i + t) % 1 < 0.3 ? 0.8 : 1) }); q = n }
  for (const s of [1, -1]) { cap(v3.add(Hh, [10, s * 6, -8]), v3.add(Hh, [28, s * 10, -2]), 2.6, 0.6, MAT.BONE, 0.95, 9); sph(v3.add(Hh, [10, s * 7, 4]), 1.4, MAT.EYE, 1, 9) }
  quad([-24, -26, 74], [22, -26, 74], [22, -30, 40], [-24, -30, 40], MAT.TABARD, 0.8, 6, { n: [0, -1, 0.2] }); quad([-24, 26, 74], [22, 26, 74], [22, 30, 40], [-24, 30, 40], MAT.TABARD, 0.8, 6, { n: [0, 1, 0.2] })
  const B = [-6, 0, 84]; quad(v3.add(B, [-16, -14, 0]), v3.add(B, [16, -14, 0]), v3.add(B, [16, 14, 0]), v3.add(B, [-16, 14, 0]), MAT.WOOD, 0.8, 9, { n: [0, 0, 1] }); for (const s of [1, -1]) for (const x of [-14, 14]) cap(v3.add(B, [x, s * 12, 0]), v3.add(B, [x, s * 12, 22]), 1.1, 1.1, MAT.WOOD, 0.8, 11)
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; tri(v3.add(B, [0, 0, 34]), v3.add(B, [Math.cos(a) * 19, Math.sin(a) * 17, 22]), v3.add(B, [Math.cos(a + 1.05) * 19, Math.sin(a + 1.05) * 17, 22]), MAT.TABARD, 0.85, 12) }
  sph(v3.add(B, [2, 0, 8]), 4, MAT.MAIL, 0.8, 11); sph(v3.add(B, [3, 0, 14]), 4.4, MAT.BONE, 0.9, 11, { sq: 0.8 })
}
/* emperor ganishka's fog form: a towering cloud that takes the shape of his face, his tall tiered crown on top, a beard of
   mist, lightning crawling over it; the one weak point between the eyes glows red */
function drawGanishka(o) {
  const t = o.t || 0, tx = (x, y) => 0.7 + n2(x * 0.12 + t, y * 0.12) * 0.45, lift = (o.atk || 0) * 10
  for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU + t * 0.2, r = 30 + (i % 3) * 14; sph([Math.cos(a) * r, Math.sin(a) * r, 20 + (i % 4) * 22], 18 + (i % 3) * 6, MAT.GHOST, 0.55, 1, { tex: tx }) }
  cap([0, 0, 40], [6, 0, 150], 44, 36, MAT.GHOST, 0.6, 3, { tex: tx }); for (const s of [1, -1]) cap([6, s * 40, 140], [30 + lift, s * 56, 80 + lift * 3], 16, 10, MAT.GHOST, 0.62, 4, { tex: tx })
  const H = [18, 0, 200]; sph(H, 30, MAT.GHOST, 0.7, 6, { tex: tx }); sph(v3.add(H, [16, 0, -26]), 20, MAT.GHOST, 0.7, 6, { tex: tx })
  for (let i = 0; i < 8; i++) cap(v3.add(H, [18, (i - 3.5) * 5, -32]), v3.add(H, [16 + (i % 2) * 4, (i - 3.5) * 6, -62 - (i % 3) * 8]), 3.4, 1, MAT.GHOST, 0.65, 7)
  for (const s of [1, -1]) { sph(v3.add(H, [26, s * 11, 6]), 4, MAT.DARK, 0.1, 8); sph(v3.add(H, [29, s * 11, 6]), 1.6, MAT.EYE, 1, 9); cap(v3.add(H, [24, s * 4, 14]), v3.add(H, [22, s * 18, 18]), 2.4, 1.6, MAT.GHOST, 0.85, 8) }
  sph(v3.add(H, [30, 0, 12]), 2.6, MAT.BRAND, 1, 9)
  for (let i = 0; i < 4; i++) cap(v3.add(H, [0, 0, 24 + i * 12]), v3.add(H, [0, 0, 36 + i * 12]), 22 - i * 4.5, 18 - i * 4.5, MAT.EYE, 0.85, 8, { tex: (x, y) => (y % 4 === 0 ? 0.7 : 1) })
  cap(v3.add(H, [0, 0, 72]), v3.add(H, [0, 0, 96]), 3, 0.4, MAT.EYE, 0.9, 9); for (const s of [1, -1]) tri(v3.add(H, [0, s * 18, 28]), v3.add(H, [-6, s * 44, 56]), v3.add(H, [0, s * 20, 48]), MAT.EYE, 0.8, 8)
  for (let i = 0; i < 4; i++) { let q = [Math.cos(i * 1.7 + t) * 50, Math.sin(i * 1.7 + t) * 50, 60 + i * 30]; for (let j = 0; j < 5; j++) { const n = v3.add(q, [(h1(i * 9 + j) - 0.5) * 20, (h1(i * 5 + j) - 0.5) * 20, -14]); cap(q, n, 0.9, 0.9, MAT.SMEAR, 1, 10); q = n } }
}
/* wyald's apostle form: a headless ape-beast's body with his own small torso sprouting from the top, a wide mouth gaping
   across its chest, an eye on each shoulder and a vertical one up the belly; the maw opens wider as he grabs */
function drawWyald(o) {
  const t = o.t || 0, p = o.walk || 0, mv = o.mv == null ? 1 : o.mv, gape = 7 + (o.atk || 0) * 6, fur = (x, y) => 0.72 + n2(x * 0.4, y * 0.9) * 0.45
  for (const s of [1, -1]) { const ph = s > 0 ? p : p + Math.PI, f = [Math.sin(ph) * 14 * mv, s * 22, Math.max(0, Math.cos(ph)) * 8 * mv]; cap([0, s * 20, 70], [8, s * 24, 36], 16, 12, MAT.HAIR, 0.7, s > 0 ? 3 : 1, { tex: fur }); cap([8, s * 24, 36], f, 12, 8, MAT.FLESH, 0.75, s > 0 ? 3 : 1); sph(f, 8, MAT.FLESH, 0.75, s > 0 ? 3 : 1, { sq: 0.5 }) }
  sph([0, 0, 96], 44, MAT.HAIR, 0.72, 5, { sq: 0.9, tex: fur }); sph([18, 0, 100], 34, MAT.FLESH, 0.78, 6, { tex: veins })
  cap([44, -22, 104], [46, 22, 104], gape, gape, MAT.DARK, 0.1, 7); for (let i = 0; i < 10; i++) { sph([48, -20 + i * 4.4, 104 + gape * 0.9], 1.8, MAT.BONE, 1, 8); sph([48, -18 + i * 4, 104 - gape * 0.9], 1.8, MAT.BONE, 1, 8) }
  cap([50, 0, 64], [50, 0, 84], 3, 3, MAT.EYE, 1, 8); for (const s of [1, -1]) sph([24, s * 40, 128], 5, MAT.EYE, 1, 8)
  for (const s of [1, -1]) { const S = [4, s * 42, 126], E = [36, s * 58, 82], reach = (o.atk || 0) * 30, Hd = [56 + reach, s * (50 - reach * 0.6), 20 + Math.sin(t * 2 + s) * 4 + reach]; cap(S, E, 14, 11, MAT.HAIR, 0.75, s > 0 ? 3 : 13, { tex: fur }); cap(E, Hd, 11, 8, MAT.FLESH, 0.78, s > 0 ? 3 : 13); for (let i = -1; i <= 1; i++) cap(Hd, v3.add(Hd, [10, i * 4, -6]), 2.4, 0.6, MAT.BONE, 0.95, s > 0 ? 3 : 13) }
  cap([4, 0, 136], [8, 0, 156], 8, 9, MAT.SKIN, 0.85, 9); for (const s of [1, -1]) cap([8, s * 8, 154], [16, s * 14, 166 + Math.sin(t * 3 + s) * 4], 2.6, 2, MAT.SKIN, 0.85, 10)
  const H = [10, 0, 166]; sph(H, 6, MAT.SKIN, 0.85, 11); cap(v3.add(H, [4, 0, -3]), v3.add(H, [7, 0, -4]), 3, 2, MAT.DARK, 0.1, 11); for (let i = 0; i < 12; i++) cap(v3.add(H, [-2, (h1(i) - 0.5) * 10, 4]), v3.add(H, [-12 - h1(i + 4) * 8, (h1(i) - 0.5) * 22, -6 - h1(i + 8) * 14]), 2, 0.5, MAT.HAIR, 0.8, 10, { tex: fur })
}
/* rosine's true form, a giant luna moth: broad pale wings with eyespots and long trailing hind tails, feathered antennae,
   a girl's body hanging beneath, and the proboscis she fights with */
function drawMoth(o) {
  const t = o.t || 0, z = 40 + Math.sin(t * 7) * 3, fl = 0.3 + 0.3 * Math.sin(t * 6) + (o.atk || 0) * 0.3, lance = 28 + (o.atk || 0) * 20
  const wtx = (x, y, u, v) => { const ex = (u - 0.45) ** 2 + (v - 0.35) ** 2; return ex < 0.012 ? 0.4 : ex < 0.02 ? 1.2 : 0.82 + n2(x * 0.2, y * 0.2) * 0.25 }
  for (const s of [1, -1]) { const R = [0, s * 4, z + 46]
    tri(R, [-6, s * 70, z + 94 + fl * 20], [-26, s * 58, z + 28 + fl * 10], MAT.GHOST, 0.85, s > 0 ? 1 : 14, { tex: wtx }); tri(R, [-26, s * 58, z + 28 + fl * 10], [-6, s * 70, z + 94 + fl * 20], MAT.GHOST, 0.85, s > 0 ? 1 : 14, { tex: wtx })
    tri(R, [-26, s * 58, z + 28 + fl * 10], [-14, s * 20, z + 18], MAT.GHOST, 0.8, s > 0 ? 1 : 14, { tex: wtx }); tri(R, [-14, s * 20, z + 18], [-26, s * 58, z + 28 + fl * 10], MAT.GHOST, 0.8, s > 0 ? 1 : 14, { tex: wtx })
    tri([-6, s * 4, z + 34], [-34, s * 34, z + 10], [-20, s * 10, z + 20], MAT.GHOST, 0.75, s > 0 ? 1 : 14); tri([-6, s * 4, z + 34], [-20, s * 10, z + 20], [-34, s * 34, z + 10], MAT.GHOST, 0.75, s > 0 ? 1 : 14)
    cap([-30, s * 30, z + 12], [-56, s * 40, z - 30], 3, 0.6, MAT.GHOST, 0.8, s > 0 ? 1 : 14); sph([-12, s * 40, z + 60 + fl * 8], 5, MAT.BRAND, 0.8, s > 0 ? 2 : 15) }
  cap([0, 0, z + 20], [2, 0, z + 54], 6, 7, MAT.GHOST, 0.85, 6, { tex: (x, y) => (y % 3 === 0 ? 0.7 : 1) }); cap([2, 0, z + 20], [-2, 0, z - 6], 4, 2, MAT.SKIN, 0.85, 6); for (const s of [1, -1]) cap([0, s * 3, z + 22], [4, s * 5, z - 8], 1.6, 1, MAT.SKIN, 0.85, 7)
  for (let i = 0; i < 3; i++) for (const s of [1, -1]) cap([4, s * 5, z + 32 + i * 6], [14, s * 12, z + 20 + i * 4], 0.8, 0.4, MAT.DARK, 0.3, 7)
  const H = [6, 0, z + 62]; sph(H, 6.4, MAT.SKIN, 0.85, 9); for (const s of [1, -1]) sph(v3.add(H, [4, s * 3, 0.6]), 2.6, MAT.GORE, 0.45, 10); cap(v3.add(H, [6, 0, -2]), v3.add(H, [6 + lance, 0, -14 - fl * 6]), 1.2, 0.3, MAT.BONE, 0.95, 11)
  for (const s of [1, -1]) { let q = v3.add(H, [1, s * 3, 5]); for (let i = 0; i < 5; i++) { const n = v3.add(q, [2 + i, s * 3, 4 - i]); cap(q, n, 0.7, 0.5, MAT.DARK, 0.4, 11); cap(n, v3.add(n, [-2, s * 2, 3]), 0.4, 0.2, MAT.DARK, 0.4, 11); q = n } }
  cap(v3.add(H, [-1, 0, 3]), v3.add(H, [-6, 0, -14]), 4, 2.6, MAT.GHOST, 0.8, 8)
}
/* rosine's elves: children turned elf, big pupilless eyes, long pointed ears, small moth wings */
function drawElfling(o) {
  const t = o.t || 0, z = 22 + Math.sin(t * 9) * 2
  cap([0, 0, z], [2, 0, z + 20], 3.6, 4.6, MAT.SKIN, 0.85, 5); for (const s of [1, -1]) cap([0, s * 2.6, z], [-2, s * 3.4, z - 16], 2, 1.4, MAT.SKIN, 0.8, 4)
  const H = [3, 0, z + 30]; sph(H, 7, MAT.SKIN, 0.88, 8); for (const s of [1, -1]) { sph(v3.add(H, [5, s * 2.8, 0.8]), 2.8, MAT.EYE, 1, 9); cap(v3.add(H, [0, s * 6, 1]), v3.add(H, [-3, s * 12, 6]), 1.8, 0.3, MAT.SKIN, 0.9, 9); cap(v3.add(H, [1, s * 2, 6]), v3.add(H, [6, s * 7, 15]), 0.5, 0.3, MAT.DARK, 0.3, 9) }
  const fl = Math.sin(t * 18) * 0.4; for (const s of [1, -1]) { tri([-2, s * 3, z + 20], [-12, s * 22, z + 32 + fl * 10], [-14, s * 14, z + 6 + fl * 6], MAT.BONE, 0.8, s > 0 ? 1 : 14, { tex: (x, y) => 0.8 + n2(x * 0.3, y * 0.3) * 0.35 }); tri([-2, s * 3, z + 14], [-12, s * 14, z + 4], [-8, s * 8, z - 8], MAT.BONE, 0.75, s > 0 ? 1 : 14) }
  for (const s of [1, -1]) cap([2, s * 5, z + 18], [9, s * 8, z + 6 - (o.atk || 0) * 4], 1.5, 1.1, MAT.SKIN, 0.85, 12)
}
