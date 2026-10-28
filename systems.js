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
GP.abCdMul = function (id) { const a = this.ab[id], t = this.tal; return 1 / (1 + 0.06 * (a.rank - 1) + (this.gear.abCd || 0) + (id === 'armor' ? 0.3 * (t.darkbeast || 0) : 0)) * this.p.cdr ** 0.5 }
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
    if (g.tal.shockwave) for (let i = 0; i < 6; i++) { const an = p.face + (i / 6) * TAU; g.pr.push({ x: p.x, y: p.y, z: 6, vx: Math.cos(an) * 260, vy: Math.sin(an) * 260, life: 0.6, dmg: 56 * k, pierce: 99, r: 12, kind: 'wave', hit: new Set() }) } }
  else if (id === 'cannon') { const an = e ? Math.atan2(e.y - p.y, e.x - p.x) : p.face; g.pr.push({ x: p.x, y: p.y, z: 26, vx: Math.cos(an) * 300, vy: Math.sin(an) * 300, life: 1, dmg: 70 * k, pierce: 1, r: 8, kind: 'ball', rad: 52 * p.area, hit: new Set(), bounce: g.tal.ricochet ? 2 : 0 }); g.fx.push({ kind: 'muzzle', x: p.x + Math.cos(an) * 12, y: p.y + Math.sin(an) * 12, t: 0, d: 0.12 }); g.shake = Math.max(g.shake, 4) }
  else if (id === 'knives') for (let i = 0; i < 12; i++) { const an = (i / 12) * TAU; g.pr.push({ x: p.x, y: p.y, z: 22, vx: Math.cos(an) * 320, vy: Math.sin(an) * 320, life: 0.8, dmg: 14 * k, pierce: 3, r: 5, kind: 'knife', hit: new Set() }) }
  else if (id === 'dash') { let dx = g.input.x, dy = g.input.y; const l = Math.hypot(dx, dy); if (l < 0.15) { dx = Math.cos(p.face); dy = Math.sin(p.face) } else { dx /= l; dy /= l } p.dash = { vx: dx * 520, vy: dy * 520 / Math.sqrt(CAM.ky), t: 0.17 }; p.inv = Math.max(p.inv, 0.35)
    if (g.tal.afterimage) g.decoy = { x: p.x, y: p.y, t: 2 }
    if (g.gear.fx_horn) for (const o of g.en) { const ox = o.x - p.x, oy = o.y - p.y, along = ox * dx + oy * dy; if (along > -10 && along < 100 && Math.abs(ox * dy - oy * dx) < 22) g.damage(o, 60 * (1 + g.depth() * 0.3), ox, oy, 260) } }
  else if (id === 'cry') { g.cryT = 6 + (g.tal.rush || 0); g.cryMul = 0.3 + 0.05 * (r - 1); g.shake = Math.max(g.shake, 5); g.fx.push({ kind: 'boom', x: p.x, y: p.y, rad: 90, t: 0, d: 0.35 }); for (const o of g.en) if (!o.d.boss && Math.hypot(o.x - p.x, o.y - p.y) < 90) o.stun = Math.max(o.stun, 1) }
  else if (id === 'keg') { let best = aim || e; if (g.en.length > 4) { let bn = -1; for (let i = 0; i < 8; i++) { const c = g.en[Math.floor(g.R() * g.en.length)]; let n = 0; for (const o of g.en) if (Math.abs(o.x - c.x) < 50 && Math.abs(o.y - c.y) < 50) n++; if (n > bn) { bn = n; best = c } } } const tx = best ? best.x : p.x + Math.cos(p.face) * 90, ty = best ? best.y : p.y + Math.sin(p.face) * 70
    g.pr.push({ x: p.x, y: p.y, sx: p.x, sy: p.y, tx, ty, t: 0, d: 0.8, z: 0, kind: 'bomb', dmg: 120 * k, rad: 70 * p.area * (g.gear.fx_satchel ? 1.5 : 1), life: 2, hit: new Set(), fire: 1 }) }
  a.ch--; return true
}
/* auto-cast (on by default; the ultimate and flasks only if asked): each ability fires when it would actually help.
   spin and war cry when foes crowd in, cannon at the nearest elite or the densest knot, knives and the keg into crowds,
   dash away when hp is low with a foe on you or when a boss's next strike is about to land where you stand */
