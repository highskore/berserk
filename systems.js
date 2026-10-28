/* ---------- the deeper systems: active abilities, gear, flasks and talents. all per run, nothing saved ----------
   abilities have cooldowns, charges and endless ranks; gear comes in five slots with rarity and real trade-offs;
   flasks sit on quick slots; three talent trees end in capstones and a node that takes points forever. */

/* ---------- abilities ---------- */
const ABIL = {
  spin: { name: 'Dragonslayer Spin', icon: 'w:sweep', cd: 6, ch: 1, desc: r => `A full spin of the Dragonslayer: ${Math.round(40 * abK(r))} damage around you, huge knockback.` },
  cannon: { name: 'Cannon Burst', icon: 'w:cannon', cd: 9, ch: 1, desc: r => `The iron arm fires a shell at the nearest foe: ${Math.round(70 * abK(r))} damage in a wide blast.` },
  knives: { name: 'Knife Volley', icon: 'w:knives', cd: 7, ch: 2, desc: r => `Twelve knives in a ring, ${Math.round(14 * abK(r))} damage each, piercing.` },
  dash: { name: 'Dash', icon: 'stride', cd: 4, ch: 2, desc: () => 'A short burst of speed; untouchable while it lasts.' },
  cry: { name: 'War Cry', icon: 'banner', cd: 24, ch: 1, desc: r => `Roar: nearby foes are stunned for 1s and you deal ${30 + 5 * (r - 1)}% more damage for 6s.` },
  keg: { name: 'Powder Keg', icon: 'w:bombs', cd: 14, ch: 1, desc: r => `Hurl a keg into the thickest crowd: ${Math.round(120 * abK(r))} damage and burning ground.` },
  armor: { name: 'Berserker Armor', icon: 'armor', cd: 40, ch: 1, ult: 1, desc: () => 'Ultimate. Clamp the armor shut now: an instant frenzy, if you have half your Rage.' },
}
const ABORDER = ['spin', 'cannon', 'knives', 'dash', 'cry', 'keg', 'armor'], ABKEY = { spin: '1', cannon: '2', knives: '3', dash: 'SPACE', cry: 'Q', keg: 'E', armor: 'R' }
/* ranks never cap: damage grows linearly, cooldowns shrink as 1/(1+...) */
const abK = r => 1 + 0.3 * (r - 1)
GP.abCdMul = function (id) { const a = this.ab[id], t = this.tal; return 1 / (1 + 0.06 * (a.rank - 1) + (this.gear.abCd || 0) + (id === 'armor' ? 0.3 * (t.cap_bers || 0) : 0)) * this.p.cdr ** 0.5 }
GP.abCharges = function (id) { const t = this.tal; return ABIL[id].ch + (this.abBonus[id] || 0) + (id === 'dash' && t.reach >= 2 ? 1 : 0) + (id === 'cannon' && t.crush >= 3 ? 1 : 0) }
GP.learnAbil = function (id) { const a = this.ab[id]; if (a) { a.rank++; this.text(this.p.x, this.p.y, 60, ABIL[id].name.toUpperCase() + ' ' + a.rank, 'heal') } else this.ab[id] = { rank: 1, ch: ABIL[id].ch, t: 0 } }
GP.abilTick = function (dt) {
  for (const id in this.ab) { const a = this.ab[id], max = this.abCharges(id); if (a.ch >= max) { a.ch = max; a.t = 0; continue } a.t += dt / (ABIL[id].cd * this.abCdMul(id)); if (a.t >= 1) { a.t = 0; a.ch++ } }
  if (this.cryT > 0) this.cryT -= dt; if (this.dustT > 0) { this.dustT -= dt; this.heal(this.p.maxHp * 0.06 * (1 + 0.25 * (this.tal.salve || 0)) * dt) }
}
GP.cast = function (id, aim) {
  const g = this, a = g.ab[id], p = g.p; if (!a || a.ch < 1 || g.pending || g.over) return false
  const r = a.rank, k = abK(r), e = aim || g.nearest(p.x, p.y, 260)
  if (id === 'armor') { if (!g.rageOn || g.armorT > 0 || g.rage < 50) return false; g.rage = 100 }
  else if (id === 'spin') { const R = 76 * p.area * (1 + 0.15 * (g.tal.cleave || 0)); p.spin = { t: 0, a: p.face, w: -18, dur: 0.6, every: 0.15, tick: 0, R, dmg: 40 * k / 4, kb: 200 }; g.shake = Math.max(g.shake, 4)
    if (g.tal.cap_sword) for (let i = 0; i < 6; i++) { const an = p.face + (i / 6) * TAU; g.pr.push({ x: p.x, y: p.y, z: 6, vx: Math.cos(an) * 260, vy: Math.sin(an) * 260, life: 0.6, dmg: 56 * k, pierce: 99, r: 12, kind: 'wave', hit: new Set() }) } }
  else if (id === 'cannon') { const an = e ? Math.atan2(e.y - p.y, e.x - p.x) : p.face; g.pr.push({ x: p.x, y: p.y, z: 26, vx: Math.cos(an) * 300, vy: Math.sin(an) * 300, life: 1, dmg: 70 * k, pierce: 1, r: 8, kind: 'ball', rad: 52 * p.area, hit: new Set() }); g.fx.push({ kind: 'muzzle', x: p.x + Math.cos(an) * 12, y: p.y + Math.sin(an) * 12, t: 0, d: 0.12 }); g.shake = Math.max(g.shake, 4) }
  else if (id === 'knives') for (let i = 0; i < 12; i++) { const an = (i / 12) * TAU; g.pr.push({ x: p.x, y: p.y, z: 22, vx: Math.cos(an) * 320, vy: Math.sin(an) * 320, life: 0.8, dmg: 14 * k, pierce: 3, r: 5, kind: 'knife', hit: new Set() }) }
  else if (id === 'dash') { let dx = g.input.x, dy = g.input.y; const l = Math.hypot(dx, dy); if (l < 0.15) { dx = Math.cos(p.face); dy = Math.sin(p.face) } else { dx /= l; dy /= l } p.dash = { vx: dx * 520, vy: dy * 520 / Math.sqrt(CAM.ky), t: 0.17 }; p.inv = Math.max(p.inv, 0.35) }
  else if (id === 'cry') { g.cryT = 6 + (g.tal.rush || 0); g.cryMul = 0.3 + 0.05 * (r - 1); g.shake = Math.max(g.shake, 5); g.fx.push({ kind: 'boom', x: p.x, y: p.y, rad: 90, t: 0, d: 0.35 }); for (const o of g.en) if (!o.d.boss && Math.hypot(o.x - p.x, o.y - p.y) < 90) o.stun = Math.max(o.stun, 1) }
  else if (id === 'keg') { let best = e; if (g.en.length > 4) { let bn = -1; for (let i = 0; i < 8; i++) { const c = g.en[Math.floor(g.R() * g.en.length)]; let n = 0; for (const o of g.en) if (Math.abs(o.x - c.x) < 50 && Math.abs(o.y - c.y) < 50) n++; if (n > bn) { bn = n; best = c } } } const tx = best ? best.x : p.x + Math.cos(p.face) * 90, ty = best ? best.y : p.y + Math.sin(p.face) * 70
    g.pr.push({ x: p.x, y: p.y, sx: p.x, sy: p.y, tx, ty, t: 0, d: 0.8, z: 0, kind: 'bomb', dmg: 120 * k, rad: 70 * p.area, life: 2, hit: new Set(), fire: 1 }) }
  a.ch--; return true
}
/* auto-cast (on by default; the ultimate and flasks only if asked): each ability fires when it would actually help.
   spin and war cry when foes crowd in, cannon at the nearest elite or the densest knot, knives and the keg into crowds,
   dash away when hp is low with a foe on you or when a boss's next strike is about to land where you stand */
