/* ---------- APOSTLE BOSSES: nosferatu zodd, grunbeld, the count, rosine ----------
   drop-in for figs.js: same local frame (x forward, y left, z up, feet at the origin, ~100 units = guts' height)
   and the same primitives. each takes o = {v: 'A'..'D', t, atk}; v picks the design take. */
const bzBez = (A, B, C, n) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([0, 1, 2].map(k => u * u * A[k] + 2 * u * t * B[k] + t * t * C[k])) } return o }
const bzFur = (x, y) => 0.8 + 0.28 * n2(x * 0.3, y * 0.9) + (h2(x, y) - 0.5) * 0.12
const bzSlime = (x, y) => 0.76 + 0.3 * n2(x * 0.16, y * 0.16) + (h2(x >> 1, y >> 1) < 0.035 ? 0.4 : 0)
const bzScale = (x, y) => ((x + ((y >> 2) & 1) * 2) % 4 === 0 || y % 4 === 0 ? 0.74 : 1) * (0.9 + n2(x * 0.2, y * 0.2) * 0.2)
/* two unit vectors across d: w1 sideways (horizontal), w2 the other */
function bzBasis(d) { const w1 = v3.norm(Math.abs(d[2]) > 0.95 ? v3.cross(d, [1, 0, 0]) : v3.cross(d, [0, 0, 1])); return [w1, v3.cross(d, w1)] }
function bzChain(P, r0, r1, m, a, p, o) { const n = P.length - 1; for (let i = 0; i < n; i++) cap(P[i], P[i + 1], lerp(r0, r1, i / n), lerp(r0, r1, (i + 1) / n), m, a, p, o) }
const bzAt = (T, q) => (q[0] === 'W' ? [q[1], q[2], q[3]] : T(q[1], q[2], q[3]))

/* a ridged horn along a curve; broken ones stop halfway on a splintered stump */
function bzHorn(base, ctrl, tip, r0, p, broken) {
  const P = bzBez(base, ctrl, tip, 10), n = broken ? 5 : 10, rr = i => r0 * (1 - 0.86 * i / 10)
  for (let i = 0; i < n; i++) cap(P[i], P[i + 1], rr(i), rr(i + 1), MAT.BONE, 0.84 - i * 0.02, p, { tex: (x, y, t) => ((i + t) % 1 < 0.28 ? 0.76 : 1) })
  if (!broken) return
  const e = P[n], d = v3.norm(v3.sub(P[n], P[n - 1])), [w1, w2] = bzBasis(d), r = rr(n)
  sph(e, r * 0.95, MAT.BONE, 0.55, p)
  for (let k = 0; k < 5; k++) { const a = k * TAU / 5 + 0.3, b = v3.add(v3.add(e, w1, Math.cos(a) * r * 0.7), w2, Math.sin(a) * r * 0.7); cap(b, v3.add(b, d, 2 + h1(k * 13) * r * 1.2), r * 0.34, 0.3, MAT.BONE, 0.95, p) }
}
/* a bat wing: arm bones, four fingers, a scalloped membrane. spread 0 folded .. 1 open; rise lifts the span; sweep pulls it back */
function bzBatWing(S, s, L, spread, rise, sweep, p, mem, bone) {
  const out = v3.norm([-sweep, s * Math.cos(rise), Math.sin(rise)]), g = [-1, 0, -0.3], back = v3.norm(v3.sub(g, v3.mul(out, v3.dot(g, out))))
  const fa = 0.35 + 0.65 * spread, fb = 0.5 + 0.5 * spread, W = (a, b) => v3.add(v3.add(S, out, a * L * fa), back, b * L * fb)
  const E = W(0.34, -0.1), Wr = W(0.6, 0.02), T = [W(1.0, -0.08), W(0.96, 0.36), W(0.76, 0.7), W(0.44, 0.92)], A = W(0.04, 0.7)
  const scal = (x, y, u, v) => { const r = u + v, q = r > 0 ? v / r : 0; return r > 1 - 0.14 * Math.sin(Math.PI * q) ? -1 : 0.8 + n2(x * 0.15, y * 0.4) * 0.35 }
  for (let i = 0; i < 3; i++) tri(Wr, T[i], T[i + 1], mem, 0.5, p, { tex: scal })
  tri(Wr, T[3], A, mem, 0.48, p, { tex: scal }); tri(E, Wr, A, mem, 0.5, p); tri(S, E, A, mem, 0.5, p)
  cap(S, E, L * 0.05, L * 0.04, bone, 0.8, p + 1); cap(E, Wr, L * 0.04, L * 0.03, bone, 0.8, p + 1); sph(Wr, L * 0.036, bone, 0.85, p + 1)
  for (const q of T) cap(Wr, q, L * 0.022, L * 0.006, bone, 0.8, p + 1)
  cap(Wr, v3.add(v3.add(Wr, out, L * 0.06), [0, 0, L * 0.05]), L * 0.02, 0.4, MAT.BONE, 0.95, p + 1)
}
/* a huge single-edged blade turned flat to the eye, with a slight curve */
function bzSword(Hd, d, L, hw, curve, p) {
  const w = v3.norm(v3.cross(d, eyeLocal())), N = 8, C = i => { const a = i / N; return v3.add(v3.add(Hd, d, 8 + a * L), w, curve * a * a * L) }
  cap(v3.add(Hd, d, -16), v3.add(Hd, d, 4), 2.8, 2.8, MAT.LEATHER, 0.7, p, { tex: (x, y, t) => (Math.floor(t * 6) % 2 ? 0.65 : 1) })
  cap(v3.add(v3.add(Hd, d, 6), w, -hw * 1.5), v3.add(v3.add(Hd, d, 6), w, hw * 1.5), 3, 3, MAT.IRON, 0.8, p)
  for (let i = 0; i < N; i++) {
    const A0 = C(i), A1 = C(i + 1), k0 = hw * (1 - 0.25 * i / N), k1 = hw * (1 - 0.25 * (i + 1) / N)
    quad(v3.add(A0, w, -k0), v3.add(A1, w, -k1), v3.add(A1, w, k1), v3.add(A0, w, k0), MAT.STEEL, 1, p, { tex: (x, y, u, v) => (v > 0.8 ? 1.15 : v < 0.16 ? 0.78 : 0.95) + (h2(x, y) - 0.5) * 0.08 })
  }
  const E = C(N), dd = v3.norm(v3.sub(C(N), C(N - 1))); tri(v3.add(E, w, -hw * 0.75), v3.add(v3.add(E, dd, hw * 2.4), w, hw * 0.55), v3.add(E, w, hw * 0.75), MAT.STEEL, 0.95, p)
}
/* a faceted crystal: a five-sided prism with a point; facets alternate pale and steel so they glint (ink: white and hatched) */
function bzCrystal(B, d, len, r, p, seed) {
  d = v3.norm(d); const [w1, w2] = bzBasis(d), n = 5, R0 = [], R1 = [], tip = v3.add(B, d, len)
  for (let k = 0; k < n; k++) { const a = k * TAU / n + seed, c = Math.cos(a), s = Math.sin(a); R0.push(v3.add(v3.add(B, w1, c * r), w2, s * r)); R1.push(v3.add(v3.add(v3.add(B, d, len * 0.66), w1, c * r * 0.88), w2, s * r * 0.88)) }
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n, m = (k + Math.floor(seed * 3)) % 2 ? MAT.STEEL : MAT.GHOST, a = 0.75 + h1(seed * 91 + k) * 0.3
    quad(R0[k], R0[j], R1[j], R1[k], m, a, p); tri(R1[k], R1[j], tip, m, a * 1.08, p)
  }
}