GP.autoCast = function (o) {
  const g = this, p = g.p; if ((g.acT = (g.acT || 0) - 1 / 60) > 0) return; g.acT = 0.2
  if (o.flask && p.hp < p.maxHp * 0.3 && g.flasks.heal > 0) g.useFlask('heal')
  if (!o.ab && !o.ult) return
  let near = 0, close = 0, mid = 0, elite = null, ed = 1e9; for (const e of g.en) { if (e.dead) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < 90) near++; if (d < 45) close++; if (d < 130) mid++; if ((e.elite || e.d.boss || e.d.apo) && d < ed && d < 260) { ed = d; elite = e } }
  const ready = id => g.ab[id] && g.ab[id].ch >= 1
  if (o.ult && ready('armor') && g.rageOn && g.rage >= 50 && g.armorT <= 0 && near >= 4) g.cast('armor')
  if (!o.ab) return
  /* every ability that is ready and useful fires this tick, in priority order: escape first, then the big hits */
  const b = g.boss, P = b && b.ai && b.ai.plan, nxt = P && P.st.find(s => !s.done && s.sh && s.dmg), danger = nxt && nxt.t - b.ai.t < 0.35 && inside(nxt.sh, p.x, p.y)
  if (ready('dash')) {
    if (danger || (p.hp < p.maxHp * 0.35 && close >= 2)) { const src = danger ? b : g.nearest(p.x, p.y, 60) || b; if (src) { const a = Math.atan2(p.y - src.y, p.x - src.x); g.input.x = Math.cos(a); g.input.y = Math.sin(a) } g.cast('dash') }
    /* and on the attack: close the gap to an elite or an apostle while hp is healthy, keeping a charge back */
    else if (elite && ed > 60 && ed < 170 && p.hp > p.maxHp * 0.6 && g.ab.dash.ch >= Math.min(2, g.abCharges('dash'))) { const a = Math.atan2(elite.y - p.y, elite.x - p.x); g.input.x = Math.cos(a); g.input.y = Math.sin(a); g.cast('dash') }
  }
  if (ready('keg')) { const t = g.densest(220, 4); if (t) g.cast('keg', t) }
  if (ready('cannon')) { const t = elite || g.densest(240, 2) || g.nearest(p.x, p.y, 200); if (t) g.cast('cannon', t) }
  if (ready('cry') && (near >= 5 || (b && Math.hypot(b.x - p.x, b.y - p.y) < 120))) g.cast('cry')
  if (ready('knives') && mid >= 3) g.cast('knives')
  if (ready('spin') && (near >= 2 || (elite && ed < 70))) g.cast('spin')
}
/* the foe at the heart of the thickest knot within range (sampled, so it stays cheap in a horde) */
GP.densest = function (range, min) { const g = this, p = g.p; let best = null, bn = (min || 3) - 1; for (let k = 0; k < 10 && g.en.length; k++) { const c = g.en[Math.floor(g.R() * g.en.length)]; if (c.dead || Math.hypot(c.x - p.x, c.y - p.y) > range) continue; let n = 0; for (const o of g.en) if (Math.abs(o.x - c.x) < 45 && Math.abs(o.y - c.y) < 45) n++; if (n > bn) { bn = n; best = c } } return best }
for (const id in ABIL) UPG['ab:' + id] = { ability: id, name: ABIL[id].name, rar: id === 'armor' ? 'epic' : 'rare', desc: (g, l) => (l === 1 ? 'NEW ABILITY. ' : 'Rank ' + l + ': ') + ABIL[id].desc(l), req: g => (id === 'armor' ? g.rageOn : true), apply: g => g.learnAbil(id), max: 1e9 }