GP.autoCast = function (o) {
  const g = this, p = g.p; if ((g.acT = (g.acT || 0) - 1 / 60) > 0) return; g.acT = 0.2
  if (o.flask && p.hp < p.maxHp * 0.3 && g.flasks.heal > 0) g.useFlask('heal')
  if (!o.ab && !o.ult) return
  let near = 0, close = 0, elite = null, ed = 1e9; for (const e of g.en) { if (e.dead) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < 90) near++; if (d < 45) close++; if ((e.elite || e.d.boss || e.d.apo) && d < ed && d < 260) { ed = d; elite = e } }
  const ready = id => g.ab[id] && g.ab[id].ch >= 1
  if (o.ult && ready('armor') && g.rageOn && g.rage >= 50 && g.armorT <= 0 && near >= 4) { g.cast('armor'); return }
  if (!o.ab) return
  const b = g.boss, P = b && b.ai && b.ai.plan, nxt = P && P.st.find(s => !s.done && s.sh && s.dmg), danger = nxt && nxt.t - b.ai.t < 0.35 && inside(nxt.sh, p.x, p.y)
  if (ready('dash') && (danger || (p.hp < p.maxHp * 0.35 && close >= 2))) { const src = danger ? b : g.nearest(p.x, p.y, 60) || b; if (src) { const a = Math.atan2(p.y - src.y, p.x - src.x); g.input.x = Math.cos(a); g.input.y = Math.sin(a) } g.cast('dash'); return }
  if (ready('spin') && (near >= 3 || (elite && ed < 70))) { g.cast('spin'); return }
  if (ready('cry') && (near >= 7 || (b && Math.hypot(b.x - p.x, b.y - p.y) < 110))) { g.cast('cry'); return }
  if (ready('cannon')) { const t = elite || g.densest(240); if (t) { g.cast('cannon', t); return } }
  if (ready('knives') && near >= 5) { g.cast('knives'); return }
  if (ready('keg')) { const t = g.densest(220, 6); if (t) { g.cast('keg'); return } }
}
/* the foe at the heart of the thickest knot within range (sampled, so it stays cheap in a horde) */
GP.densest = function (range, min) { const g = this, p = g.p; let best = null, bn = (min || 3) - 1; for (let k = 0; k < 10 && g.en.length; k++) { const c = g.en[Math.floor(g.R() * g.en.length)]; if (c.dead || Math.hypot(c.x - p.x, c.y - p.y) > range) continue; let n = 0; for (const o of g.en) if (Math.abs(o.x - c.x) < 45 && Math.abs(o.y - c.y) < 45) n++; if (n > bn) { bn = n; best = c } } return best }
for (const id in ABIL) UPG['ab:' + id] = { ability: id, name: ABIL[id].name, rar: id === 'armor' ? 'epic' : 'rare', desc: (g, l) => (l === 1 ? 'NEW ABILITY. ' : 'Rank ' + l + ': ') + ABIL[id].desc(l), req: g => (id === 'armor' ? g.rageOn : true), apply: g => g.learnAbil(id), max: 1e9 }