/* ---------- NOSFERATU ZODD: the winged, horned beast; Guts snapped his left horn ---------- */
const ZODD = {
  /* A the duelist: upright, sword levelled at you, wings half raised */
  A: { hz: 126, lean: 0.15, tw: -0.2, feet: [[18, 28, 0], [-26, -24, 0]], R: ['T', 58, -30, 48], sd: [1, -0.05, -0.42], L: ['T', 36, 50, 34], wing: [0.8, 0.6, 0.05, 210], head: [28, 0, 104], jaw: 0.5, tail: [[-90, 10, 30], [-130, -40, 80]] },
  /* B the sky predator: airborne, wings fully open, blade raised for the dive */
  B: { hz: 122, fly: 64, lean: 0.38, tw: 0.1, feet: [[-6, 24, 76], [-22, -22, 68]], R: ['T', 10, -48, 112], sd: [0.25, -0.15, 1], L: ['T', 54, 36, 46], wing: [1, 0.3, 0.15, 270], head: [30, 0, 102], jaw: 0.8, tail: [[-80, 0, 150], [-150, 20, 120]] },
  /* C the beast: on all fours like a great ape-lion, horns lowered, no sword */
  C: { hz: 98, lean: 1.2, tw: 0, feet: [[-14, 28, 0], [-30, -26, 0]], R: ['W', 92, -40, 6], L: ['W', 104, 40, 6], quad: 1, wing: [0.05, 1.3, 1.0, 200], head: [34, 0, 100], jaw: 0.9, tail: [[-120, 0, 120], [-170, 40, 150]] },
  /* D the whirlwind: wide stance, torso wound up, blade swept out at arm's length */
  D: { hz: 122, lean: 0.22, tw: 0.8, feet: [[22, 38, 0], [-22, -38, 0]], R: ['T', 14, -104, 62], sd: 'arm', L: ['T', -30, 58, 34], wing: [0.85, 0.45, 0.25, 220], head: [28, 0, 104], jaw: 0.3, tail: [[-90, 40, 20], [-60, 120, 30]] },
}
function bzZoddHead(H, jaw, p) {
  const fm = MAT.FLESH, Q = (x, y, z) => v3.add(H, [x * 1.2, y * 1.2, z * 1.2])
  sph(H, 18, fm, 0.82, p, { tex: bzFur }); cap(Q(6, 0, 4), Q(11, 0, 6), 12, 11, fm, 0.72, p)
  cap(Q(6, 0, -3), Q(23, 0, -7), 13, 9, fm, 0.86, p, { tex: bzFur }); sph(Q(25, 0, -5), 3.6, MAT.DARK, 0.2, p)
  cap(Q(8, 0, -10), Q(20, 0, -12 - jaw * 8), 6, 4.5, MAT.DARK, 0.1, p)
  cap(Q(4, 0, -12), Q(19, 0, -14 - jaw * 10), 7, 5, fm, 0.8, p, { tex: bzFur })
  for (const s of [1, -1]) {
    cap(Q(20, s * 4, -9), Q(21, s * 4, -18), 1.7, 0.3, MAT.BONE, 1, p); cap(Q(17, s * 5, -13 - jaw * 9), Q(19, s * 6, -5 - jaw * 7), 1.9, 0.3, MAT.BONE, 1, p)
    sph(Q(13, s * 6.4, 2), 2.6, MAT.EYE, 1, p); cap(Q(-2, s * 11, 4), Q(-12, s * 17, 12), 4, 0.6, fm, 0.8, p)
    bzHorn(Q(0, s * 11, 9), Q(-14, s * 40, 14), Q(16, s * 48, 48), 10, p + 1, s > 0)
  }
}
function drawZodd(o) {
  const P = o.P || ZODD[o.v || 'A'], fly = P.fly || 0, T = torsoF(P.hz + fly, P.lean, P.tw), fm = MAT.FLESH
  for (const s of [1, -1]) bzBatWing(T(-16, s * 16, 74), s, P.wing[3], P.wing[0], P.wing[1], P.wing[2], 1, MAT.DARK, fm)
  const tl = bzBez(T(-16, 0, -2), v3.add(P.tail[0], [0, 0, 0]), P.tail[1], 10); bzChain(tl, 13, 3, fm, 0.75, 3, { tex: bzFur }); for (let k = 0; k < 6; k++) cap(tl[10], v3.add(tl[10], [(h1(k) - 0.5) * 22, (h1(k + 4) - 0.5) * 22, -6 - h1(k + 8) * 14]), 3.4, 0.5, MAT.HAIR, 0.75, 3)
  P.feet.forEach((f, k) => {
    const s = k ? -1 : 1, q = s > 0 ? 4 : 5, hip = T(0, s * 20, -6), hock = v3.add(f, [-15, 0, 30]), kn = ik3(hip, hock, 54, 52, [1, 0, 0.15])
    cap(hip, kn, 21, 14, fm, 0.75, q, { tex: bzFur }); sph(kn, 13, fm, 0.8, q); cap(kn, hock, 14, 9, MAT.HAIR, 0.8, q, { tex: bzFur }); cap(hock, v3.add(f, [4, 0, 4]), 9, 6, MAT.HAIR, 0.8, q, { tex: bzFur })
    for (let i = -1; i <= 1; i++) cap(v3.add(f, [4, i * 4, 4]), v3.add(f, [15, i * 6, fly ? -6 : 0]), 3, 0.6, MAT.BONE, 0.9, q)
  })
  sph(T(0, 0, 0), 27, fm, 0.75, 6, { tex: bzFur }); cap(T(2, 0, 6), T(8, 0, 46), 25, 32, fm, 0.8, 6, { tex: (x, y) => bzFur(x, y) * (y % 5 === 0 ? 0.82 : 1) })
  sph(T(-8, 0, 68), 38, fm, 0.72, 7, { tex: bzFur }); sph(T(8, 0, 66), 39, fm, 0.82, 7, { tex: bzFur }); for (const s of [1, -1]) sph(T(-2, s * 26, 78), 22, fm, 0.78, 7, { tex: bzFur })
  for (const s of [1, -1]) sph(T(22, s * 17, 70), 20, fm, 0.88, 7)
  /* the mane falls over the shoulders and down the back */
  const shag = (x, y, dx, dy) => (dx * dx + dy * dy > 0.7 && h2(x, y) < 0.5 ? -1 : 0.7 + n2(x * 0.5, y * 0.2) * 0.5)
  sph(T(-12, 0, 88), 28, MAT.HAIR, 0.75, 8, { tex: shag })
  for (let k = 0; k < 11; k++) { const y = (k - 5) * 6, b = T(-10 + Math.abs(y) * 0.3, y, 96 - Math.abs(y) * 0.4); cap(b, v3.add(b, [-18 - h1(k) * 14, y * 0.5, -28 - h1(k + 9) * 22]), 7, 1, MAT.HAIR, 0.72, 8) }
  const H = T(P.head[0], P.head[1], P.head[2]); cap(T(8, 0, 84), H, 22, 15, fm, 0.8, 9, { tex: bzFur }); bzZoddHead(H, P.jaw, 10)
  for (const s of [1, -1]) {
    const S = T(6, s * 48, 82), q = s > 0 ? 12 : 14, Hd = bzAt(T, s > 0 ? P.L : P.R), hint = P.quad ? [-0.7, s * 0.6, 0.3] : [-0.4, s, -0.5], E = ik3(S, Hd, 64, 62, hint)
    sph(S, 25, fm, 0.84, q, { tex: bzFur }); cap(S, E, 20, 14, fm, 0.82, q, { tex: bzFur }); sph(E, 13, fm, 0.84, q); cap(E, Hd, 15, 11, fm, 0.84, q, { tex: bzFur }); sph(Hd, 11, fm, 0.86, q)
    const fd = P.quad ? [1, 0, -0.3] : v3.norm(v3.sub(Hd, E))
    for (let i = -1; i <= 1; i++) cap(v3.add(Hd, [0, i * 4, 0]), v3.add(v3.add(Hd, fd, 13), [0, i * 5, P.quad ? -3 : -4]), 2.6, 0.5, MAT.BONE, 0.95, q)
    if (s < 0 && P.sd) bzSword(Hd, P.sd === 'arm' ? v3.norm(v3.add(v3.sub(Hd, S), [0, 0, 6])) : v3.norm(P.sd), 178, 10, 0.12, 15)
  }
}