/* ---------- gear: five slots, rarity tiers, trade-offs; item level follows the depth with no ceiling ---------- */
const GSLOTS = ['weapon', 'helm', 'armor', 'gauntlet', 'charm']
/* the affixes: a plus and (from rare up) a price paid somewhere else. rarer drops roll from the wider second list */
const GUP = [['might', 0.06], ['armor', 0.8], ['maxHp', 10], ['haste', 0.05], ['crit', 0.025], ['regen', 0.3], ['area', 0.04], ['spd', 0.03]]
const GUP2 = [['leech', 0.006], ['gold', 0.15], ['xp', 0.08], ['abCd', 0.05], ['allyDmg', 0.12], ['knock', 0.2], ['nightDmg', 0.1], ['thornsG', 12]]
const GDOWN = [['spd', -0.04], ['maxHp', -8], ['dmgTaken', 0.06], ['haste', -0.04], ['armor', -0.6]]
const GRAR = ['common', 'rare', 'epic', 'legendary'], GRARK = [1, 1.35, 1.8, 2.5]
const GSTAT = { might: ['damage', v => '+' + Math.round(v * 100) + '%'], armor: ['plate', v => '+' + v.toFixed(1)], maxHp: ['max HP', v => '+' + fmtN(Math.round(v))], haste: ['attack rate', v => '+' + Math.round(v * 100) + '%'], crit: ['crit', v => '+' + (v * 100).toFixed(1) + '%'], regen: ['HP regen', v => '+' + v.toFixed(1) + '/s'], area: ['area', v => '+' + Math.round(v * 100) + '%'], spd: ['move speed', v => '+' + Math.round(v * 100) + '%'], magnet: ['pickup range', v => '+' + Math.round(v)], dmgTaken: ['damage taken', v => '+' + Math.round(v * 100) + '%'], brandRes: ['Brand resistance', v => '+' + Math.round(v * 100) + '%'], abCannon: ['Cannon Burst charges', v => '+' + v], abCd: ['ability cooldowns', v => '-' + Math.round(v * 100) + '%'],
  leech: ['of damage healed', v => '+' + (v * 100).toFixed(1) + '%'], gold: ['gold found', v => '+' + Math.round(v * 100) + '%'], xp: ['experience', v => '+' + Math.round(v * 100) + '%'], allyDmg: ['ally damage', v => '+' + Math.round(v * 100) + '%'], knock: ['knockback', v => '+' + Math.round(v * 100) + '%'], nightDmg: ['damage at night', v => '+' + Math.round(v * 100) + '%'], thornsG: ['damage to foes that touch you', v => '+' + fmtN(Math.round(v))] }
const statLine = (k, v) => { const [n, f] = GSTAT[k]; const neg = (k === 'dmgTaken' ? v > 0 : v < 0); return { t: (v < 0 ? f(v).replace('+-', '-') : f(v)) + ' ' + n, neg } }
/* named items: each changes how a build plays. cursed ones pay for their power. sets reward wearing their pieces together.
   [slot, name, icon, mods, effect id or '', effect text, set, cursed] */