/* ---------- gear: five slots, rarity tiers, trade-offs; item level follows the depth with no ceiling ---------- */
const GSLOTS = ['weapon', 'helm', 'armor', 'gauntlet', 'charm']
const GBASE = {
  weapon: [['Notched Dragonslayer', 'w:sweep', { might: 0.12 }], ["Godo's Great Sword", 'w:cleave', { might: 0.1, area: 0.05 }], ['Hawk Saber', 'lunge', { might: 0.07, haste: 0.06 }]],
  helm: [['Wolf-Iron Helm', 'armor', { armor: 1.2 }], ['Kettle Helm', 'plate', { armor: 0.8, maxHp: 8 }], ['Black Hood', 'cloak', { crit: 0.03 }]],
  armor: [['Black Swordsman Plate', 'plate', { armor: 2.2, spd: -0.04 }], ['Hawk Mail', 'ironwill', { armor: 1.4, maxHp: 10 }], ['Traveller\'s Cloak', 'cloak', { spd: 0.05, armor: 0.6 }]],
  gauntlet: [['Cannon Arm', 'w:cannon', { abCannon: 1, might: 0.04 }], ['Repeater Arm', 'w:bolts', { haste: 0.08 }], ['Iron Fist', 'might', { might: 0.06, armor: 0.6 }]],
  charm: [['Crimson Behelit', 'r_behelit', { might: 0.18, dmgTaken: 0.12 }], ["Puck's Chestnut", 'chest', { regen: 0.6, magnet: 12 }], ['Hawk Pendant', 'r_hawk', { maxHp: 16 }], ["Flora's Charm", 'talisman', { brandRes: 0.15, regen: 0.3 }]],
}
/* the affixes: a plus and (from rare up) a price paid somewhere else */
const GUP = [['might', 0.06], ['armor', 0.8], ['maxHp', 10], ['haste', 0.05], ['crit', 0.025], ['regen', 0.3], ['area', 0.04], ['spd', 0.03]]
const GDOWN = [['spd', -0.04], ['maxHp', -8], ['dmgTaken', 0.06], ['haste', -0.04], ['armor', -0.6]]
const GRAR = ['common', 'rare', 'epic', 'legendary'], GRARK = [1, 1.35, 1.8, 2.5]
const GSTAT = { might: ['damage', v => '+' + Math.round(v * 100) + '%'], armor: ['plate', v => '+' + v.toFixed(1)], maxHp: ['max HP', v => '+' + fmtN(Math.round(v))], haste: ['attack rate', v => '+' + Math.round(v * 100) + '%'], crit: ['crit', v => '+' + (v * 100).toFixed(1) + '%'], regen: ['HP regen', v => '+' + v.toFixed(1) + '/s'], area: ['area', v => '+' + Math.round(v * 100) + '%'], spd: ['move speed', v => '+' + Math.round(v * 100) + '%'], magnet: ['pickup range', v => '+' + Math.round(v)], dmgTaken: ['damage taken', v => '+' + Math.round(v * 100) + '%'], brandRes: ['Brand resistance', v => '+' + Math.round(v * 100) + '%'], abCannon: ['Cannon Burst charges', v => '+' + v], abCd: ['ability cooldowns', v => '-' + Math.round(v * 100) + '%'] }
const statLine = (k, v) => { const [n, f] = GSTAT[k]; const neg = (k === 'dmgTaken' ? v > 0 : v < 0); return { t: (v < 0 ? f(v).replace('+-', '-') : f(v)) + ' ' + n, neg } }
GP.makeItem = function (slot, minRar) {
  const g = this, lvl = g.depth(), roll = g.R() * (1 + lvl * 0.04); let ri = roll > 1.12 ? 3 : roll > 0.92 ? 2 : roll > 0.6 ? 1 : 0; ri = Math.max(ri, minRar || 0)
  slot = slot || g.pick(GSLOTS); const [name, icon, base] = g.pick(GBASE[slot]), sc = (1 + 0.12 * (lvl - 1)) * GRARK[ri], mods = {}
  for (const k in base) mods[k] = k === 'abCannon' ? base[k] : base[k] * (k === 'dmgTaken' ? 1 : sc)
  for (let i = 0; i < ri; i++) { const [k, v] = g.pick(GUP); mods[k] = (mods[k] || 0) + v * sc }
  if (ri >= 1) { const [k, v] = g.pick(GDOWN); mods[k] = (mods[k] || 0) + v * (k === 'dmgTaken' ? 1 : Math.sqrt(sc)) }
  if (ri === 3) mods.abCd = (mods.abCd || 0) + 0.1
  const pre = ['', 'Fine ', 'Masterwork ', 'Legend of the '][ri]
  return { slot, name: pre + name, icon, rar: GRAR[ri], lvl, mods, price: Math.round((14 + 10 * ri * ri) * (1 + lvl * 0.25)), uid: (g.uidN = (g.uidN || 0) + 1) }
}
/* equipping adds an item's mods to guts and unequipping takes them away again, so stats stay exact */
GP.applyItem = function (it, s) {
  const p = this.p, m = it.mods
  for (const k in m) { const v = m[k] * s
    if (k === 'might' || k === 'armor' || k === 'crit' || k === 'regen' || k === 'area' || k === 'magnet') p[k] += v
    else if (k === 'maxHp') { p.maxHp = Math.max(1, p.maxHp + v); p.hp = Math.min(p.hp, p.maxHp) }
    else if (k === 'haste') this.addHaste(v); else if (k === 'spd') p.spd *= Math.pow(1 + m[k], s)
    else if (k === 'dmgTaken') p.dmgTaken *= Math.pow(1 + m[k], s); else if (k === 'brandRes') this.brandRate *= Math.pow(1 - m[k], s)
    else if (k === 'abCannon') this.abBonus.cannon = (this.abBonus.cannon || 0) + v; else if (k === 'abCd') this.gear.abCd = (this.gear.abCd || 0) + v }
}
GP.equip = function (uid) {
  const i = this.pack.findIndex(x => x.uid === uid); if (i < 0) return; const it = this.pack[i], old = this.worn[it.slot]
  this.pack.splice(i, 1); if (old) { this.applyItem(old, -1); this.pack.push(old) } this.worn[it.slot] = it; this.applyItem(it, 1); this.pver++
}
GP.unequip = function (slot) { const it = this.worn[slot]; if (!it || this.pack.length >= 24) return; this.applyItem(it, -1); this.worn[slot] = null; this.pack.push(it); this.pver++ }
GP.sellItem = function (uid) { const i = this.pack.findIndex(x => x.uid === uid); if (i < 0) return; this.p.gold += Math.round(this.pack[i].price * 0.35); this.pack.splice(i, 1); this.pver++ }
GP.gainItem = function (it) { if (this.pack.length >= 24) { this.p.gold += Math.round(it.price * 0.35); return } if (!this.worn[it.slot]) { this.pack.push(it); this.equip(it.uid) } else this.pack.push(it); this.text(this.p.x, this.p.y, 64, it.rar.toUpperCase() + ' ' + it.slot.toUpperCase(), 'crit') }