/* ---------- GRUNBELD: the crystal-armoured dragon ---------- */
const GRUN = {
  /* A rampant: reared on the hind legs, claws up, breathing down at you */
  A: { pitch: 0.85, hip: [-20, 0, 78], hf: [[4, 46, 0], [-34, -46, 0]], ff: [[136, 66, 148], [128, -62, 160]], neck: [110, 0, 300], head: [168, 0, 282], hd: [1, 0, -0.65], jaw: 0.9, fire: 1, tail: [[-170, 40, 10], [-260, -50, 14]], ridge: 1 },
  /* B the fortress: low on four legs, the back a forest of crystal */
  B: { pitch: 0.05, hip: [-70, 0, 92], hf: [[-48, 52, 0], [-90, -50, 0]], ff: [[116, 54, 0], [88, -52, 0]], neck: [160, 0, 160], head: [204, 0, 124], hd: [1, 0, -0.25], jaw: 0.25, tail: [[-210, 0, 70], [-310, 50, 10]], ridge: 2.2 },
  /* C the lasher: tail swung round in front of the flank, crystal club at its end */
  C: { pitch: 0.12, hip: [-60, 0, 92], hf: [[-40, 54, 0], [-84, -50, 0]], ff: [[120, 56, 0], [94, -54, 0]], neck: [150, 40, 170], head: [190, 70, 140], hd: [0.8, 0.5, -0.25], jaw: 0.5, tail: [[-210, 170, 40], [-20, 250, 30]], ridge: 1, club: 1 },
  /* D the mortar: haunches down, neck thrown up, spitting molten globs into the air */
  D: { pitch: 0.32, hip: [-60, 0, 80], hf: [[-30, 56, 0], [-76, -54, 0]], ff: [[110, 58, 0], [96, -56, 0]], neck: [120, 0, 250], head: [150, 0, 300], hd: [0.45, 0, 0.9], jaw: 1, fire: 1, globs: 1, tail: [[-200, 30, 20], [-280, -60, 10]], ridge: 1.2 },
}
function bzDragonHead(H, d, jaw, fire, p) {
  d = v3.norm(d); const side = v3.norm(v3.cross([0, 0, 1], d)), up = v3.cross(d, side), hide = MAT.IRON
  const L = (a, s, u) => v3.add(v3.add(v3.add(H, d, a), side, s), up, u)
  sph(H, 22, hide, 0.78, p, { tex: bzScale }); cap(L(8, 0, 2), L(54, 0, -4), 17, 10, hide, 0.82, p, { tex: bzScale })
  cap(L(12, 0, -12), L(46, 0, -13 - jaw * 10), 9, 6, MAT.DARK, 0.1, p)
  cap(L(4, 0, -14), L(50, 0, -16 - jaw * 15), 12, 6, hide, 0.78, p, { tex: bzScale })
  if (fire) sph(L(28, 0, -13 - jaw * 6), 7, MAT.EYE, 1, p)
  for (const s of [1, -1]) {
    cap(L(10, s * 10, 11), L(28, s * 9, 8), 6, 4, hide, 0.7, p); sph(L(22, s * 11, 6), 3.2, MAT.EYE, 1, p); sph(L(53, s * 4, 2), 1.6, MAT.DARK, 0.1, p)
    for (let k = 0; k < 5; k++) { cap(L(18 + k * 7, s * 7, -9), L(19 + k * 7, s * 7, -15), 1.6, 0.3, MAT.BONE, 1, p); cap(L(16 + k * 7, s * 6, -16 - jaw * (2 + k * 2.6)), L(17 + k * 7, s * 6, -10 - jaw * (2 + k * 2.6)), 1.4, 0.3, MAT.BONE, 1, p) }
    bzCrystal(L(-8, s * 12, 12), v3.add(v3.add(v3.mul(d, -1), up, 0.7), side, s * 0.35), 54, 7, p + 1, 0.4 + s)
    bzCrystal(L(4, s * 13, 2), v3.add(v3.add(v3.mul(d, -1), up, 0.1), side, s * 0.9), 26, 4.5, p + 1, 1.3 + s)
  }
  bzCrystal(L(10, 0, 18), v3.add(up, d, -0.4), 22, 5, p + 1, 2.2)
}
function drawGrunbeld(o) {
  const P = o.P || GRUN[o.v || 'A'], hide = MAT.IRON, Hc = P.hip, ax = [Math.cos(P.pitch), 0, Math.sin(P.pitch)], Cc = v3.add(Hc, ax, 150), dn = [Math.sin(P.pitch), 0, -Math.cos(P.pitch)]
  /* tail, body and belly plates */
  const tl = bzBez(v3.add(Hc, ax, -30), P.tail[0], P.tail[1], 12); bzChain(tl, 36, 5, hide, 0.76, 2, { tex: bzScale })
  for (let i = 1; i < 12; i += 1) { const d = v3.norm(v3.sub(tl[i + 1], tl[i])), up = v3.norm(v3.cross(d, v3.cross([0, 0, 1], d))), r = lerp(36, 5, i / 12); bzCrystal(v3.add(tl[i], up, r * 0.7), v3.add(up, d, -0.6), r * 1.1 + 6, r * 0.32 + 1.5, 3, i * 0.7) }
  if (P.club) for (let k = 0; k < 7; k++) { const a = k * TAU / 7; bzCrystal(tl[12], [Math.cos(a), Math.sin(a), 0.5 + (k % 2) * 0.6], 26 + h1(k) * 14, 6, 3, k) }
  for (let k = 0; k <= 6; k++) sph(v3.lerp(Hc, Cc, k / 6), lerp(50, 60, Math.sin((k / 6) * Math.PI)), hide, 0.74, 6, { tex: bzScale })
  for (let k = 0; k <= 5; k++) sph(v3.add(v3.lerp(Hc, Cc, k / 5), dn, 26), 36, MAT.LEATHER, 0.82, 7, { tex: (x, y) => (y % 5 === 0 ? 0.7 : 1) })
  /* legs: hind knees forward, front elbows back; claws */
  const leg = (A, F, l1, l2, hint, r, q) => { const K = ik3(A, F, l1, l2, hint); sph(A, r * 1.25, hide, 0.76, q, { tex: bzScale }); cap(A, K, r, r * 0.78, hide, 0.78, q, { tex: bzScale }); sph(K, r * 0.8, hide, 0.8, q); cap(K, F, r * 0.78, r * 0.6, hide, 0.8, q, { tex: bzScale }); sph(F, r * 0.62, hide, 0.82, q)
    const fd = F[2] > 30 ? v3.norm(v3.sub(F, K)) : [1, 0, 0]; for (let i = -1; i <= 1; i++) cap(v3.add(F, [0, i * 6, 0]), v3.add(v3.add(F, fd, 18), [0, i * 8, F[2] > 30 ? 0 : -4]), 3.4, 0.5, MAT.BONE, 0.95, q)
    bzCrystal(v3.add(K, [0, 0, r * 0.5]), [-0.4, 0, 1], r * 1.4, r * 0.4, q, q * 0.37) }
  P.hf.forEach((f, k) => { const s = k ? -1 : 1; leg(v3.add(Hc, [0, s * 42, -4]), f, 66, 62, [1, s * 0.2, 0.2], 26, s > 0 ? 4 : 5) })
  P.ff.forEach((f, k) => { const s = k ? -1 : 1; leg(v3.add(Cc, [6, s * 44, -10]), f, 62, 58, [-1, s * 0.4, P.pitch > 0.5 ? -0.6 : 0], 20, s > 0 ? 12 : 13) })
  /* the crystal ridge and shoulder plates */
  const nr = Math.round(7 * P.ridge)
  for (let k = 0; k < nr; k++) { const t = (k + 0.5) / nr, B = v3.add(v3.lerp(Hc, Cc, t), dn, -46), y = (h1(k * 7) - 0.5) * 50 * Math.min(1, P.ridge - 0.5); bzCrystal(v3.add(B, [0, y, 0]), v3.add(v3.mul(dn, -1), [-(h1(k) * 0.6), y * 0.012, 0]), 40 + h1(k + 3) * 34 * P.ridge, 9 + h1(k + 5) * 5, 9, k * 0.9) }
  for (const s of [1, -1]) for (let k = 0; k < 3; k++) bzCrystal(v3.add(Cc, [-10 + k * 14, s * 46, 20 - k * 6]), [-0.3, s * 0.8, 0.6], 30 - k * 6, 7, 10, k + s)
  /* neck and head */
  const N0 = v3.add(v3.add(Cc, ax, 30), [0, 0, 12]), nk = bzBez(N0, P.neck, P.head, 9); bzChain(nk, 32, 20, hide, 0.8, 11, { tex: bzScale })
  for (let i = 1; i < 9; i++) { const d = v3.norm(v3.sub(nk[i + 1], nk[i])), up = v3.norm(v3.cross(d, v3.cross([0, 0, 1], d))); bzCrystal(v3.add(nk[i], up, 22), v3.add(up, d, -0.5), 22, 5, 11, i * 1.1) }
  bzDragonHead(P.head, P.hd, P.jaw, P.fire, 16)
  if (P.globs) for (const [x, y, z, r] of [[230, 20, 330, 11], [185, -40, 365, 9], [270, -14, 300, 8]]) { sph([x, y, z], r, MAT.BRAND, 1, 20); sph([x + r * 0.3, y, z + r * 0.3], r * 0.5, MAT.EYE, 1, 20); for (let k = 1; k < 4; k++) sph([x - k * r * 1.1, y, z - k * r * 0.9], r * (0.55 - k * 0.12), MAT.DARK, 0.3, 20) }
}