const UNIQ = {
  anvil: ['weapon', "Godo's Anvil-Forged Blade", 'r_godo', { might: 0.3, area: 0.12 }, 'anvil', 'Every swing knocks foes back twice as hard.'],
  casca: ['weapon', "Casca's Sword", 'w:sweep', { might: 0.12, haste: 0.18, allyDmg: 0.25 }, '', 'Your allies deal 25% more damage.', 'hawk'],
  rapier: ['weapon', "Griffith's Rapier", 'lunge', { might: 0.8, crit: 0.1, dmgTaken: 0.4, allyDmg: -0.3 }, '', 'A falcon\'s grace bought with the band: you take far more damage, your allies falter.', 'hawk', 1],
  bhelm: ['helm', 'Berserker Helm', 'armor', { armor: 1.5, might: 0.08 }, '', '', 'berserker'],
  bplate: ['armor', 'Berserker Plate', 'plate', { armor: 3, maxHp: 20 }, '', '', 'berserker'],
  bgaunt: ['gauntlet', 'Berserker Gauntlet', 'w:cannon', { might: 0.1, haste: 0.06 }, '', '', 'berserker'],
  skull: ['armor', "Skull Knight's Shield", 'ironwill', { armor: 6 }, 'reflect', 'Foes that strike you take 30% of the hit back.'],
  horn: ['helm', "Zodd's Horn", 'beast', { might: 0.2, maxHp: 15 }, 'horn', 'Your Dash gores: foes in its path are knocked aside and take heavy damage.'],
  satchel: ['gauntlet', "Rickert's Bomb Satchel", 'w:bombs', { area: 0.1 }, 'satchel', 'Bombs and the Powder Keg blast 50% wider; two powder bombs every dawn.'],
  talisman: ['charm', "Schierke's Talisman", 'talisman', { brandRes: 0.4 }, 'talisman', 'Spirits that touch you are burned for heavy damage.'],
  pendant: ['charm', 'The Hawk Pendant', 'r_hawk', { maxHp: 25 }, 'pendant', 'Once a minute, falling below 25% HP heals you 30%.', 'hawk'],
  chestnut: ['charm', "Puck's Chestnut", 'chest', { regen: 0.8 }, 'chestnut', "Puck's healing is doubled and his chestnuts stun twice as far."],
  behelit: ['charm', 'Crimson Behelit', 'r_behelit', { might: 0.6, brandRes: -1 }, '', 'It wants a sacrifice: the Brand fills twice as fast.', '', 1],
  dragonslayer: ['weapon', 'The Dragonslayer, Blood-Drunk', 'beast', { might: 0.5, knock: 0.5, haste: -0.12, leech: 0.01 }, '', 'Too big to be called a sword. Slower, and it drinks what it cuts.', '', 1],
}
const SETS2 = {
  berserker: { name: 'The Berserker Armor', pieces: ['bhelm', 'bplate', 'bgaunt'], b2: 'Rage fills 40% faster.', b3: 'Frenzy damage +30%, and kills in the frenzy heal 2 HP.' },
  hawk: { name: 'The Band of the Hawk', pieces: ['casca', 'rapier', 'pendant'], b2: 'Allies deal 25% more damage.', b3: 'A Hawk raider joins the band every dawn.' },
}
const GBASE = {
  weapon: [['Notched Dragonslayer', 'w:sweep', { might: 0.12 }], ["Godo's Great Sword", 'w:cleave', { might: 0.1, area: 0.05 }], ['Hawk Saber', 'lunge', { might: 0.07, haste: 0.06 }], ['Kushan Talwar', 'w:knives', { might: 0.06, crit: 0.03, haste: 0.04 }], ['Executioner\'s Axe', 'w:cleave', { might: 0.16, haste: -0.04 }]],
  helm: [['Wolf-Iron Helm', 'armor', { armor: 1.2 }], ['Kettle Helm', 'plate', { armor: 0.8, maxHp: 8 }], ['Black Hood', 'cloak', { crit: 0.03 }], ['Kushan Turban', 'cloak', { brandRes: 0.1, regen: 0.2 }]],
  armor: [['Black Swordsman Plate', 'plate', { armor: 2.2, spd: -0.04 }], ['Hawk Mail', 'ironwill', { armor: 1.4, maxHp: 10 }], ['Traveller\'s Cloak', 'cloak', { spd: 0.05, armor: 0.6 }], ['Scale Hauberk', 'plate', { armor: 1.8, maxHp: 6 }]],
  gauntlet: [['Cannon Arm', 'w:cannon', { abCannon: 1, might: 0.04 }], ['Repeater Arm', 'w:bolts', { haste: 0.08 }], ['Iron Fist', 'might', { might: 0.06, armor: 0.6 }], ['Grapple Arm', 'w:knives', { magnet: 14, spd: 0.03 }]],
  charm: [["Flora's Charm", 'talisman', { brandRes: 0.15, regen: 0.3 }], ['Elf Locket', 'regen', { regen: 0.5, magnet: 10 }], ['Iron Seal', 'plate', { armor: 0.8, maxHp: 6 }], ['Wolf Fang', 'hunger', { crit: 0.03, might: 0.04 }]],
}
GP.makeItem = function (slot, minRar) {
  const g = this, lvl = g.depth(), roll = g.R() * (1 + lvl * 0.04); let ri = roll > 1.12 ? 3 : roll > 0.92 ? 2 : roll > 0.6 ? 1 : 0; ri = Math.max(ri, minRar || 0)
  slot = slot || g.pick(GSLOTS); const sc = (1 + 0.12 * (lvl - 1)) * GRARK[ri]
  /* a legendary roll is a named item half the time (any named piece at all if the slot has none) */
  if (ri === 3 && g.R() < 0.5) { const ids = Object.keys(UNIQ).filter(k => UNIQ[k][0] === slot); return g.makeUnique(ids.length ? g.pick(ids) : g.pick(Object.keys(UNIQ))) }
  const [name, icon, base] = g.pick(GBASE[slot]), mods = {}
  for (const k in base) mods[k] = k === 'abCannon' ? base[k] : base[k] * (k === 'dmgTaken' ? 1 : sc)
  for (let i = 0; i < ri; i++) { const [k, v] = g.pick(i >= 1 ? GUP2 : GUP); mods[k] = (mods[k] || 0) + v * sc }
  if (ri >= 1) { const [k, v] = g.pick(GDOWN); mods[k] = (mods[k] || 0) + v * (k === 'dmgTaken' ? 1 : Math.sqrt(sc)) }
  if (ri === 3) mods.abCd = (mods.abCd || 0) + 0.1
  const pre = ['', 'Fine ', 'Masterwork ', 'Legend of the '][ri]
  return { slot, name: pre + name, icon, rar: GRAR[ri], lvl, mods, price: Math.round((14 + 10 * ri * ri) * (1 + lvl * 0.25)), uid: (g.uidN = (g.uidN || 0) + 1) }
}
/* named items scale with the depth too; percentages that are prices (damage taken) stay as they are */
GP.makeUnique = function (id) {
  const g = this, [slot, name, icon, base, fx, text, set, cursed] = UNIQ[id], lvl = g.depth(), sc = (1 + 0.12 * (lvl - 1)) * GRARK[3], mods = {}
  for (const k in base) mods[k] = base[k] < 0 || k === 'dmgTaken' || k === 'brandRes' || k === 'leech' ? base[k] : base[k] * sc
  return { slot, name, icon, rar: 'legendary', unique: id, fx, text, set, cursed: !!cursed, lvl, mods, price: Math.round(110 * (1 + lvl * 0.25)), uid: (g.uidN = (g.uidN || 0) + 1) }
}
/* the set pieces worn right now, and the bonuses they grant */
GP.setCount = function (set) { return GSLOTS.filter(s => this.worn[s] && this.worn[s].set === set).length }
GP.applySets = function () {
  const g = this, p = g.p, have = {}; for (const k in SETS2) have[k] = g.setCount(k); const was = g.setsOn || {}
  const on = (k, n) => have[k] >= n, flip = (k, n, f) => { const a = (was[k] || 0) >= n, b = on(k, n); if (a !== b) f(b ? 1 : -1) }
  flip('berserker', 2, s => (g.rageMul *= Math.pow(1.4, s))); flip('berserker', 3, s => { g.frenzyBonus = (g.frenzyBonus || 0) + 0.3 * s; g.hunger += 2 * s })
  flip('hawk', 2, s => (g.allyMul += 0.25 * s))
  g.setsOn = have
}
/* equipping adds an item's mods to guts and unequipping takes them away again, so stats stay exact */
GP.applyItem = function (it, s) {
  const p = this.p, m = it.mods
  for (const k in m) { const v = m[k] * s
    if (k === 'might' || k === 'armor' || k === 'crit' || k === 'regen' || k === 'area' || k === 'magnet') p[k] += v
    else if (k === 'maxHp') { p.maxHp = Math.max(1, p.maxHp + v); p.hp = Math.min(p.hp, p.maxHp) }
    else if (k === 'haste') this.addHaste(v); else if (k === 'spd') p.spd *= Math.pow(1 + m[k], s)
    else if (k === 'dmgTaken') p.dmgTaken *= Math.pow(1 + m[k], s); else if (k === 'brandRes') this.brandRate *= Math.pow(1 - m[k], s)
    else if (k === 'abCannon') this.abBonus.cannon = (this.abBonus.cannon || 0) + v; else if (k === 'allyDmg') this.allyMul += v
    else this.gear[k] = (this.gear[k] || 0) + v }
  if (it.fx) this.gear['fx_' + it.fx] = (this.gear['fx_' + it.fx] || 0) + s
}
GP.equip = function (uid) {
  const i = this.pack.findIndex(x => x.uid === uid); if (i < 0) return; const it = this.pack[i], old = this.worn[it.slot]
  this.pack.splice(i, 1); if (old) { this.applyItem(old, -1); this.pack.push(old) } this.worn[it.slot] = it; this.applyItem(it, 1); this.applySets(); this.pver++
}
GP.unequip = function (slot) { const it = this.worn[slot]; if (!it || this.pack.length >= 24) return; this.applyItem(it, -1); this.worn[slot] = null; this.pack.push(it); this.applySets(); this.pver++ }
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
  else if (id === 'smoke') { p.inv = Math.max(p.inv, 1.5); g.fx.push({ kind: 'acid', x: p.x, y: p.y, rad: 70, t: 0, d: 2, smoke: 1, dmg: 0 }); for (const e of g.en) if (!e.d.boss && Math.hypot(e.x - p.x, e.y - p.y) < 120) e.stun = Math.max(e.stun, 2) }
  else { const e = g.nearest(p.x, p.y, 220); g.pr.push({ x: p.x, y: p.y, sx: p.x, sy: p.y, tx: e ? e.x : p.x + 70, ty: e ? e.y : p.y, t: 0, d: 0.6, z: 0, kind: 'bomb', dmg: 50 * (1 + g.depth() * 0.35), rad: 46 * (g.gear.fx_satchel ? 1.5 : 1), life: 2, hit: new Set() }) }
  return true
}