/* ---------- flasks on quick slots ---------- */
const FLASK = {
  heal: { name: 'Healing Draught', icon: 'vigor', key: 'Z', price: 12, desc: 'Heal 40% of your max HP.' },
  dust: { name: "Puck's Elf Dust", icon: 'regen', key: 'X', price: 14, desc: 'Regenerate 6% of your max HP a second for 6s.' },
  smoke: { name: 'Smoke Bomb', icon: 'cloak', key: 'C', price: 16, desc: 'Vanish in smoke: foes around you are stunned for 2s and you are untouchable for 1.5s.' },
  bomb: { name: 'Powder Bomb', icon: 'bombs', key: 'V', price: 10, desc: 'Throw a bomb at the nearest foe.' },
}
const FLORDER = ['heal', 'dust', 'smoke', 'bomb']
GP.useFlask = function (id) {
  const g = this, p = g.p; if (!(g.flasks[id] > 0) || g.pending || g.over) return false; g.flasks[id]--
  const salve = 1 + 0.2 * (g.tal.salve || 0)
  if (id === 'heal') g.heal(p.maxHp * 0.4 * salve)
  else if (id === 'dust') { g.dustT = 6; g.fx.push({ kind: 'dust', x: p.x, y: p.y, t: 0, d: 0.9 }) }
  else if (id === 'smoke') { p.inv = Math.max(p.inv, 1.5); g.fx.push({ kind: 'acid', x: p.x, y: p.y, rad: 70, t: 0, d: 2, smoke: 1 }); for (const e of g.en) if (!e.d.boss && Math.hypot(e.x - p.x, e.y - p.y) < 120) e.stun = Math.max(e.stun, 2) }
  else { const e = g.nearest(p.x, p.y, 220); g.pr.push({ x: p.x, y: p.y, sx: p.x, sy: p.y, tx: e ? e.x : p.x + 70, ty: e ? e.y : p.y, t: 0, d: 0.6, z: 0, kind: 'bomb', dmg: 50 * (1 + g.depth() * 0.35), rad: 46, life: 2, hit: new Set() }) }
  return true
}