/* ---------- THE COUNT: a giant slug with the man's torso still on it ---------- */
const COUNT = {
  /* A the rearing slug: the front reared like a cobra, the count rising from its crown, a toothed maw beneath him */
  A: { sp: [[-230, 0, 30], [-30, 0, 30], [50, 0, 215]], rf: 64, front: 'maw', ms: 2, arms: 'wide', stalks: 1 },
  /* B the giant face: low and long, the slug's front is his own face, mustache and all; the man rides the hump */
  B: { sp: [[-250, 0, 34], [-90, 40, 50], [70, 0, 72]], rf: 78, front: 'face', manAt: 8, ms: 1.6, arms: 'hold' },
  /* C the opened maw: the front peels open in four lips; the man sits inside, tongues lashing out */
  C: { sp: [[-220, 0, 30], [-40, 0, 40], [50, 0, 125]], rf: 74, front: 'split', ms: 1.8, arms: 'grab', stalks: 1, tongues: 1 },
  /* D the brood: bloated, back crusted with egg sacs, the count on the crown with arms raised */
  D: { sp: [[-210, 0, 46], [-50, 0, 60], [30, 0, 140]], rf: 84, fat: 1.15, front: 'maw', ms: 1.9, arms: 'up', stalks: 1, sacs: 1 },
}
function bzCountMan(B, sc, arms, p) {
  const Q = (x, y, z) => v3.add(B, [x * sc, y * sc, z * sc]), sk = MAT.SKIN
  sph(B, 13 * sc, MAT.GORE, 0.5, p); sph(Q(3, 0, 14), 16 * sc, sk, 0.8, p, { tex: veins }); sph(Q(1, 0, 30), 14 * sc, sk, 0.82, p)
  for (const s of [1, -1]) sph(Q(6, s * 6, 30), 7 * sc, sk, 0.88, p)
  const Hd = Q(4, 0, 50); cap(Q(1, 0, 38), Hd, 6 * sc, 5.5 * sc, sk, 0.84, p); sph(Hd, 8.5 * sc, sk, 0.86, p)
  sph(v3.add(Hd, [-1.5 * sc, 0, 2 * sc]), 8 * sc, MAT.HAIR, 0.7, p + 1, { tex: (x, y, dx, dy) => (dy < 0.05 || dx > 0.45 ? -1 : 0.8) })
  for (const s of [1, -1]) {
    sph(v3.add(Hd, [7 * sc, s * 3 * sc, 1.5 * sc]), 1.2 * sc, MAT.EYE, 1, p + 1)
    /* the count's swept mustache */
    cap(v3.add(Hd, [8.4 * sc, s * 0.8 * sc, -2.4 * sc]), v3.add(Hd, [7 * sc, s * 9 * sc, -1 * sc]), 2 * sc, 0.6 * sc, MAT.HAIR, 0.8, p + 1)
    cap(v3.add(Hd, [7 * sc, s * 9 * sc, -1 * sc]), v3.add(Hd, [4 * sc, s * 13 * sc, 3 * sc]), 0.8 * sc, 0.3 * sc, MAT.HAIR, 0.8, p + 1)
  }
  cap(v3.add(Hd, [8 * sc, -2 * sc, -5 * sc]), v3.add(Hd, [8 * sc, 2 * sc, -5 * sc]), 0.9 * sc, 0.9 * sc, MAT.DARK, 0.1, p + 1, { fl: 1 })
  const tg = { wide: s => Q(14, s * 40, 46), hold: s => Q(20, s * 12, 18), grab: s => Q(30, s * 22, 26), up: s => Q(6, s * 26, 74) }[arms]
  for (const s of [1, -1]) { const S = Q(1, s * 15, 36), Hh = tg(s), E = ik3(S, Hh, 18 * sc, 18 * sc, [-0.4, s, -0.4]); cap(S, E, 5.6 * sc, 4.4 * sc, sk, 0.84, p + 2); cap(E, Hh, 4.4 * sc, 3.4 * sc, sk, 0.86, p + 2); sph(Hh, 3.6 * sc, sk, 0.9, p + 2)
    for (let i = -1; i <= 1; i++) cap(Hh, v3.add(Hh, [3 * sc, i * 2 * sc, arms === 'up' ? 5 * sc : -4 * sc]), 1.1 * sc, 0.5 * sc, sk, 0.9, p + 2) }
}
function drawCount(o) {
  const P = o.P || COUNT[o.v || 'A'], fm = MAT.FLESH, N = 16, fat = P.fat || 1
  const rad = i => { const t = i / N; return P.rf * (0.3 + 0.7 * Math.sin(Math.PI * (0.12 + 0.72 * t))) * (t > 0.2 && t < 0.8 ? fat : 1) }
  const S = bzBez(P.sp[0], P.sp[1], P.sp[2], N).map((q, i) => [q[0], q[1], Math.max(q[2], rad(i) * 0.62)])
  /* the foot: a wide wet skirt on the ground */
  for (let i = 0; i <= N; i++) { const r = rad(i); sph([S[i][0], S[i][1], r * 0.25], r * 1.12, fm, 0.48, 2, { tex: (x, y) => 0.8 + ((x + y * 3) % 7 === 0 ? -0.25 : 0) }) }
  for (let i = 0; i <= N; i++) sph(S[i], rad(i), fm, 0.72, 4, { tex: bzSlime })
  for (let i = 1; i < N; i++) for (let k = 0; k < 3; k++) { const r = rad(i), a = (h1(i * 7 + k) - 0.5) * 2.2; sph(v3.add(S[i], [0, Math.sin(a) * r * 0.82, Math.cos(a) * r * 0.84]), r * (0.12 + h1(i + k * 5) * 0.1), fm, 0.86, 5, { tex: bzSlime }) }
  if (P.sacs) for (let k = 0; k < 11; k++) { const i = 3 + Math.floor(h1(k * 3) * 10), r = rad(i), a = (h1(k * 11) - 0.5) * 2.4, C = v3.add(S[i], [0, Math.sin(a) * r * 0.82, Math.cos(a) * r * 0.86]), rr = 10 + h1(k + 2) * 12
    sph(C, rr, MAT.BONE, 0.75, 6, { tex: veins }); sph(v3.add(C, [0, 0, rr * 0.45]), rr * 0.42, MAT.GORE, 0.6, 6) }
  const F = S[N], fd = v3.norm(v3.sub(S[N], S[N - 2])), fr = rad(N), side = v3.norm(v3.cross([0, 0, 1], fd)), up = v3.cross(fd, side)
  /* a point on (or off) the head's surface in the direction (a forward, s side, u up), k radii out */
  const Sf = (a, s, u, k) => v3.add(F, v3.norm(v3.add(v3.add(v3.mul(fd, a), side, s), up, u)), fr * (k == null ? 1 : k))
  if (P.front === 'maw') {
    sph(Sf(1, 0, -0.25, 0.7), fr * 0.42, MAT.GORE, 0.45, 8, { tex: (x, y) => 0.6 + n2(x * 0.4, y * 0.4) * 0.6 })
    const c0 = Sf(1, 0, -0.25, 1)
    for (let k = 0; k < 12; k++) { const a = k * TAU / 12, q = v3.add(v3.add(c0, side, Math.cos(a) * fr * 0.36), up, Math.sin(a) * fr * 0.36); cap(q, v3.add(v3.add(v3.add(q, side, -Math.cos(a) * 11), up, -Math.sin(a) * 11), fd, 5), 3, 0.4, MAT.BONE, 1, 9) }
  } else if (P.front === 'face') {
    sph(Sf(1, 0, -0.5, 0.8), fr * 0.34, MAT.DARK, 0.1, 8)
    for (let k = -3; k <= 3; k++) { const q = Sf(1, k * 0.12, -0.3, 0.98), w = Sf(1, k * 0.11, -0.78, 0.96); cap(q, v3.add(q, up, -10), 3, 0.5, MAT.BONE, 1, 9); cap(w, v3.add(w, up, 8), 2.6, 0.5, MAT.BONE, 1, 9) }
    sph(Sf(1, 0, 0, 1), 11, fm, 0.86, 9, { tex: bzSlime })
    for (const s of [1, -1]) {
      sph(Sf(0.8, s * 0.42, 0.32, 0.98), 12, MAT.BONE, 0.95, 9); sph(Sf(0.8, s * 0.4, 0.32, 1.1), 5, MAT.DARK, 0.1, 9)
      cap(Sf(0.8, s * 0.12, 0.6, 1.02), Sf(0.55, s * 0.7, 0.62, 1.02), 7, 3, fm, 0.66, 9)
      const m0 = Sf(1, s * 0.05, -0.14, 1.06), m1 = Sf(0.75, s * 0.62, -0.22, 1.12), m2 = Sf(0.2, s, 0.1, 1.3); cap(m0, m1, 12, 8, MAT.HAIR, 0.8, 10); cap(m1, m2, 7, 1.5, MAT.HAIR, 0.8, 10)
    }
  } else {
    sph(Sf(1, 0, 0, 0.55), fr * 0.62, MAT.GORE, 0.42, 8, { tex: (x, y) => 0.55 + n2(x * 0.3, y * 0.3) * 0.7 })
    for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + TAU / 8, c = Math.cos(a), s = Math.sin(a), b0 = Sf(1, c * 0.6, s * 0.6, 0.9), m = Sf(1, c * 0.95, s * 0.95, 1.05), tip = v3.add(v3.add(v3.add(F, fd, fr * 1.25), side, c * fr * 1.2), up, s * fr * 1.15 + 12)
      tri(b0, v3.add(m, up, c * 22), tip, fm, 0.7, 10, { tex: bzSlime }); tri(b0, v3.add(m, up, -c * 22), tip, fm, 0.64, 10, { tex: bzSlime })
      for (let j = 0; j < 3; j++) { const q = v3.lerp(b0, tip, 0.3 + j * 0.22); cap(q, v3.add(v3.sub(q, v3.mul(v3.sub(tip, b0), 0)), v3.norm(v3.sub(F, q)), 10), 2.6, 0.4, MAT.BONE, 1, 11) } }
  }
  if (P.tongues) for (const [ty, tx] of [[-90, 150], [10, 210], [100, 140]]) { const P0 = Sf(1, 0, -0.2, 0.8), pts = bzBez(P0, [F[0] + tx * 0.5, ty * 0.3, 70], [F[0] + tx, ty, 4], 9); bzChain(pts, 7, 3, MAT.GORE, 0.6, 12); sph(pts[9], 6, MAT.GORE, 0.6, 12) }
  if (P.stalks) for (const s of [1, -1]) { const b = Sf(0.3, s * 0.55, 0.8, 0.95), pts = bzBez(b, v3.add(b, [6, s * 16, 44]), v3.add(b, [30, s * 34, 58]), 6); bzChain(pts, 7, 4, fm, 0.78, 13, { tex: bzSlime }); sph(pts[6], 6, MAT.EYE, 1, 13) }
  const mb = P.manAt != null ? v3.add(S[P.manAt], [0, 0, rad(P.manAt) * 0.85]) : P.front === 'split' ? Sf(1, 0, -0.35, 0.6) : Sf(-0.15, 0, 1, 0.8)
  bzCountMan(mb, P.ms, P.arms, 20)
}