/* ---------- talents: three trees of seven rows. each row opens at a number of points spent in its own tree, and every
   gate is reachable from the rows above it (talents-check.js asserts it). choice rows are forks: take one of two or
   three, never more. a capstone, then a node that takes points forever with diminishing returns ----------
   node: [id, name, icon, max ranks, row, column 0-2, description(rank), choice group] */
const TREES = [
  ['sword', 'Black Swordsman', 'w:sweep', [
    ['iron', 'Heavier Iron', 'w:sweep', 3, 0, 0, r => `+${8 * r}% damage.`],
    ['cleave', 'Cleaving Arc', 'w:cleave', 3, 0, 2, r => `Dragonslayer Spin reaches ${15 * r}% further.`],
    ['reach', 'Long Reach', 'reach', 3, 1, 0, r => `+${5 * r}% weapon area${r >= 2 ? '; Dash gains a charge' : ' (rank 2: Dash gains a charge)'}.`],
    ['crush', 'Crushing Blows', 'might', 3, 1, 2, r => `+${4 * r}% crit${r >= 3 ? '; Cannon Burst gains a charge' : ' (rank 3: Cannon Burst gains a charge)'}.`],
    ['twin', 'Twin Cleave', 'w:cleave', 1, 2, 0, () => 'Every fourth swing of the Dragonslayer cleaves twice, out and back.', 'sw2'],
    ['ricochet', 'Ricochet Shell', 'w:cannon', 1, 2, 1, () => 'Cannon shells, from the arm or the ability, bounce on to two more foes.', 'sw2'],
    ['execute', 'Executioner', 'hunger', 1, 2, 2, () => 'Foes below a quarter of their HP take 60% more damage.', 'sw2'],
    ['momentum', 'Momentum', 'haste', 3, 3, 0, r => `Each kill speeds your attacks by ${r}% for a moment; the rush stacks and bleeds away.`],
    ['sunder', 'Sunder', 'wound', 3, 3, 2, r => `Critical hits deal ${200 + 30 * r}% damage instead of 200%.`],
    ['shockwave', 'Shockwave Cleave', 'lunge', 1, 4, 0, () => 'Dragonslayer Spin sends six shockwaves tearing out along the ground.', 'sw4'],
    ['godoedge', "Godo's Edge", 'r_godo', 1, 4, 2, () => 'Your swings sweep 40% wider and reach 15% further.', 'sw4'],
    ['blacksword', 'The Black Swordsman', 'beast', 1, 5, 1, () => 'Capstone. Every tenth kill, a phantom Dragonslayer spins around you for free.'],
    ['rep_sword', 'Iron Mastery', 'might', Infinity, 6, 1, r => `Repeatable: +3% damage a point, a little less each time (${r} taken).`]]],
  ['strug', 'Struggler', 'vigor', [
    ['hide', 'Thick Hide', 'vigor', 3, 0, 0, r => `+${15 * r} max HP.`],
    ['salve', 'Elf Salve', 'regen', 3, 0, 2, r => `+${(0.4 * r).toFixed(1)} HP regen; flasks ${20 * r}% stronger.`],
    ['ward', 'Brand Ward', 'talisman', 3, 1, 0, r => `The Brand fills ${12 * r}% slower.`],
    ['unbroken', 'Unbroken', 'plate', 3, 1, 2, r => `+${r} plate.`],
    ['glyphs', 'Burning Glyphs', 'wound', 1, 2, 0, () => 'While the Brand burns, you leave ink glyphs on the ground that set foes alight.', 'st2'],
    ['afterimage', 'Afterimage', 'stride', 1, 2, 1, () => 'Dash leaves an afterimage that draws nearby foes to it for two seconds.', 'st2'],
    ['lullaby', "Puck's Lullaby", 'puck', 1, 2, 2, () => 'Stand still for a moment and Puck heals 3% of your max HP a second.', 'st2'],
    ['laststand', 'Last Stand', 'ironwill', 3, 3, 0, r => `Below 30% HP you take ${Math.round(100 - 100 / (1 + 0.25 * r))}% less damage.`],
    ['oath', "Struggler's Oath", 'r_hawk', 3, 3, 2, r => `Every night you survive grants +${3 * r}% damage and +${5 * r} max HP for the rest of the run.`],
    ['inkburst', 'Brand-Ink Burst', 'talisman', 1, 4, 0, () => 'When the Brand starts to burn, an ink shockwave tears through everything on screen.', 'st4'],
    ['behelit', "Behelit's Pulse", 'r_behelit', 1, 4, 2, () => 'Every six seconds the Behelit pulses fear: foes close to you flee for a moment.', 'st4'],
    ['struggler', 'The Struggler', 'cloak', 1, 5, 1, () => 'Capstone. Once a night, a killing blow leaves you at 1 HP and untouchable for two seconds.'],
    ['rep_strug', 'Endure', 'vigor', Infinity, 6, 1, r => `Repeatable: +8 max HP a point, a little less each time (${r} taken).`]]],
  ['bers', 'Berserker', 'armor', [
    ['fury', 'Fury', 'fury', 3, 0, 0, r => `Rage fills ${15 * r}% faster.`],
    ['rush', 'Blood Rush', 'bloodrush', 3, 0, 2, r => `Frenzy and War Cry last ${r}s longer.`],
    ['hunger', "Beast's Hunger", 'hunger', 3, 1, 0, r => `Kills in the frenzy heal ${r} HP.`],
    ['will', 'Iron Will', 'ironwill', 3, 1, 2, r => `The armor drains ${Math.round(100 - 100 * 0.8 ** r)}% less.`],
    ['bloodtide', 'Blood Tide', 'vigor', 1, 2, 0, () => 'Heal 1% of the damage you deal; three times as much below 40% HP.', 'be2'],
    ['pack', 'Pack Leader', 'banner', 1, 2, 1, () => 'Your allies inherit half your crit chance and deal 20% more damage.', 'be2'],
    ['howl', 'Howl of the Beast', 'beast', 1, 2, 2, () => 'When the frenzy starts, foes around you are stunned for a moment.', 'be2'],
    ['endless', 'Endless Frenzy', 'fury', 3, 3, 0, r => `Each kill in the frenzy extends it by ${(0.05 * r).toFixed(2)}s.`],
    ['rending', 'Rending', 'w:cleave', 3, 3, 2, r => `Frenzy damage +${10 * r}%.`],
    ['darkbeast', 'Beast of Darkness', 'armor', 1, 4, 0, () => 'The Berserker Armor ultimate recharges 30% faster.', 'be4'],
    ['wolfskin', 'Wolf Skin', 'pelt', 1, 4, 2, () => 'In the frenzy you take 30% less damage.', 'be4'],
    ['berserker', 'The Berserker', 'beast', 1, 5, 1, () => 'Capstone. The armor drinks no HP, and in the frenzy every weapon fires twice as fast.'],
    ['rep_bers', 'Rage Eternal', 'fury', Infinity, 6, 1, r => `Repeatable: +2% frenzy damage a point, a little less each time (${r} taken).`]]],
]
const TNODE = {}; for (const [tid, , , nodes] of TREES) for (const [id, name, icon, max, row, col, desc, choice] of nodes) TNODE[id] = { tree: tid, name, icon, max, row, col, desc, choice }
/* row gates, in points spent in that tree: with two 3-rank nodes per open row and one pick per fork, each is reachable */
const ROWREQ = [0, 4, 8, 12, 16, 20, 21]
GP.treeSpent = function (tid) { let n = 0; for (const id in this.tal) if (TNODE[id].tree === tid) n += this.tal[id]; return n }
GP.canTalent = function (id) { const N = TNODE[id], r = this.tal[id] || 0; if (N.choice && Object.keys(this.tal).some(k => k !== id && TNODE[k].choice === N.choice)) return false; return this.tp > 0 && r < N.max && this.treeSpent(N.tree) >= ROWREQ[N.row] }
GP.takeTalent = function (id) {
  const g = this, p = g.p; if (!g.canTalent(id)) return; g.tp--; const r = (g.tal[id] = (g.tal[id] || 0) + 1), dim = Math.pow(0.97, r - 1)
  if (id === 'iron') p.might += 0.08; else if (id === 'reach') p.area += 0.05; else if (id === 'crush') p.crit += 0.04; else if (id === 'rep_sword') p.might += 0.03 * dim
  else if (id === 'hide') { p.maxHp += 15; g.heal(15) } else if (id === 'salve') p.regen += 0.4; else if (id === 'ward') g.brandRate *= 0.88; else if (id === 'unbroken') p.armor += 1; else if (id === 'rep_strug') { p.maxHp += 8 * dim; g.heal(8 * dim) }
  else if (id === 'fury') g.rageMul *= 1.15; else if (id === 'rush') g.armorDur += 1; else if (id === 'hunger') g.hunger += 1; else if (id === 'will') g.drain *= 0.8; else if (id === 'rep_bers') g.frenzyBonus = (g.frenzyBonus || 0) + 0.02 * dim
  else if (id === 'rending') g.frenzyBonus = (g.frenzyBonus || 0) + 0.1
  g.pver++
}
/* the talents that act in play: called once a frame */
GP.talTick = function (dt) {
  const g = this, p = g.p, t = g.tal
  if (g.mom) g.mom *= Math.exp(-dt / 1.5)
  if (t.lullaby) { if (p.moving) g.idleT = 0; else if ((g.idleT = (g.idleT || 0) + dt) > 1) g.heal(p.maxHp * 0.03 * dt) }
  if (t.glyphs && g.inkMode && (g.glyphT = (g.glyphT || 0) - dt) <= 0) { g.glyphT = 0.45; g.fx.push({ kind: 'fire', x: p.x, y: p.y, rad: 26, t: 0, d: 3, tick: 0, dmg: 8 * (1 + g.depth() * 0.3), glyph: 1 }) }
  if (t.behelit && (g.fearT = (g.fearT || 6) - dt) <= 0) { g.fearT = 6; for (const e of g.en) if (!e.d.boss && Math.hypot(e.x - p.x, e.y - p.y) < 110) e.fear = 1.5; g.fx.push({ kind: 'boom', x: p.x, y: p.y, rad: 40, t: 0, d: 0.4 }) }
  if (g.decoy && (g.decoy.t -= dt) <= 0) g.decoy = null
  if (g.pendT > 0) g.pendT -= dt
}
GP.sysReset = function () {
  this.ab = {}; this.abBonus = {}; this.gear = {}; this.worn = {}; this.pack = []; this.flasks = { heal: 2, dust: 0, smoke: 1, bomb: 2 }; this.tal = {}; this.tp = 0; this.cryT = 0; this.dustT = 0; this.swN = 0; this.bsN = 0; this.mom = 0; this.setsOn = {}
  this.learnAbil('spin'); this.learnAbil('dash')
}

/* at dawn: the oath's stacks, the satchel's bombs, the hawk set's recruit. after the eclipse, every apostle it brought
   crumbles to ash: no xp, no loot, the field is simply cleared for the day */
GP.dawnTick = function () {
  const g = this, p = g.p, T = g.tal
  if (T.oath) { p.might += 0.03 * T.oath; p.maxHp += 5 * T.oath }
  if (g.gear.fx_satchel) g.flasks.bomb += 2
  if (g.setCount('hawk') >= 3) g.applyUpg('ally:raider')
  if (g.nightN === 1) { for (const e of g.en) { if (e.dead) continue; e.dead = true; for (let i = 0; i < 8; i++) g.wisps.push({ x: e.x, y: e.y, z: e.d.h * (0.2 + g.R() * 0.6), vx: (g.R() - 0.5) * 30, vy: (g.R() - 0.5) * 20, vz: 14 + g.R() * 24, t: 0, ash: 1 }) } g.boss = null; g.dayBoss = null; g.eb = []; g.tele = [] }
}