/* ---------- talents: three trees, tiers gated by points spent, a capstone, and a node that never fills ---------- */
const TREES = [
  ['sword', 'Black Swordsman', 'w:sweep', [['iron', 'Heavier Iron', 'w:sweep', 3, 0, 0, r => `+${8 * r}% damage.`], ['cleave', 'Cleaving Arc', 'w:cleave', 3, 0, 2, r => `Dragonslayer Spin reaches ${15 * r}% further.`], ['reach', 'Long Reach', 'reach', 2, 1, 1, r => `+${6 * r}% weapon area${r >= 2 ? '; Dash gains a charge' : ' (rank 2: Dash gains a charge)'}.`], ['crush', 'Crushing Blows', 'might', 3, 2, 0, r => `+${4 * r}% crit${r >= 3 ? '; Cannon Burst gains a charge' : ' (rank 3: Cannon Burst gains a charge)'}.`], ['cap_sword', 'Shockwave Cleave', 'lunge', 1, 3, 1, () => 'Capstone. Dragonslayer Spin sends six shockwaves tearing outward along the ground.'], ['rep_sword', 'Iron Mastery', 'might', Infinity, 4, 1, r => `Repeatable: +3% damage a point, a little less each time (${r} taken).`]]],
  ['strug', 'Struggler', 'vigor', [['hide', 'Thick Hide', 'vigor', 3, 0, 0, r => `+${15 * r} max HP.`], ['salve', 'Elf Salve', 'regen', 3, 0, 2, r => `+${(0.4 * r).toFixed(1)} HP regen; flasks ${20 * r}% stronger.`], ['ward', 'Brand Ward', 'talisman', 2, 1, 1, r => `The Brand fills ${15 * r}% slower.`], ['unbroken', 'Unbroken', 'plate', 3, 2, 0, r => `+${r} plate.`], ['cap_strug', 'Brand-Ink Burst', 'wound', 1, 3, 1, () => 'Capstone. When the Brand burns, an ink shockwave tears through everything on screen.'], ['rep_strug', 'Endure', 'vigor', Infinity, 4, 1, r => `Repeatable: +8 max HP a point, a little less each time (${r} taken).`]]],
  ['bers', 'Berserker', 'armor', [['fury', 'Fury', 'fury', 3, 0, 0, r => `Rage fills ${15 * r}% faster.`], ['rush', 'Blood Rush', 'bloodrush', 2, 0, 2, r => `Frenzy and War Cry last ${r}s longer.`], ['hunger', "Beast's Hunger", 'hunger', 3, 1, 1, r => `Kills in the frenzy heal ${r} HP.`], ['will', 'Iron Will', 'ironwill', 2, 2, 0, r => `The armor drains ${20 * r}% less.`], ['cap_bers', 'Endless Frenzy', 'armor', 1, 3, 1, () => 'Capstone. Frenzy kills extend it by 0.1s; the armor ultimate recharges 30% faster.'], ['rep_bers', 'Rage Eternal', 'fury', Infinity, 4, 1, r => `Repeatable: +2% frenzy damage a point, a little less each time (${r} taken).`]]],
]
const TNODE = {}; for (const [tid, , , nodes] of TREES) for (const [id, name, icon, max, row, col, desc] of nodes) TNODE[id] = { tree: tid, name, icon, max, row, col, desc }
const ROWREQ = [0, 3, 6, 10, 12]
GP.treeSpent = function (tid) { let n = 0; for (const id in this.tal) if (TNODE[id].tree === tid) n += this.tal[id]; return n }
GP.canTalent = function (id) { const N = TNODE[id], r = this.tal[id] || 0; return this.tp > 0 && r < N.max && this.treeSpent(N.tree) >= ROWREQ[N.row] }
GP.takeTalent = function (id) {
  const g = this, p = g.p; if (!g.canTalent(id)) return; g.tp--; const r = (g.tal[id] = (g.tal[id] || 0) + 1), dim = Math.pow(0.97, r - 1)
  if (id === 'iron') p.might += 0.08; else if (id === 'reach') p.area += 0.06; else if (id === 'crush') p.crit += 0.04; else if (id === 'rep_sword') p.might += 0.03 * dim
  else if (id === 'hide') { p.maxHp += 15; g.heal(15) } else if (id === 'salve') p.regen += 0.4; else if (id === 'ward') g.brandRate *= 0.85; else if (id === 'unbroken') p.armor += 1; else if (id === 'rep_strug') { p.maxHp += 8 * dim; g.heal(8 * dim) }
  else if (id === 'fury') g.rageMul *= 1.15; else if (id === 'rush') g.armorDur += 1; else if (id === 'hunger') g.hunger += 1; else if (id === 'will') g.drain *= 0.8; else if (id === 'rep_bers') g.frenzyBonus = (g.frenzyBonus || 0) + 0.02 * dim
  g.pver++
}
GP.sysReset = function () {
  this.ab = {}; this.abBonus = {}; this.gear = {}; this.worn = {}; this.pack = []; this.flasks = { heal: 2, dust: 0, smoke: 1, bomb: 2 }; this.tal = {}; this.tp = 0; this.cryT = 0; this.dustT = 0
  this.learnAbil('spin'); this.learnAbil('dash')
}