/* ---------- ROSINE: the moth elf ---------- */
const ROSINE = {
  /* A the elf queen: upright, hovering, wings raised like a butterfly's, arms open */
  A: { hz: 80, lean: 0.05, fore: [112, 0.55, 0.2], hind: [76], arms: [['T', 14, 40, 26], ['T', 14, -40, 26]], feet: [[-2, 8, 28], [-6, -8, 32]] },
  /* B the moth: a furred thorax, a heavy banded abdomen, wings laid open flat to show the eyes, an extra pair of insect arms */
  B: { hz: 94, lean: 0.32, fore: [126, 0.12, 0.12], hind: [88], abd: 1.35, ruff: 1.5, xarms: 1, arms: [['T', 22, 12, 8], ['T', 22, -12, 8]], feet: [[-14, 8, 44], [-18, -8, 48]] },
  /* C the drill: body flat out, arms locked forward into a point, wings swept back tight */
  C: { hz: 62, lean: 1.38, fore: [100, 0.25, 1.15], hind: [70], arms: [['T', 4, 4, 70], ['T', 4, -4, 70]], feet: [[-74, 5, 56], [-78, -5, 60]], drill: 1 },
  /* D the gale: wings thrown up and forward at the top of a beat, arms raised */
  D: { hz: 84, lean: 0.12, fore: [122, 0.95, -0.35], hind: [84], abd: 0.8, arms: [['T', 6, 26, 56], ['T', 6, -26, 56]], feet: [[-4, 8, 34], [-8, -8, 38]] },
}
function bzMothWing(R, s, L, rise, sweep, th0, th1, hind, p) {
  const e1 = v3.norm([-sweep, s * Math.cos(rise), Math.sin(rise)]), g = [-0.5, 0, 1], e2 = v3.norm(v3.sub(g, v3.mul(e1, v3.dot(g, e1)))), n = 9
  const shape = q => (hind ? 0.5 + 0.5 * Math.sin(q * Math.PI) : 0.45 + 0.55 * Math.pow(Math.max(0, Math.sin(q * Math.PI * 0.72)), 1.6))
  const P = (q, r) => { const th = lerp(th0, th1, q), rr = r * L * shape(q); return v3.add(v3.add(R, e1, Math.cos(th) * rr), e2, Math.sin(th) * rr) }
  const sp = hind ? [0.62, 0.5, 0.2] : [0.64, 0.55, 0.15]
  for (let i = 0; i < n; i++) {
    const pat = layer => (x, y, u, v) => {
      const r = u + v, q = (i + (r > 0 ? v / r : 0)) / n; if (r > 1 - 0.015 * Math.abs(Math.sin(q * n * Math.PI))) return -1
      const e = Math.hypot((r - sp[0]) * 1.1, (q - sp[1]) * 1.6), band = Math.abs(r - 0.86) < 0.035, vein = (q * n * 1) % 1 < 0.07
      const k = e < sp[2] * 0.35 ? 3 : e < sp[2] * 0.62 ? 2 : e < sp[2] ? 1 : band || r < 0.16 ? 1 : 0
      if (layer !== k) return -1
      return (vein ? 0.68 : 1) * (0.82 + n2(x * 0.2, y * 0.2) * 0.3) * (layer === 0 ? 0.85 + r * 0.25 : 1)
    }
    const A = P(i / n, 1), B = P((i + 1) / n, 1)
    tri(R, A, B, MAT.LEATHER, 0.8, p, { tex: pat(0) }); tri(R, A, B, MAT.DARK, 0.3, p, { tex: pat(1) }); tri(R, A, B, MAT.BONE, 0.95, p, { tex: pat(2) }); tri(R, A, B, MAT.DARK, 0.2, p, { tex: pat(3) })
  }
}
/* her body is drawn at 1.5x by widening the projection scale (positions and radii together); always restored */
function drawRosine(o) { const u0 = CAM.u; CAM.u = u0 * 1.5; try { rosineBody(o) } finally { CAM.u = u0 } }
function rosineBody(o) {
  const P = o.P || ROSINE[o.v || 'A'], T = torsoF(P.hz, P.lean, 0), sk = MAT.SKIN, ch = MAT.BONE
  for (const s of [1, -1]) { bzMothWing(T(-5, s * 5, 30), s, P.fore[0], P.fore[1], P.fore[2], -0.25, 1.3, 0, 1); bzMothWing(T(-5, s * 5, 22), s, P.hind[0], P.fore[1] - 0.25, P.fore[2] + 0.15, -1.45, -0.2, 1, 2) }
  if (P.abd) { const a = P.abd; for (let k = 0; k < 6; k++) sph(T(-6 - k * 7 * a, 0, -2 - k * 6 * a), (10 - k * 1.2) * a, k % 2 ? MAT.LEATHER : ch, 0.8, 3, { tex: (x, y) => (y % 3 === 0 ? 0.75 : 1) }) }
  P.feet.forEach((f, k) => { const s = k ? -1 : 1, hip = T(0, s * 6, -2), kn = ik3(hip, f, 30, 30, P.drill ? [0, s * 0.2, 1] : [1, 0, 0]); cap(hip, kn, 5, 3.4, ch, 0.86, s > 0 ? 4 : 5); cap(kn, f, 3.4, 1, ch, 0.86, s > 0 ? 4 : 5) })
  sph(T(0, 0, 0), 8, ch, 0.86, 6); cap(T(0, 0, 3), T(1, 0, 22), 5.6, 7.6, ch, 0.86, 6, { tex: (x, y) => (y % 4 === 0 ? 0.78 : 1) }); sph(T(1, 0, 26), 8.6, ch, 0.88, 6)
  const rf = P.ruff || 1; sph(T(-3, 0, 31), 9.5 * rf, MAT.BONE, 0.95, 7, { tex: (x, y, dx, dy) => (dx * dx + dy * dy > 0.6 && h2(x, y) < 0.5 ? -1 : 0.85 + h2(x, y) * 0.2) })
  const H = T(3, 0, 41); cap(T(1, 0, 30), H, 3.4, 3.2, sk, 0.9, 8); sph(H, 7, sk, 0.92, 8)
  sph(v3.add(H, [-2, 0, 1.5]), 7.2, MAT.GHOST, 0.85, 9, { tex: (x, y, dx, dy) => (dy > 0.25 && dx > -0.2 ? -1 : 0.85 + h2(x, y) * 0.2) })
  for (let k = 0; k < 5; k++) cap(v3.add(H, [-4, (k - 2) * 2.4, -1]), v3.add(H, [-11 - k % 2 * 3, (k - 2) * 4, -18 - h1(k) * 8]), 2, 0.5, MAT.GHOST, 0.85, 9)
  for (const s of [1, -1]) {
    sph(v3.add(H, [5, s * 2.6, 0.6]), P.xarms ? 2.6 : 2, MAT.DARK, 0.1, 10); sph(v3.add(H, [5.6, s * 2.2, 1.4]), 0.6, MAT.EYE, 1, 10)
    cap(v3.add(H, [0, s * 6, 0.5]), v3.add(H, [-3, s * 12, 5]), 1.6, 0.3, sk, 0.9, 10)
    const ant = bzBez(v3.add(H, [3, s * 2, 6]), v3.add(H, [6, s * 14, 26]), v3.add(H, [-8, s * 30, 44]), 8); bzChain(ant, 0.9, 0.5, MAT.DARK, 0.3, 11)
    for (let k = 2; k < 8; k++) { const q = ant[k], d = v3.norm(v3.sub(ant[k + 1], q)), w = v3.norm(v3.cross(d, [0, 0, 1])); for (const z of [1, -1]) cap(q, v3.add(v3.add(q, w, z * (5 - Math.abs(k - 5) * 0.8)), d, 2), 0.5, 0.3, MAT.DARK, 0.3, 11) }
  }
  P.arms.forEach((a, k) => { const s = k ? -1 : 1, S = T(1, s * 9, 31), Hh = bzAt(T, a), E = ik3(S, Hh, 18, 17, [-0.5, s, -0.4]), q = s > 0 ? 12 : 13
    cap(S, E, 3.4, 2.6, sk, 0.9, q); cap(E, Hh, 2.6, 1.8, sk, 0.9, q); for (let i = -1; i <= 1; i++) cap(Hh, v3.add(v3.add(Hh, v3.norm(v3.sub(Hh, E)), 9), [0, i * 2, 0]), 0.9, 0.3, ch, 0.95, q) })
  if (P.xarms) for (const s of [1, -1]) { const S = T(4, s * 6, 14), E = v3.add(S, [14, s * 12, -6]), Hh = v3.add(E, [12, s * 2, -14]); cap(S, E, 2.2, 1.6, ch, 0.85, 14); cap(E, Hh, 1.6, 0.6, ch, 0.85, 14) }
  if (P.drill) for (let k = 0; k < 5; k++) { const c = T(4, 0, 50 + k * 14), r = 30 - k * 5; for (let j = 0; j < 10; j++) { const a0 = j * TAU / 10 + k, a1 = a0 + 0.42; cap(v3.add(c, [Math.cos(a0) * r * 0.6, Math.sin(a0) * r, 0]), v3.add(c, [Math.cos(a1) * r * 0.6, Math.sin(a1) * r, 4]), 0.9, 0.9, MAT.SMEAR, 0.9, 15) } }
}

