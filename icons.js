/* card icons: little 3d objects built from the same primitives, shaded golden, rasterised once into data urls */
const blade = (B, d, bloody) => dragonslayer(B, v3.norm(d), v3.norm(v3.cross(v3.norm(d), eyeLocal())), bloody ? 2 : 0)
const knife = (B, d, L) => { const D2 = v3.norm(d); cap(v3.add(B, D2, -5), B, 1.6, 1.6, MAT.LEATHER, 0.7, 2); cap(B, v3.add(B, D2, L), 2.2, 0.5, MAT.STEEL, 1, 3) }
const bomb = () => { sph([0, 0, 16], 15, MAT.IRON, 0.55, 1, { tex: grime(0.2, 0.2) }); cap([3, 0, 30], [6, 3, 40], 1.4, 1, MAT.WOOD, 0.8, 2); sph([6, 3, 42], 3, MAT.EYE, 1, 3) }
const meat = () => { sph([0, 0, 18], 14, MAT.LEATHER, 0.8, 1, { sq: 0.8, tex: grime(0.2, 0.3) }); cap([8, 0, 24], [20, 2, 36], 2.6, 2.2, MAT.BONE, 0.9, 2); sph([21, 2, 38], 3.4, MAT.BONE, 0.9, 2) }
const coins = (n, z) => { for (let k = 0; k < n; k++) disc([(h1(k) - 0.5) * 18, (h1(k + 9) - 0.5) * 18, z + k * 1.6], 5, MAT.EYE, 0.9, 4, 0) }
const ICON = {
  sweep: { u: 0.4, d: () => blade([-14, 6, 4], [0.5, -0.3, 0.8]) },
  cleave: { u: 0.4, d: () => blade([-14, 6, 4], [0.6, -0.2, 0.75], 1) },
  lunge: { u: 0.38, d: () => { blade([-34, 0, 30], [1, 0, 0.12]); for (let k = 0; k < 3; k++) cap([-40, -8 + k * 8, 20 + k * 6], [-20, -8 + k * 8, 20 + k * 6], 0.8, 0.5, MAT.SMEAR, 1, 9) } },
  beast: { u: 0.9, oy: 0.62, d: () => beastHelm([0, 0, 18], 1) },
  knives: { u: 1.1, d: () => { for (let k = -1; k <= 1; k++) knife([0, k * 3, 4], [0.3, k * 0.5, 1], 18) } },
  bolts: { u: 0.9, d: () => { cap([-14, 0, 14], [14, 0, 18], 2.2, 1.8, MAT.WOOD, 0.8, 1); cap([10, -14, 18], [10, 14, 18], 1.4, 1.4, MAT.STEEL, 0.9, 2); cap([-6, 0, 20], [18, 0, 21], 0.8, 0.5, MAT.IRON, 0.9, 3) } },
  cannon: { u: 0.85, d: () => { cap([-14, 0, 10], [8, 0, 18], 6, 5, MAT.IRON, 0.7, 1, { tex: (x, y, t) => (Math.floor(t * 5) % 2 ? 0.75 : 1) }); cap([8, 0, 18], [20, 0, 22], 4.2, 4.2, MAT.IRON, 0.55, 2); sph([21, 0, 22.5], 2.6, MAT.DARK, 0.1, 3) } },
  bombs: { u: 0.85, d: bomb },
  evo_salamander: { u: 0.8, d: () => { bomb(); for (let k = 0; k < 5; k++) sph([(h1(k) - 0.5) * 22, (h1(k + 3) - 0.5) * 10, 4 + k * 3], 4 - k * 0.5, MAT.EYE, 1, 5) } },
  puck: { u: 1.5, oy: 0.82, d: () => drawPuck({ t: 0.3 }) },
  might: { u: 0.95, d: () => { sph([0, 0, 14], 9, MAT.IRON, 0.7, 1); for (let k = 0; k < 4; k++) cap([6, -5 + k * 3.3, 18], [9, -5 + k * 3.3, 12], 1.8, 1.8, MAT.IRON, 0.8, 2); cap([-4, 0, 6], [-12, 0, -2], 6, 5, MAT.IRON, 0.6, 1) } },
  haste: { u: 0.85, d: () => { cap([0, 0, 22], [0, 0, 12], 9, 0.8, MAT.SMEAR, 0.8, 1); cap([0, 0, 12], [0, 0, 2], 0.8, 9, MAT.SMEAR, 0.8, 1); sph([0, 0, 6], 5, MAT.BONE, 0.9, 2, { sq: 0.6 }); for (const s of [-1, 1]) cap([s * 9, s * 2, 0], [s * 9, s * 2, 24], 1.2, 1.2, MAT.WOOD, 0.8, 3); disc([0, 0, 24], 11, MAT.WOOD, 0.8, 3, 0); disc([0, 0, 0], 11, MAT.WOOD, 0.8, 3, 0) } },
  plate: { u: 0.85, d: () => { sph([0, 0, 14], 13, MAT.ARMOR, 0.7, 1, { sq: 0.95, tex: (x, y) => (y % 4 === 0 ? 0.7 : 1) }); cap([0, -12, 4], [0, 12, 4], 2, 2, MAT.LEATHER, 0.8, 2) } },
  vigor: { u: 0.95, d: () => { sph([0, -4.5, 16], 7, MAT.BLOOD, 0.9, 1); sph([0, 4.5, 16], 7, MAT.BLOOD, 0.9, 1); tri([0, -11, 14], [0, 11, 14], [0, 0, 0], MAT.BLOOD, 0.85, 1, { n: [1, 0, 0.2] }) } },
  reach: { u: 0.42, d: () => { blade([-16, 0, 4], [0.7, -0.1, 0.7]); for (let k = 0; k < 6; k++) { const a = -0.4 + k * 0.28; cap([Math.cos(a) * 60, Math.sin(a) * 60, 30], [Math.cos(a + 0.26) * 60, Math.sin(a + 0.26) * 60, 30], 1.4, 1.4, MAT.SMEAR, 1, 9) } } },
  magnet: { u: 0.9, d: () => { sph([0, 0, 12], 11, MAT.LEATHER, 0.75, 1, { tex: grime(0.2, 0.2) }); cap([0, 0, 22], [0, 0, 26], 3, 4, MAT.LEATHER, 0.7, 2); coins(4, 1) } },
  stride: { u: 0.85, d: () => { cap([-4, 0, 30], [-2, 0, 8], 5, 5, MAT.LEATHER, 0.7, 1); cap([-3, 0, 5], [14, 0, 2], 5, 3.4, MAT.LEATHER, 0.75, 2); sph([-6, 0, 4], 4.6, MAT.LEATHER, 0.65, 2); cap([-3, -5, 26], [-3, 5, 26], 1.4, 1.4, MAT.IRON, 0.9, 3) } },
  regen: { u: 1, d: () => { for (let k = 0; k < 9; k++) sph([(h1(k) - 0.5) * 20, (h1(k + 4) - 0.5) * 20, 4 + h1(k + 8) * 22], 1.6 + h1(k + 2) * 2.2, MAT.SMEAR, 1, 1 + k) } },
  meat: { u: 0.9, d: meat },
  armor: { u: 0.9, oy: 0.62, d: () => beastHelm([0, 0, 18], 1) },
  fury: { u: 0.9, d: () => { for (let k = -1; k <= 1; k++) tri([0, k * 7 - 2, 2], [0, k * 7 + 2, 2], [4, k * 9, 30], MAT.BLOOD, 0.9, 2 + k, { n: [1, 0, 0.3] }); sph([0, 0, 2], 6, MAT.IRON, 0.6, 1, { sq: 0.5 }) } },
  ironwill: { u: 0.85, d: () => { const C = [0, 0, 14]; for (let k = 0; k < 12; k++) { const a0 = (k / 12) * TAU, a1 = ((k + 1) / 12) * TAU; tri(C, v3.add(C, [0, Math.cos(a0) * 15, Math.sin(a0) * 15]), v3.add(C, [0, Math.cos(a1) * 15, Math.sin(a1) * 15]), MAT.IRON, 0.7, 1, { n: [1, 0, 0.4] }) } sph(v3.add(C, [2, 0, 0]), 4, MAT.STEEL, 0.9, 2) } },
  bloodrush: { u: 0.95, d: () => { sph([0, 0, 10], 9, MAT.BLOOD, 0.9, 1); cap([0, 0, 12], [0, 0, 30], 6.8, 0.6, MAT.BLOOD, 0.9, 1) } },
  hunger: { u: 0.9, d: () => { sph([0, 0, 18], 10, MAT.BONE, 0.85, 1); cap([4, 0, 12], [16, 0, 8], 6, 3.5, MAT.BONE, 0.85, 1); for (const s of [-1, 1]) sph([7, s * 3.5, 21], 2.4, MAT.DARK, 0.1, 2); for (let k = 0; k < 5; k++) cap([8 + k * 2, (k - 2) * 1.4, 9], [8 + k * 2, (k - 2) * 1.4, 5], 0.8, 0.3, MAT.BONE, 1, 3) } },
  torch: { u: 0.85, d: () => { cap([0, 0, 0], [2, 0, 26], 2.2, 2.6, MAT.WOOD, 0.8, 1); for (let k = 0; k < 4; k++) sph([2 + (h1(k) - 0.5) * 3, (h1(k + 5) - 0.5) * 3, 30 + k * 3.5], 5 - k, MAT.EYE, 1, 2 + k) } },
  talisman: { u: 0.85, d: () => { quad([0, -9, 32], [0, 9, 32], [0, 9, 2], [0, -9, 2], MAT.BONE, 0.9, 1, { n: [1, 0, 0.3] }); for (let k = 0; k < 3; k++) cap([1, -5, 24 - k * 8], [1, 5, 20 - k * 8], 0.7, 0.7, MAT.DARK, 0.1, 2, { fl: 1 }); sph([1, 0, 32], 2, MAT.BRAND, 0.8, 3) } },
  banner: { u: 0.62, oy: 0.95, d: () => drawProp('banner', 1) },
  r_godo: { u: 0.85, d: () => { cap([-10, 0, 2], [8, 0, 26], 1.8, 1.8, MAT.WOOD, 0.8, 1); cap([3, -9, 28], [13, 9, 24], 5, 5, MAT.IRON, 0.65, 2) } },
  r_hawk: { u: 0.95, d: () => { cap([0, -10, 30], [0, 0, 18], 0.6, 0.6, MAT.LEATHER, 0.8, 1); cap([0, 10, 30], [0, 0, 18], 0.6, 0.6, MAT.LEATHER, 0.8, 1); sph([0, 0, 12], 7, MAT.STEEL, 0.9, 2, { sx: 0.8 }); tri([1, -6, 13], [1, 6, 13], [2, 0, 7], MAT.DARK, 0.2, 3, { n: [1, 0, 0.3] }) } },
  r_behelit: { u: 1, d: () => { sph([0, 0, 14], 11, MAT.GORE, 0.75, 1, { sq: 1.25, tex: grime(0.2, 0.3) }); for (const [y, z] of [[-3.5, 18], [3.5, 15], [0, 10], [-2, 22]]) sph([9, y, z], 1.4, MAT.DARK, 0.1, 2); cap([9, -3, 7], [9, 3, 7.5], 0.6, 0.6, MAT.DARK, 0.1, 2) } },
  r_rations: { u: 0.9, d: () => { meat(); sph([-10, 8, 6], 7, MAT.WOOD, 0.85, 3, { sq: 0.6 }) } },
  r_arm: { u: 0.85, d: () => ICON.cannon.d() },
  r_spur: { u: 0.95, d: () => { for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; cap([0, 0, 16], [0, Math.cos(a) * 12, 16 + Math.sin(a) * 12], 1.4, 0.4, MAT.STEEL, 0.95, 1) } sph([0, 0, 16], 3, MAT.IRON, 0.8, 2); cap([0, 0, 16], [-16, 0, 6], 1.6, 1.6, MAT.IRON, 0.8, 3) } },
  dust: { u: 1, d: () => ICON.regen.d() }, chest: { u: 1, d: () => { sph([0, 0, 10], 9, MAT.WOOD, 0.8, 1, { sq: 0.9 }); sph([3, 2, 14], 3, MAT.LEATHER, 0.9, 2) } },
  charm: { u: 0.85, d: () => ICON.talisman.d() }, behelit: { u: 1, d: () => ICON.r_behelit.d() },
  wound: { u: 1, d: () => { for (const [a, b] of [[[0, 0, 4], [0, 0, 28]], [[0, 0, 22], [0, -8, 30]], [[0, 0, 22], [0, 8, 30]], [[0, 0, 10], [0, -6, 4]], [[0, 0, 10], [0, 6, 4]]]) cap(a, b, 1.8, 1.4, MAT.BRAND, 0.9, 1) } },
  cloak: { u: 0.8, d: () => { quad([-2, -12, 34], [-2, 12, 34], [-8, 16, 2], [-8, -16, 2], MAT.CLOAK, 0.6, 1, { tex: (x, y) => 0.8 + Math.sin(x * 0.9) * 0.15 }) } },
  whet: { u: 0.9, d: () => { sph([0, 0, 8], 12, MAT.STONE, 0.8, 1, { sq: 0.45, tex: grime(0.2, 0.3) }); knife([-6, -4, 12], [0.4, 0.6, 0.3], 16) } },
  gears: { u: 0.85, d: () => { disc([0, 0, 12], 13, MAT.IRON, 0.7, 1, 0); for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; cap([Math.cos(a) * 12, Math.sin(a) * 12, 12], [Math.cos(a) * 16, Math.sin(a) * 16, 12], 2, 2, MAT.IRON, 0.75, 1) } sph([0, 0, 13], 4, MAT.STEEL, 0.9, 2) } },
  pelt: { u: 0.85, d: () => { sph([0, 0, 8], 14, MAT.HAIR, 0.8, 1, { sq: 0.55, tex: (x, y) => 0.7 + h2(x, y) * 0.5 }); cap([10, 0, 10], [18, 0, 12], 4, 2, MAT.HAIR, 0.8, 2); for (const s of [-1, 1]) cap([14, s * 3, 14], [16, s * 4, 19], 1.6, 0.5, MAT.HAIR, 0.85, 2) } },
  boar: { u: 0.9, d: meat },
  contract: { u: 0.85, d: () => { cap([0, -12, 20], [0, 12, 20], 4, 4, MAT.BONE, 0.9, 1); cap([0, -14, 20], [0, -11, 20], 2, 2, MAT.WOOD, 0.8, 2); cap([0, 11, 20], [0, 14, 20], 2, 2, MAT.WOOD, 0.8, 2); quad([1, -10, 18], [1, 10, 18], [1, 10, 2], [1, -10, 2], MAT.BONE, 0.85, 3, { n: [1, 0, 0.3] }); sph([2, 0, 6], 2.6, MAT.BRAND, 0.8, 4) } },
}
const ICONURL = {}, IB = mkBuf(128, 128), ICV = typeof document !== 'undefined' ? mkCanvas(48, 48) : null
/* card id -> icon: weapons by their id, allies get their own figure */
function iconKey(id) { return id.startsWith('w:') ? id.slice(2) : id.startsWith('W') && ITEMS[id] ? id.slice(1) : id === 'evo_beast' ? 'beast' : id }
function iconURL(id) {
  const k = iconKey(id); if (ICONURL[k]) return ICONURL[k]
  const al = k.startsWith('ally:') ? k.slice(5) : null, ic = al ? { u: 0.36 * (SPEC[al].sc || 1), oy: 0.94, d: () => SPEC[al].draw({ t: 0.5, mv: 0 }) } : ICON[k] || ICON.meat
  /* render once, measure the silhouette, re-render scaled so the object fills the 48px frame, then centre it */
  const pass = u => { clearBuf(IB); D.b = IB; D.g = 1 << 5; setCam({ u, ox: 64, oy: 96 }); setFig(0, 0, al ? 1.1 : 0.55); ic.d(); let x0 = 128, x1 = -1, y0 = 128, y1 = -1
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) if (IB.mat[y * 128 + x] !== EMPTY) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y } return { x0, x1, y0, y1 } }
  let b = pass(ic.u); const f = Math.min(2.5, 42 / Math.max(8, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1)); b = pass(ic.u * f)
  const ox = Math.round((b.x0 + b.x1) / 2) - 24, oy = Math.round((b.y0 + b.y1) / 2) - 24, sub = mkBuf(48, 48)
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const X = x + ox, Y = y + oy; if (X < 0 || Y < 0 || X >= 128 || Y >= 128) continue; const s = Y * 128 + X, d = y * 48 + x; for (const key of ['mat', 'alb', 'nx', 'ny', 'nz', 'grp', 'fl']) sub[key][d] = IB[key][s] }
  const cx = ICV.getContext('2d'), img = cx.createImageData(48, 48); shadeBuf(sub, CS.golden, img.data); cx.putImageData(img, 0, 0)
  return (ICONURL[k] = ICV.toDataURL())
}