/* registry: game sprite scale and box (figure units), the pose used between moves, the ground shadow (px) */
const BOSS = {
  zodd: { draw: drawZodd, sc: 0.62, box: [640, 720, 0.8], idle: 'A', shadow: 30 },
  grunbeld: { draw: drawGrunbeld, sc: 0.56, box: [820, 820, 0.78], idle: 'B', shadow: 46 },
  count: { draw: drawCount, sc: 0.58, box: [760, 560, 0.72], idle: 'B', shadow: 44 },
  rosine: { draw: drawRosine, sc: 0.72, box: [520, 520, 0.86], idle: 'A', shadow: 20 },
}

/* ---------- telegraphs: shapes on the ground (px), value 1 inside, 3 on a marking; each carries a bounding box ---------- */
const bb = (f, b) => ((f.bb = b), f)
const SHP = {
  circle: (cx, cy, r) => bb((X, Y) => (Math.hypot(X - cx, Y - cy) < r ? 1 : 0), [cx - r, cy - r, cx + r, cy + r]),
  ring: (cx, cy, r0, r1) => bb((X, Y) => { const d = Math.hypot(X - cx, Y - cy); return d > r0 && d < r1 ? 1 : 0 }, [cx - r1, cy - r1, cx + r1, cy + r1]),
  /* the box hugs the arc (sampled), so the rasteriser only visits the wedge */
  sector: (cx, cy, ang, hw, r0, r1) => { const xs = [], ys = []; for (let i = 0; i <= 12; i++) { const a = ang - hw + (2 * hw * i) / 12; for (const r of [r0, r1]) { xs.push(cx + Math.cos(a) * r); ys.push(cy + Math.sin(a) * r) } }
    return bb((X, Y) => { const dx = X - cx, dy = Y - cy, d = Math.hypot(dx, dy); if (d < r0 || d > r1) return 0; return Math.abs(angDiff(ang, Math.atan2(dy, dx))) < hw ? 1 : 0 }, [Math.min(...xs) - 2, Math.min(...ys) - 2, Math.max(...xs) + 2, Math.max(...ys) + 2]) },
  /* a lane along ang with chevrons every chev px pointing the way it will be travelled */
  lane: (x0, y0, ang, L, hw, chev) => { const c = Math.cos(ang), s = Math.sin(ang), x1 = x0 + c * L, y1 = y0 + s * L
    return bb((X, Y) => { const dx = X - x0, dy = Y - y0, a = dx * c + dy * s, b = -dx * s + dy * c; if (a < 0 || a > L || Math.abs(b) > hw) return 0
      if (chev) { const m = (a - Math.abs(b) * 0.9) % chev; if (a > chev * 0.5 && a < L - chev * 0.3 && Math.abs(b) < hw * 0.62 && m > 0 && m < chev * 0.22) return 3 } return 1 }, [Math.min(x0, x1) - hw, Math.min(y0, y1) - hw, Math.max(x0, x1) + hw, Math.max(y0, y1) + hw]) },
  path: (pts, hw) => bb((X, Y) => { let m = 1e9; for (let i = 0; i + 1 < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], vx = x1 - x0, vy = y1 - y0, t = clamp(((X - x0) * vx + (Y - y0) * vy) / (vx * vx + vy * vy || 1), 0, 1); m = Math.min(m, Math.hypot(X - x0 - vx * t, Y - y0 - vy * t)) } return m < hw ? 1 : 0 },
    [Math.min(...pts.map(p => p[0])) - hw, Math.min(...pts.map(p => p[1])) - hw, Math.max(...pts.map(p => p[0])) + hw, Math.max(...pts.map(p => p[1])) + hw]),
  /* parts whose box misses the point are skipped, which keeps big unions of small shapes cheap to rasterise */
  union: (...fs) => bb((X, Y) => { let r = 0; for (const f of fs) { const b = f.bb; if (X < b[0] || X > b[2] || Y < b[1] || Y > b[3]) continue; const v = f(X, Y); if (v === 3) return 3; if (v === 1) r = 1; else if (v === 2 && !r) r = 2 } return r }, [Math.min(...fs.map(f => f.bb[0])), Math.min(...fs.map(f => f.bb[1])), Math.max(...fs.map(f => f.bb[2])), Math.max(...fs.map(f => f.bb[3]))]),
  later: f => bb((X, Y) => { const v = f(X, Y); return v === 1 ? 2 : v }, f.bb),
}
const inside = (sh, x, y) => { const v = sh(x, y); return v === 1 || v === 3 }

/* ---------- moves: every design take is one move. a plan is ordered stages {t, sh, dmg, kb, label, on};
   the next stage to land is drawn solid, the ones after it faint. TS turns the designer's units into px. ---------- */
const TS = 0.5
const at = (e, a, r) => [e.x + Math.cos(a) * r, e.y + Math.sin(a) * r]
const BMOVE = {
  zodd: {
    /* A: lowers his head and charges down a chevron lane, then skids out past the end */
    A: { near: 0.5, far: 3, plan: (g, e, a, d) => { const L = d + 70, end = at(e, a, L); return { dur: 1.9, st: [{ t: 1, sh: SHP.lane(e.x, e.y, a, L, 21, 18), dmg: 22, kb: 220 }],
      upd: (g2, e2, t) => { if (t > 1 && t < 1.45) { const k = (t - 1) / 0.45; e2.x = lerp(e2.ax, end[0], k); e2.y = lerp(e2.ay, end[1], k) } else if (t >= 1.45 && t < 1.7) { e2.x += Math.cos(a) * 40 * (1.7 - t) * 0.06; e2.y += Math.sin(a) * 40 * (1.7 - t) * 0.06 } } } } },
    /* B: leaps out of sight; a crosshair hunts you, locks, and he lands with a shockwave */
    B: { near: 0.5, far: 2, track: 1.3, plan: (g, e) => { const cross = (X, Y) => (Math.abs(X - e.tx) < 2 && Math.abs(Y - e.ty) < 28) || (Math.abs(Y - e.ty) < 3 && Math.abs(X - e.tx) < 28) ? 3 : 0
      return { dur: 2.3, st: [{ t: 1.7, sh: SHP.union(bb(cross, [e.tx - 30, e.ty - 30, e.tx + 30, e.ty + 30]), SHP.circle(e.tx, e.ty, 36)), dmg: 26, kb: 160, on: (g2, e2) => { e2.x = e2.tx; e2.y = e2.ty; e2.z = 0; g2.shake = 8 } }, { t: 2, sh: SHP.ring(e.tx, e.ty, 36, 69), dmg: 14, kb: 140 }],
        upd: (g2, e2, t) => { e2.z = t < 1.7 ? Math.sin(Math.min(1, t / 1.6) * Math.PI) * 120 + (t > 0.8 && t < 1.6 ? 40 : 0) : 0 } } } },
    /* C: drops to all fours and gores forward through a cone */
    C: { near: 3, far: 0.5, plan: (g, e, a) => ({ dur: 1.3, st: [{ t: 0.85, sh: SHP.sector(e.x, e.y, a, 0.55, 15, 165), dmg: 20, kb: 240 }], upd: (g2, e2, t) => { if (t > 0.85 && t < 1) { e2.x += Math.cos(a) * 4; e2.y += Math.sin(a) * 4 } } }) },
    /* D: spins his blade in a wide ring; the only safe ground is right at his feet */
    D: { near: 3, far: 0.5, plan: (g, e) => ({ dur: 1.5, st: [{ t: 1, sh: SHP.ring(e.x, e.y, 35, 125), dmg: 18, kb: 170 }] }) },
  },
  grunbeld: {
    /* A: fire breath swept across two cones, one after the other */
    A: { near: 2, far: 1.5, plan: (g, e, a) => ({ dur: 1.9, st: [{ t: 1, sh: SHP.sector(e.x, e.y, a, 0.26, 30, 190), dmg: 16, fire: 1 }, { t: 1.5, sh: SHP.sector(e.x, e.y, a + 0.52, 0.26, 30, 190), dmg: 16, fire: 1 }] }) },
    /* B: crystal spikes burst out along the four diagonals, near ones first */
    B: { near: 1, far: 2, plan: (g, e) => { const cell = rg => { const C = []; for (let k = 0; k < 4; k++) { const an = Math.PI / 4 + (k * Math.PI) / 2; for (let j = rg ? 3 : 0; j < (rg ? 8 : 3); j++) { const r = 75 + j * 28, x = e.x + Math.cos(an) * r, y = e.y + Math.sin(an) * r, ca = Math.cos(an), sa = Math.sin(an)
          C.push(bb((X, Y) => { const dx = X - x, dy = Y - y; return Math.abs(dx * ca + dy * sa) / 15 + Math.abs(-dx * sa + dy * ca) / 11 < 1 ? 1 : 0 }, [x - 16, y - 16, x + 16, y + 16])) } }
        return SHP.union(...C) }
      return { dur: 1.9, st: [{ t: 1, sh: cell(0), dmg: 18 }, { t: 1.5, sh: cell(1), dmg: 18 }] } } },
    /* C: a 270 degree tail sweep behind and around him, then a bite into the wedge in front */
    C: { near: 3, far: 0.2, plan: (g, e, a) => ({ dur: 1.8, st: [{ t: 0.9, sh: SHP.sector(e.x, e.y, a + Math.PI, Math.PI * 0.75, 25, 150), dmg: 18, kb: 220 }, { t: 1.4, sh: SHP.sector(e.x, e.y, a, 0.35, 0, 110), dmg: 24 }] }) },
    /* D: lobs five globs of fire into numbered circles round you; each leaves the ground burning */
    D: { near: 0.5, far: 3, plan: (g, e) => { const P = [[12, 17], [60, -5], [-30, -20], [35, 60], [-40, 45]].map(([x, y]) => [g.p.x + x, g.p.y + y])
      return { dur: 2.6, st: P.map((p, i) => ({ t: 1 + i * 0.3, sh: SHP.circle(p[0], p[1], 22), dmg: 16, label: String(i + 1), lx: p[0], ly: p[1], on: g2 => g2.fx.push({ kind: 'bfire', x: p[0], y: p[1], rad: 24, t: 0, d: 3, tick: 0, dmg: 5 }) })) } } },
  },
  count: {
    /* A: rears up and slams down at the end of a lane */
    A: { near: 3, far: 1, plan: (g, e, a, d) => { const L = d + 10, end = at(e, a, L); return { dur: 1.7, st: [{ t: 1.1, sh: SHP.union(SHP.lane(e.x, e.y, a, L, 45, 0), SHP.circle(end[0], end[1], 45)), dmg: 24, kb: 200, on: (g2, e2) => { g2.shake = 9 } }],
      upd: (g2, e2, t) => { if (t > 1.1 && t < 1.3) { const k = (t - 1.1) / 0.2; e2.x = lerp(e2.ax, end[0], k * 0.7); e2.y = lerp(e2.ay, end[1], k * 0.7) } } } } },
    /* B: spits a fan of bile down five lanes */
    B: { near: 1, far: 2.5, plan: (g, e, a) => { const o = at(e, a, 45), ks = [-2, -1, 0, 1, 2]; return { dur: 1.4, st: [{ t: 0.9, sh: SHP.union(...ks.map(k => SHP.lane(o[0], o[1], a + k * 0.24, 190, 7, 0))), dmg: 0,
      on: g2 => { for (const k of ks) { const an = a + k * 0.24; g2.eb.push({ x: o[0], y: o[1], vx: Math.cos(an) * 170, vy: Math.sin(an) * 170, life: 1.15, r: 6, dmg: 12, kind: 'bile' }) } } }] } } },
    /* C: tongues lash out at three spots, one of them you; get caught and you're dragged to his maw */
    C: { near: 0.5, far: 2.5, plan: (g, e, a) => { const o = at(e, a, 40), tg = [[g.p.x, g.p.y], at(e, a - 0.6, 150), at(e, a + 0.65, 130)]
      return { dur: 1.5, st: [{ t: 1, sh: SHP.union(...tg.map(t => SHP.union(SHP.lane(o[0], o[1], Math.atan2(t[1] - o[1], t[0] - o[0]), Math.hypot(t[0] - o[0], t[1] - o[1]), 5, 0), SHP.circle(t[0], t[1], 15)))), dmg: 10,
        hit: (g2, e2) => { const p = g2.p, dx = o[0] - p.x, dy = o[1] - p.y, l = Math.hypot(dx, dy) || 1, go = Math.max(0, l - 30); p.dash = { vx: (dx / l) * go / 0.35, vy: (dy / l) * go / 0.35, t: 0.35 } } }] } } },
    /* D: births two rings of acid brood; the puddles slow you and burn */
    D: { near: 2, far: 1.5, plan: (g, e) => { const ring = (n, r, off) => Array.from({ length: n }, (_, k) => at(e, (k * TAU) / n + off, r)), R1 = ring(7, 88, 0.3), R2 = ring(11, 145, 0)
      const pud = P => g2 => { for (const p of P) g2.fx.push({ kind: 'acid', x: p[0], y: p[1], rad: 19, t: 0, d: 6, tick: 0, dmg: 4 }) }
      return { dur: 2, st: [{ t: 1, sh: SHP.union(...R1.map(p => SHP.circle(p[0], p[1], 19))), dmg: 8, on: pud(R1) }, { t: 1.6, sh: SHP.union(...R2.map(p => SHP.circle(p[0], p[1], 19))), dmg: 8, on: pud(R2) }] } } },
  },
  rosine: {
    /* A: corkscrews toward you along an S-curve */
    A: { near: 1, far: 2.5, plan: (g, e, a, d) => { const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24, al = t * (d + 60), sd = Math.sin(t * TAU) * 35 * (1 - t * 0.3); pts.push([e.x + Math.cos(a) * al - Math.sin(a) * sd, e.y + Math.sin(a) * al + Math.cos(a) * sd]) }
      return { dur: 1.8, st: [{ t: 0.9, sh: SHP.path(pts, 14), dmg: 18, kb: 120 }], upd: (g2, e2, t) => { if (t > 0.9 && t < 1.5) { const k = Math.min(23.999, ((t - 0.9) / 0.6) * 24), i = Math.floor(k), f = k - i; e2.x = lerp(pts[i][0], pts[i + 1][0], f); e2.y = lerp(pts[i][1], pts[i + 1][1], f) } } } } },
    /* B: shakes out a cloud of scale-dust round you that slows, with a core that burns */
    B: { near: 2, far: 2, plan: (g, e) => { const x = g.p.x, y = g.p.y, cloud = bb((X, Y) => { const dx = X - x, dy = Y - y, r = Math.hypot(dx, dy), an = Math.atan2(dy, dx); return r < 28 ? 1 : r < 62 + 15 * Math.sin(an * 3 + 1) + 9 * Math.sin(an * 5) ? 2 : 0 }, [x - 90, y - 90, x + 90, y + 90])
      return { dur: 1.3, st: [{ t: 0.9, sh: cloud, dmg: 6, on: g2 => g2.fx.push({ kind: 'dust', x, y, rad: 62, core: 28, t: 0, d: 4.5, tick: 0, dmg: 6 }) }] } } },
    /* C: three numbered drill dashes, the last one aimed back at you */
    C: { near: 1, far: 2.5, plan: (g, e, a, d) => { const L1 = d + 45, p1 = at(e, a, L1), a2 = a + 2.4, L2 = Math.min(130, d * 0.75), p2 = [p1[0] + Math.cos(a2) * L2, p1[1] + Math.sin(a2) * L2], a3 = Math.atan2(g.p.y - p2[1], g.p.x - p2[0]) - 0.15
      const legs = [[e.x, e.y, a, L1], [p1[0], p1[1], a2, L2], [p2[0], p2[1], a3, 160]]
      return { dur: 2.3, st: legs.map((l, i) => ({ t: 0.8 + i * 0.45, sh: SHP.lane(l[0], l[1], l[2], l[3], 12, 15), dmg: 16, kb: 140, label: String(i + 1), lx: l[0] + Math.cos(l[2]) * Math.min(60, l[3] / 2), ly: l[1] + Math.sin(l[2]) * Math.min(60, l[3] / 2) })),
        upd: (g2, e2, t) => { for (let i = 0; i < 3; i++) { const t0 = 0.8 + i * 0.45 - 0.25; if (t > t0 && t < t0 + 0.25) { const k = (t - t0) / 0.25, l = legs[i]; e2.x = l[0] + Math.cos(l[2]) * l[3] * k; e2.y = l[1] + Math.sin(l[2]) * l[3] * k } } } } } },
    /* D: beats up gales into two wedges on either side; the centre lane is safe */
    D: { near: 3, far: 0.3, plan: (g, e, a) => ({ dur: 1.5, st: [{ t: 1, sh: SHP.union(SHP.sector(e.x, e.y, a + 0.8, 0.5, 20, 165), SHP.sector(e.x, e.y, a - 0.8, 0.5, 20, 165)), dmg: 12, kb: 260 }] }) },
  },
}
/* the apostle brain: close in, pick a move by range and phase, telegraph it, land each stage, recover.
   below 40% hp everything runs faster and moves chain into each other */
function apostleAI(g, e, dt, dx, dy, dist) {
  const A = e.ai, M = BMOVE[e.type], low = e.hp / e.maxHp < 0.4, rate = low ? 1.35 : 1
  if (e.stagger > 0) { e.stagger -= dt; e.walking = false; return }
  if (!A.plan) {
    e.pose = BOSS[e.type].idle; A.cd = (A.cd == null ? 1.2 : A.cd) - dt
    e.walking = dist > 80; if (e.walking) { e.x += (dx / dist) * e.spd * dt; e.y += (dy / dist) * e.spd * dt; e.face = Math.atan2(dy, dx) }
    if (A.cd > 0) return
    const ks = Object.keys(M).filter(k => k !== A.last || g.R() < 0.25), w = ks.map(k => (dist < 120 ? M[k].near : M[k].far) * (low && (k === 'B' || k === 'D') ? 1.5 : 1))
    let x = g.R() * w.reduce((s, v) => s + v, 0), i = 0; while (i < w.length - 1 && (x -= w[i]) > 0) i++
    startMove(g, e, ks[i]); return
  }
  const P = A.plan; A.t += dt * rate
  /* the dive's crosshair keeps hunting you until it locks */
  if (M[A.k].track && A.t < M[A.k].track && (A.tr = (A.tr || 0) - dt) <= 0) { A.tr = 0.1; e.tx = g.p.x; e.ty = g.p.y; const np = M[A.k].plan(g, e, e.face, dist); P.st = np.st.map((s, i) => Object.assign(s, { done: P.st[i].done })); buildTel(e) }
  if (P.upd) P.upd(g, e, A.t)
  let changed = false
  for (const s of P.st) if (!s.done && A.t >= s.t) {
    s.done = true; changed = true
    if (s.sh && s.dmg && inside(s.sh, g.p.x, g.p.y)) { if (s.kb) { const l = Math.hypot(g.p.x - e.x, g.p.y - e.y) || 1; g.p.dash = { vx: ((g.p.x - e.x) / l) * s.kb, vy: ((g.p.y - e.y) / l) * s.kb, t: 0.18 } } g.hurt(s.dmg, e); if (s.hit) s.hit(g, e) }
    if (s.fire) for (let k = 0; k < 4; k++) { const an = e.face + (g.R() - 0.5) * 0.5, r = 60 + k * 35; g.fx.push({ kind: 'bfire', x: e.x + Math.cos(an) * r, y: e.y + Math.sin(an) * r, rad: 20, t: 0, d: 1.6, tick: 0, dmg: 4 }) }
    if (s.on) s.on(g, e)
  }
  if (changed) buildTel(e)
  if (A.t >= P.dur) { A.plan = null; e.tel = null; e.z = 0; A.cd = low ? (g.R() < 0.5 ? 0.15 : 0.6) : 1 + g.R() * 0.8 }
}
function startMove(g, e, k) {
  const A = e.ai, dx = g.p.x - e.x, dy = g.p.y - e.y, a = Math.atan2(dy, dx)
  A.last = k; A.k = k; A.t = 0; e.ax = e.x; e.ay = e.y; e.tx = g.p.x; e.ty = g.p.y; e.pose = k; e.face = a
  A.plan = BMOVE[e.type][k].plan(g, e, a, Math.hypot(dx, dy)); A.plan.st.forEach(s => (s.done = false)); buildTel(e)
}
/* ---------- animation: a pose is two takes blended numerically, then nudged per frame (stride, gait, undulation,
   wing beat, anticipation, recoil, collapse). every frame is baked once into the sprite cache. ---------- */
const TAKES = { zodd: ZODD, grunbeld: GRUN, count: COUNT, rosine: ROSINE }
const clone = o => JSON.parse(JSON.stringify(o))
/* numbers and matching arrays interpolate; a hand target that switches frame ('T' torso to 'W' world) or any flag flips at the midpoint */
function blendP(a, b, k) {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * k
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && (typeof a[0] !== 'string' || a[0] === b[0]) ? a.map((v, i) => blendP(v, b[i], k)) : k < 0.5 ? a : b
  if (a && b && typeof a === 'object' && typeof b === 'object') { const o = {}; for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) o[key] = key in a && key in b ? blendP(a[key], b[key], k) : k < 0.5 ? a[key] : b[key]; return o }
  return k < 0.5 ? a : b
}
const bzStep = (q, i, dx, dz) => { q[i][0] += dx; q[i][2] += dz }
const ANIM = {
  /* zodd stomps: alternating strides with a heavy bob; in the air his wings beat */
  zodd: { lean: 'lean', loco: (P, ph) => { const s = Math.sin(ph), c = Math.cos(ph); bzStep(P.feet, 0, s * 40, Math.max(0, c) * 26); bzStep(P.feet, 1, -s * 40, Math.max(0, -c) * 26); P.hz -= 12 * Math.abs(c); P.tw += 0.14 * s; P.lean += 0.05 * Math.abs(s); P.wing[1] += 0.05 * Math.sin(ph * 2) },
    air: (P, ph) => { P.wing[1] += 0.45 * Math.sin(ph); P.wing[0] += 0.12 * Math.cos(ph) }, sink: (P, k) => { P.hz -= 64 * k; P.lean += 0.95 * k; P.tw += 0.4 * k; P.wing[1] -= 0.6 * k; P.wing[0] -= 0.4 * k } },
  /* grunbeld lumbers on a diagonal gait, the head and tail swinging against it */
  grunbeld: { lean: 'pitch', loco: (P, ph) => { const s = Math.sin(ph), c = Math.cos(ph); bzStep(P.hf, 0, s * 32, Math.max(0, c) * 26); bzStep(P.ff, 1, s * 32, Math.max(0, c) * 26); bzStep(P.hf, 1, -s * 32, Math.max(0, -c) * 26); bzStep(P.ff, 0, -s * 32, Math.max(0, -c) * 26); P.hip[2] += 8 * Math.abs(s); P.head[2] += 7 * Math.sin(ph * 2); P.tail[0][1] += 22 * s; P.tail[1][1] += 44 * s },
    sink: (P, k) => { P.hip[2] -= 46 * k; P.pitch *= 1 - k; P.neck[2] -= 90 * k; P.head[2] -= 130 * k; P.ff.forEach(f => (f[0] += 30 * k)) } },
  /* the count crawls in waves rolling down the slug, the body pulsing */
  count: { loco: (P, ph) => { P.sp.forEach((q, i) => { q[2] += Math.sin(ph + i * 1.6) * 16; q[1] += Math.sin(ph + i * 1.2) * 18 }); P.rf += Math.sin(ph) * 7 },
    rear: (P, k) => { P.sp[2][2] += 30 * k }, sink: (P, k) => { P.sp.forEach(q => (q[2] *= 1 - k * 0.45)); P.rf -= 8 * k } },
  /* rosine hovers on a constant wing beat */
  rosine: { lean: 'lean', loco: (P, ph) => { P.fore[1] += 0.6 * Math.sin(ph); P.fore[2] += 0.25 * Math.cos(ph); P.hz += 8 * Math.sin(ph) }, sink: (P, k) => { P.hz -= 24 * k; P.lean += 0.45 * k; P.fore[1] -= 0.3 * k } },
}
/* frames per anim: walk 4, idle 2 (breath), each move 4 (wind-up, wound, strike, recover), hurt 1, stagger 1, death 3 */
const BFRAMES = { walk: 4, idle: 2, A: 4, B: 4, C: 4, D: 4, hurt: 1, stagger: 1, death: 3 }
function bossPose(type, anim, k) {
  const T = TAKES[type], X = ANIM[type], idle = T[BOSS[type].idle], L = X.lean
  const lean = (P, d) => { if (L) P[L] += d; else if (X.rear) X.rear(P, -d * 3) }, jaw = (P, d) => { if ('jaw' in P) P.jaw += d; else if ('rf' in P) P.rf += d * 20 }
  let P
  if (anim === 'walk') { P = clone(idle); X.loco(P, (k / 4) * TAU) }
  else if (anim === 'idle') { P = clone(idle); X.loco(P, k ? 0.5 : -0.3); lean(P, 0.03 * k); jaw(P, 0.08 * k) }
  else if (anim === 'hurt' || anim === 'stagger') { P = clone(idle); lean(P, anim === 'hurt' ? -0.26 : -0.4); if (anim === 'stagger') X.sink(P, 0.25) }
  else if (anim === 'death') { P = clone(idle); X.sink(P, (k + 1) / 3); lean(P, -0.1 * k) }
  else {
    const M = T[anim]
    if (k === 0) { P = clone(blendP(idle, M, 0.5)); lean(P, -0.1) }
    else if (k === 1) { P = clone(M); lean(P, -0.16); if (X.rear) X.rear(P, 0.6) }
    else if (k === 2) { P = clone(M); lean(P, 0.12); jaw(P, 0.3) }
    else P = clone(blendP(M, idle, 0.45))
    if (type === 'zodd' && anim === 'B') X.air(P, (k / 4) * TAU)
  }
  return P
}
/* which frame an apostle shows right now: its move's phase, a flinch or stagger, a walk, or idle breath */
function bossFrame(e, rt) {
  const A = e.ai
  if (A.plan) { const t0 = (A.plan.st[0] || { t: 0.8 }).t, t = A.t, hit = A.plan.st.some(s => t >= s.t && t < s.t + 0.22); return [A.k, hit ? 2 : t < t0 * 0.5 ? 0 : t < t0 ? 1 : 3] }
  if (e.stagger > 0) return ['stagger', 0]
  if (e.flinch > 0) return ['hurt', 0]
  if (e.walking) return ['walk', Math.floor(e.anim) & 3]
  return ['idle', Math.floor(rt * 1.4 + e.ph) & 1]
}
/* the telegraph on show: the next stage solid, any after it faint, plus their number labels */
function buildTel(e) {
  const st = e.ai.plan.st.filter(s => !s.done && s.sh); if (!st.length) { e.tel = null; return }
  const t0 = st[0].t, parts = st.map(s => (s.t <= t0 + 0.01 ? s.sh : SHP.later(s.sh)))
  e.tel = { ver: (e.tel ? e.tel.ver : 0) + 1, sh: parts.length > 1 ? SHP.union(...parts) : parts[0], labels: st.filter(s => s.label).map(s => [s.lx, s.ly, s.label]) }
}
