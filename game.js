/* the run: one endless march through the arc. day 1 is the golden age with the hawks, the first night is the
   eclipse, then brand nights forever. mechanics from all six prototypes unlock as the run deepens.
   ground units are internal pixels; positions live on the ground plane (y squashed only when drawn). */
const fmtT = t => { t = Math.max(0, Math.floor(t)); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0') }
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d }
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
/* big numbers stay short: 999, 1.2K, 3.4M, 5.6B, 7.8T, then 1.2E15; never NaN or Infinity on screen */
const fmtN = v => { if (!(v === v)) return '0'; v = Math.min(Math.abs(v), 1e300) * Math.sign(v); const a = Math.abs(v); if (a < 1000) return String(Math.round(v)); const u = ['K', 'M', 'B', 'T']; const k = Math.floor(Math.log10(a) / 3); if (k <= 4) { const s = (v / Math.pow(1000, k)).toFixed(1); return (s.endsWith('.0') ? s.slice(0, -2) : s) + u[k - 1] } const e = Math.floor(Math.log10(a)); return (v / Math.pow(10, e)).toFixed(1) + 'E' + e }

/* ---------- enemies (sc is sprite scale, h the screen height in px used for numbers and cuts) ---------- */
const EN = {
  soldier: { hp: 9, spd: 36, dmg: 7, r: 7, xp: 1, mass: 1, h: 38, sc: 0.92 },
  knight: { hp: 26, spd: 30, dmg: 11, r: 8, xp: 3, mass: 2, h: 40, sc: 1 },
  ghost: { hp: 5, spd: 53, dmg: 5, r: 6, xp: 1, mass: 0.6, h: 30, fly: 1, spirit: 1, sc: 0.85 },
  crawler: { hp: 14, spd: 48, dmg: 9, r: 8, xp: 2, mass: 1.2, h: 18, sc: 1 },
  troll: { hp: 40, spd: 32, dmg: 14, r: 11, xp: 4, mass: 3, h: 52, sc: 0.95 },
  imp: { hp: 7, spd: 67, dmg: 6, r: 6, xp: 1, mass: 0.6, h: 40, fly: 1, sc: 0.7 },
  /* foes that punish standing still: archers and spitters shoot from range, lancers and hounds wind up and charge */
  archer: { hp: 10, spd: 34, dmg: 5, r: 7, xp: 2, mass: 1, h: 38, sc: 0.92, role: 'ranged', shot: 'arrow' },
  lancer: { hp: 30, spd: 30, dmg: 10, r: 8, xp: 3, mass: 2, h: 40, sc: 1, role: 'charge' },
  hound: { hp: 20, spd: 46, dmg: 9, r: 8, xp: 2, mass: 1.4, h: 22, sc: 1.2, role: 'charge' },
  spitter: { hp: 9, spd: 50, dmg: 5, r: 6, xp: 2, mass: 0.6, h: 40, fly: 1, sc: 0.8, role: 'ranged', shot: 'bile' },
  /* the eclipse's apostles: four new lesser kinds, and smaller kin of the apostle bosses on the same rigs */
  horse: { hp: 60, spd: 40, dmg: 14, r: 10, xp: 6, mass: 4, h: 64, sc: 1, apo: 1, role: 'charge' },
  bloat: { hp: 130, spd: 22, dmg: 16, r: 14, xp: 8, mass: 8, h: 52, sc: 1, apo: 1, burst: 1 },
  winged: { hp: 40, spd: 60, dmg: 11, r: 9, xp: 6, mass: 2, h: 62, fly: 1, sc: 1, apo: 1, role: 'ranged', shot: 'bile' },
  snake: { hp: 85, spd: 38, dmg: 13, r: 11, xp: 7, mass: 5, h: 50, sc: 1, apo: 1 },
  lzodd: { hp: 150, spd: 42, dmg: 16, r: 12, xp: 10, mass: 8, h: 62, sc: 1, apo: 1, rig: 'zodd', role: 'charge' },
  lgrun: { hp: 200, spd: 28, dmg: 18, r: 14, xp: 12, mass: 12, h: 66, sc: 1, apo: 1, rig: 'grunbeld' },
  lcount: { hp: 170, spd: 24, dmg: 15, r: 15, xp: 10, mass: 12, h: 46, sc: 1, apo: 1, rig: 'count', role: 'ranged', shot: 'bile' },
  lrosine: { hp: 110, spd: 54, dmg: 12, r: 10, xp: 9, mass: 4, h: 56, fly: 1, sc: 1, apo: 1, rig: 'rosine' },
  zodd: { hp: 1500, spd: 44, dmg: 20, r: 18, xp: 50, mass: 30, h: 100, boss: 'NOSFERATU ZODD', ai: 'apostle', sc: 1 },
  count: { hp: 1300, spd: 26, dmg: 18, r: 24, xp: 50, mass: 40, h: 80, boss: 'THE COUNT', ai: 'apostle', sc: 1 },
  grunbeld: { hp: 2600, spd: 30, dmg: 24, r: 26, xp: 90, mass: 80, h: 120, boss: 'GRUNBELD', ai: 'apostle', sc: 1 },
  /* the kushan invasion: line infantry, archers, vanishing bakiraka, horned daka, war elephants with a howdah archer,
     sorcerers who call up beasts; and rosine's elves swarming her valley */
  ksoldier: { hp: 14, spd: 36, dmg: 8, r: 7, xp: 2, mass: 1.1, h: 46, sc: 0.95 },
  karcher: { hp: 10, spd: 34, dmg: 5, r: 7, xp: 2, mass: 1, h: 46, sc: 0.95, role: 'ranged', shot: 'arrow' },
  bakiraka: { hp: 16, spd: 62, dmg: 12, r: 7, xp: 3, mass: 1, h: 42, sc: 0.92, role: 'assassin' },
  daka: { hp: 64, spd: 34, dmg: 15, r: 11, xp: 5, mass: 5, h: 58, sc: 1.05, role: 'charge' },
  elephant: { hp: 280, spd: 26, dmg: 24, r: 24, xp: 16, mass: 40, h: 92, sc: 0.62, role: 'charge', howdah: 1 },
  sorcerer: { hp: 22, spd: 30, dmg: 6, r: 7, xp: 4, mass: 1, h: 52, sc: 0.95, role: 'summon' },
  elfling: { hp: 6, spd: 72, dmg: 5, r: 5, xp: 1, mass: 0.4, h: 30, fly: 1, sc: 0.7 },
  wyald: { hp: 1600, spd: 46, dmg: 22, r: 20, xp: 60, mass: 40, h: 110, boss: 'WYALD', ai: 'apostle', sc: 1 },
  silat: { hp: 900, spd: 72, dmg: 16, r: 9, xp: 50, mass: 6, h: 48, boss: 'SILAT', ai: 'apostle', sc: 1 },
  ganishka: { hp: 5200, spd: 16, dmg: 30, r: 34, xp: 160, mass: 200, h: 200, boss: 'EMPEROR GANISHKA', ai: 'apostle', fly: 1, sc: 1 },
  rosine: { hp: 1200, spd: 50, dmg: 16, r: 14, xp: 60, mass: 15, h: 90, boss: 'ROSINE', ai: 'apostle', fly: 1, sc: 1 },
  boscogn: { hp: 1700, spd: 30, dmg: 22, r: 16, xp: 50, mass: 40, h: 64, boss: 'BOSCOGN', ai: 'axe', sc: 1.45 },
  godhand: { hp: 2400, spd: 22, dmg: 24, r: 18, xp: 80, mass: 60, h: 92, boss: 'A HAND OF GOD', ai: 'god', fly: 1, sc: 1.15 },
  wraith: { hp: 1000, spd: 34, dmg: 15, r: 16, xp: 50, mass: 20, h: 60, boss: 'THE HOWLING HOST', ai: 'wraith', fly: 1, spirit: 1, sc: 1.7 },
  pitlord: { hp: 1500, spd: 29, dmg: 18, r: 20, xp: 50, mass: 30, h: 70, boss: 'THE PIT APOSTLE', ai: 'spit', sc: 1.1 },
}

/* ---------- weapons ---------- */
const WEAP = {
  sweep: { name: 'Dragonslayer', max: 8, desc: l => (l === 1 ? 'Huge slow arcs around Guts.' : l === 5 ? 'Swings back on the return stroke.' : '+damage, +reach, faster swings.'), cd: l => 1.9 - l * 0.1, dmg: l => 15 + l * 5, arc: l => Math.PI * (1 + l * 0.07), R: l => 52 + l * 4, twin: l => l >= 5 },
  beast: { name: 'Beast Swing', max: 1, evo: true, desc: () => 'EVOLVED. Two full spins, a bloody blur of iron.', cd: () => 1.6, dmg: () => 70, R: () => 88 },
  cleave: { name: 'Cleave', max: 8, desc: l => (l === 1 ? 'A heavy, narrow chop at the nearest foe. Huge knockback.' : '+damage, +reach.'), cd: l => 1.7 - l * 0.08, dmg: l => 26 + l * 8, arc: l => Math.PI * (0.62 + l * 0.04), R: l => 62 + l * 4 },
  lunge: { name: 'Charge Cleave', max: 8, desc: l => (l === 1 ? 'Lunges at the nearest foe and cleaves through. Stand still for a heavier overhead chop.' : '+damage, +reach, faster.'), cd: l => 1.5 - l * 0.07, dmg: l => 16 + l * 6, arc: l => Math.PI * (0.8 + l * 0.05), R: l => 58 + l * 4 },
  knives: { name: 'Throwing Knives', max: 7, desc: l => (l === 1 ? 'Fast knives where you face.' : '+1 knife' + (l >= 4 ? ', +pierce' : '')), cd: l => 1.1 - l * 0.05, n: l => 1 + Math.floor(l / 2), dmg: l => 6 + l * 2, pierce: l => (l >= 4 ? 3 : 1) },
  bolts: { name: 'Repeating Crossbow', max: 7, desc: l => (l === 1 ? 'Bursts of bolts at the nearest enemy.' : '+bolts, +damage.'), cd: l => 1.7 - l * 0.08, n: l => 2 + Math.floor(l / 2), dmg: l => 7 + l * 2 },
  cannon: { name: 'Arm Cannon', max: 7, desc: l => (l === 1 ? 'A gunpowder blast from the iron arm. Big knockback.' : '+damage, +blast size.'), cd: l => 3.6 - l * 0.22, dmg: l => 34 + l * 10, rad: l => 28 + l * 4 },
  bombs: { name: 'Powder Bombs', max: 7, desc: l => (l === 1 ? 'Lobbed bombs that burst on landing.' : '+bombs, +radius.'), cd: l => 2.9 - l * 0.12, n: l => 1 + Math.floor(l / 3), dmg: l => 18 + l * 6, rad: l => 30 + l * 3 },
  puck: { name: 'Puck', max: 5, desc: l => (l === 1 ? 'An elf that sprinkles healing dust.' : l === 3 ? '+ chestnut barrage stuns nearby foes.' : '+heal, more often.'), cd: l => 9 - l, heal: l => 7 + l * 3 },
}
const wl = w => Math.min(w.lvl, WEAP[w.id].max), ov = w => 1 + 0.12 * Math.max(0, w.lvl - WEAP[w.id].max)

/* ---------- level-up cards ---------- */
const UPG = {}
for (const id of ['sweep', 'cleave', 'lunge', 'knives', 'bolts', 'cannon', 'bombs', 'puck']) UPG['w:' + id] = { weapon: id, name: WEAP[id].name, desc: (g, l) => (l > WEAP[id].max ? 'Overdrive ' + (l - WEAP[id].max) + ': +12% damage (no cap).' : WEAP[id].desc(l)), apply: g => g.addWeapon(id) }
const PASSIVES = ['might', 'haste', 'plate', 'vigor', 'reach', 'magnet', 'stride', 'regen']
Object.assign(UPG, {
  might: { name: 'Might', desc: () => '+15% damage.', apply: g => (g.p.might += 0.15) },
  /* stacking stays open-ended but soft: cooldowns go as 1/(1+haste), speed and reach gains shrink as they grow */
  haste: { name: 'Battle Rhythm', desc: () => '+9% attack rate (cooldowns shrink, with diminishing returns).', apply: g => g.addHaste(0.09) },
  plate: { name: 'Plate', desc: () => '+1 plate: hits land softer (12 plate halves them, and it keeps going).', apply: g => (g.p.armor += 1) },
  vigor: { name: 'Vigor', desc: () => '+20 max HP, heal 20.', apply: g => { g.p.maxHp += 20; g.heal(20) } },
  reach: { name: 'Reach', desc: () => '+12% weapon area (diminishing).', apply: g => (g.p.area += 0.12 / Math.max(1, g.p.area - 0.5)) },
  magnet: { name: 'Scavenger', desc: () => '+40% pickup range (diminishing).', apply: g => (g.p.magnet *= 1 + 0.4 * 48 / g.p.magnet) },
  stride: { name: 'Stride', desc: () => '+10% move speed (diminishing).', apply: g => (g.p.spd *= 1 + 0.1 * 77 / g.p.spd) },
  regen: { name: 'Elf Dust', desc: () => '+0.6 HP regen per second.', apply: g => (g.p.regen += 0.6) },
  meat: { name: 'Roast Meat', filler: true, desc: () => 'Heal 30 HP.', apply: g => g.heal(30) },
  /* the berserker armor card wakes the rage; its own levels add raw power */
  armor: { name: 'Berserker Armor', desc: (g, l) => (l === 1 ? 'Taking hits fills Rage. At full Rage the armor clamps shut: a frenzy of faster, harder, wider swings that drinks your HP. +12% damage, +8% speed, +1 plate.' : '+12% damage, +8% speed, +1 plate.'), req: g => g.eclipsed, apply: g => { g.p.might += 0.12; g.p.spd *= 1.08; g.p.armor += 1; if (!g.rageOn) { g.rageOn = true; g.banner('THE ARMOR AWAKENS', 'rage fills as you bleed', 2.4) } } },
  fury: { name: 'Fury', desc: () => '+30% rage gain.', req: g => g.rageOn, apply: g => (g.rageMul *= 1.3) },
  ironwill: { name: 'Iron Will', desc: () => 'The armor drains 35% less HP (diminishing).', req: g => g.rageOn, apply: g => (g.drain *= 0.65) },
  bloodrush: { name: 'Blood Rush', desc: g => (g.armorDur >= 12 ? 'The frenzy is as long as it gets; Rage fills 15% faster instead.' : '+2s of frenzy (up to 12s).'), req: g => g.rageOn, apply: g => { if (g.armorDur >= 12) g.rageMul *= 1.15; else g.armorDur += 2 } },
  hunger: { name: "Beast's Hunger", desc: () => 'Each kill in the armor heals 1 HP.', req: g => g.rageOn, apply: g => (g.hunger += 1) },
  torch: { name: 'Torchlight', desc: () => '+25% light radius at night (diminishing). Spirits in the light take 3 damage a second.', req: g => g.eclipsed, apply: g => { g.light *= 1 + 0.25 / g.light; g.burn += 3 } },
  talisman: { name: "Schierke's Talisman", desc: () => 'The Brand fills 30% slower. Spirits that touch you take 15 damage.', req: g => g.eclipsed, apply: g => { g.brandRate *= 0.7; g.thorns += 15 } },
  banner: { name: 'Hawk Banner', rar: 'rare', desc: () => 'Allies deal +25% damage.', req: g => (!g.eclipsed || g.dayN >= 3) && g.allies.length > 0, apply: g => (g.allyMul += 0.25) },
  evo_beast: { name: 'Beast Swing', evo: true, desc: () => 'EVOLVE Dragonslayer + Berserker Armor: twin full spins, huge reach.', req: g => g.wlvl('sweep') >= 8 && g.ulvl('armor') >= 1, apply: g => { g.removeWeapon('sweep'); g.addWeapon('beast'); g.banner('BEAST SWING', 'the armor drinks the swing', 2.2) } },
  evo_salamander: { name: 'Salamander Bombs', evo: true, desc: () => 'EVOLVE Powder Bombs + Might: bombs leave burning ground and chain.', req: g => g.wlvl('bombs') >= 7 && g.ulvl('might') >= 1, apply: g => { g.p.salamander = true; g.banner('SALAMANDER BOMBS', '', 1.6) } },
})
/* companions: the hawks before the eclipse; after it, guts' later companions and hired swords.
   hawks lost to the eclipse can return from day 3, starting over at level 1. the party caps at four. */
const ALLY = {
  casca: { name: 'Casca', ai: 'duel', hawk: 1, desc: l => (l === 1 ? 'Recruit Casca: a fast duelist who dashes in and cuts.' : '+damage, faster cuts.') },
  judeau: { name: 'Judeau', ai: 'knives', hawk: 1, desc: l => (l === 1 ? 'Recruit Judeau: throws knives at whatever gets close.' : '+knives, +damage.') },
  pippin: { name: 'Pippin', ai: 'slam', hawk: 1, desc: l => (l === 1 ? 'Recruit Pippin: a wall of a man who slams the ground and stuns.' : '+slam size, +damage.') },
  corkus: { name: 'Corkus', ai: 'snipe', hawk: 1, desc: l => (l === 1 ? 'Recruit Corkus: a crossbow sniper who picks off the toughest foe.' : '+damage, faster reload.') },
  rickert: { name: 'Rickert', ai: 'bombs', hawk: 1, safe: 1, desc: l => (l === 1 ? 'Recruit Rickert: the young engineer lobs powder bombs into the thick of it. He was away at the Eclipse.' : '+bombs, +blast.') },
  gaston: { name: 'Gaston', ai: 'guard', hawk: 1, desc: l => (l === 1 ? "Recruit Gaston: Guts' lieutenant, sword and shield. He shoves foes off you; you take 15% less damage while he stands." : '+damage, +shove.') },
  griffith: { name: 'Griffith', ai: 'duel', hawk: 1, rapier: 1, desc: l => (l === 1 ? 'The White Hawk fights beside you: a rapier faster than any blade in the band.' : '+damage, faster thrusts.') },
  raider: { name: 'Hawk Raider', ai: 'duel', hawk: 1, squad: 1, desc: () => 'A Hawk raider joins the band: a plain sword in the line. Take as many as you like.' },
  serpico: { name: 'Serpico', ai: 'duel', desc: l => (l === 1 ? 'Serpico joins: a fencer who darts through the crowd, cutting.' : '+damage, faster cuts.') },
  isidro: { name: 'Isidro', ai: 'knives', desc: l => (l === 1 ? 'Isidro tags along: a thief who flings knives at anything close.' : '+knives, +damage.') },
  schierke: { name: 'Schierke', ai: 'snipe', desc: l => (l === 1 ? 'Schierke joins: a witch whose spirit bolts seek the strongest foe.' : '+damage, faster casting.') },
  sellsword: { name: 'Sellsword', ai: 'slam', desc: l => (l === 1 ? 'Hire a sellsword: a brute whose poleaxe knocks the horde flat.' : '+slam size, +damage.') },
}
/* no cap on the party: the band can grow as large as the cards allow. instead each ally's damage is scaled so the
   whole party's output grows as n^0.6, and recruit cards thin out as the band swells */
const liveAllies = g => g.allies.filter(a => a.doom == null && !a.leave), partyK = g => { const n = Math.max(1, liveAllies(g).length); return Math.pow(n, 0.6) / n }
for (const id in ALLY) UPG['ally:' + id] = {
  name: ALLY[id].name, title: g => (g.lost[id] ? ALLY[id].name + ' returns' : ALLY[id].name),
  desc: (g, l) => (l === 1 && g.lost[id] ? 'The Hawk you lost at the Eclipse fights beside you again, starting over at level 1.' : ALLY[id].desc(l)),
  rar: g => (id === 'griffith' ? 'legendary' : ALLY[id].squad ? 'common' : ALLY[id].hawk && g.eclipsed ? 'epic' : 'rare'),
  w: g => 1 / (1 + liveAllies(g).length * 0.15),
  req: g => { const A = ALLY[id]; if (id === 'griffith') return !g.eclipsed && g.dayN === 1; if (A.squad) return !g.eclipsed || g.dayN >= 3; if (liveAllies(g).some(a => a.id === id)) return true; if (A.safe) return true; return A.hawk ? !g.eclipsed || (g.lost[id] && g.dayN >= 3) : g.eclipsed && g.dayN >= 2 },
  apply: g => { const a = !ALLY[id].squad && liveAllies(g).find(a => a.id === id); if (a) a.lvl++; else { g.allies.push(mkAlly(g, id)); if (g.eclipsed) g.banner(UPG['ally:' + id].title(g).toUpperCase(), g.lost[id] ? 'back from the Eclipse' : 'a new companion', 1.8); delete g.lost[id] } },
}
/* relics drop from bosses (the descent's stage rewards) */
const RELICS = {
  r_godo: { name: "Godo's Forging", desc: () => '+25% damage and +15% weapon area.', apply: g => { g.p.might += 0.25; g.p.area += 0.15 } },
  r_hawk: { name: 'Hawk Pendant', desc: () => '+40 max HP, fully healed.', apply: g => { g.p.maxHp += 40; g.p.hp = g.p.maxHp } },
  r_behelit: { name: 'Crimson Behelit', desc: () => '+40% damage, but you take 20% more.', apply: g => { g.p.might += 0.4; g.p.dmgTaken *= 1.2 } },
  r_rations: { name: 'Campaign Rations', desc: () => '+1.2 HP regen per second.', apply: g => (g.p.regen += 1.2) },
  r_arm: { name: 'The Iron Arm', desc: () => 'Gain the Arm Cannon at level 3.', apply: g => { for (let i = 0; i < 3; i++) g.addWeapon('cannon') } },
  r_spur: { name: "Rider's Spur", desc: () => '+20% move speed, +11% attack rate.', apply: g => { g.p.spd *= 1.2; g.addHaste(0.11) } },
}
for (const k in RELICS) UPG[k] = Object.assign({ relic: true, max: 1 }, RELICS[k])
for (const k in UPG) { const u = UPG[k]; if (u.max == null) u.max = u.evo ? 1 : u.filler ? 99 : 1e9 }
/* rarity: a tier per card, weighted when cards are drawn; deeper runs tilt the odds toward the rare ones */
const RARW = { common: 1, rare: 0.5, epic: 0.22, legendary: 0.09 }
Object.assign(UPG.armor, { rar: 'epic' }); Object.assign(UPG.bloodrush, { rar: 'epic' }); for (const k of ['might', 'haste', 'torch', 'talisman', 'fury', 'ironwill', 'hunger', 'r_hawk', 'r_rations', 'r_spur']) UPG[k].rar = 'rare'
UPG.r_godo.rar = UPG.r_arm.rar = 'epic'; UPG.r_behelit.rar = 'legendary'
function rarOf(g, id, cur) { const u = UPG[id]; if (typeof u.rar === 'function') return u.rar(g); if (u.rar) return u.rar; if (u.evo) return 'legendary'; if (u.weapon) return cur === 0 ? 'rare' : 'common'; return 'common' }
/* the shop between nights: godo's forge and puck's market, with tag sets */
const ITEMS = {
  dust: { name: 'Elf Dust', v: 'market', tags: ['elf'], price: 15, desc: '+0.8 HP regen.', apply: g => (g.p.regen += 0.8) },
  chest: { name: "Puck's Chestnut", v: 'market', tags: ['elf'], price: 16, desc: '+6% crit chance.', apply: g => (g.p.crit += 0.06) },
  charm: { name: "Flora's Charm", v: 'market', tags: ['elf', 'brand'], price: 18, desc: '+25% pickup range, +10 max HP.', apply: g => { g.p.magnet *= 1.25; g.p.maxHp += 10; g.heal(10) } },
  behelit: { name: 'Behelit Shard', v: 'market', tags: ['brand'], price: 24, desc: '+25% damage, -10 max HP.', apply: g => { g.p.might += 0.25; g.p.maxHp -= 10; g.p.hp = Math.min(g.p.hp, g.p.maxHp) } },
  wound: { name: 'Brand Wound', v: 'market', tags: ['brand'], price: 20, desc: '+12% damage, +5% crit chance.', apply: g => { g.p.might += 0.12; g.p.crit += 0.05 } },
  cloak: { name: 'Black Cloak', v: 'market', tags: ['steel'], price: 18, desc: '+2 plate, -5% speed.', apply: g => { g.p.armor += 2; g.p.spd *= 0.95 } },
  whet: { name: "Godo's Whetstone", v: 'forge', tags: ['steel'], price: 20, desc: '+10% damage, +6% area.', apply: g => { g.p.might += 0.1; g.p.area += 0.06 } },
  gears: { name: "Rickert's Gearwork", v: 'forge', tags: ['steel'], price: 22, desc: '+11% attack rate.', apply: g => g.addHaste(0.11) },
  pelt: { name: 'Wolf Pelt', v: 'market', tags: ['beast'], price: 14, desc: '+12% move speed.', apply: g => (g.p.spd *= 1.12) },
  boar: { name: 'Roast Boar', v: 'market', tags: [], price: 10, desc: 'Heal 40 HP.', apply: g => g.heal(40) },
  contract: { name: 'Mercenary Contract', v: 'market', tags: ['steel'], price: 34, rar: 'epic', desc: 'Hire a companion: a sellsword, Isidro, Serpico or Schierke. Once all four ride with you, it trains one instead.', req: g => g.eclipsed,
    apply: g => { const ids = ['sellsword', 'isidro', 'serpico', 'schierke'], free = ids.filter(id => !liveAllies(g).some(a => a.id === id)); const pick = free.length ? g.pick(free) : null
      if (pick) g.applyUpg('ally:' + pick); else if (g.allies.length) g.pick(liveAllies(g)).lvl++; else g.allyMul += 0.1 } },
}
for (const w of ['sweep', 'knives', 'bolts', 'cannon', 'bombs', 'cleave']) ITEMS['W' + w] = { name: WEAP[w].name, v: 'forge', tags: ['weapon'], weapon: w, price: { sweep: 30, knives: 22, bolts: 26, cannon: 32, bombs: 28, cleave: 28 }[w], apply: g => g.addWeapon(w) }
const SETS = { elf: { n: 3, name: 'Puck joins the fight', apply: g => g.addWeapon('puck') }, brand: { n: 3, name: 'Brand Hunger: +20% damage, heal on kill', apply: g => { g.p.might += 0.2; g.hungerHeal = 1 } }, steel: { n: 3, name: 'Iron Body: +3 plate', apply: g => (g.p.armor += 3) } }
const SENSES = [['COLOUR DRAINS', 'the world greys · loot x2'], ['SIGHT FADES', 'the hud dims · four choices per level'], ['ONLY INK REMAINS', 'loot x3, +30% damage']]

/* ---------- the clock: a long golden age, then dusk, night, dawn, day forever ---------- */
const DAY1 = 140, DUSK = 8, NIGHT = 62, DAWN = 8, DAY = 72, CYC = DUSK + NIGHT + DAWN + DAY
function phaseAt(t) {
  if (t < DAY1) return { k: 'day', u: t / DAY1, night: 0, day: 1 }
  const n = Math.floor((t - DAY1) / CYC); let r = (t - DAY1) % CYC
  for (const [k, d] of [['dusk', DUSK], ['night', NIGHT], ['dawn', DAWN], ['day', DAY]]) { if (r < d) return { k, u: r / d, night: n + 1, day: n + 1 + (k === 'day' ? 1 : 0) }; r -= d }
}
const nightAmt = ph => (ph.k === 'night' ? 1 : ph.k === 'dusk' ? ph.u : ph.k === 'dawn' ? 1 - ph.u : 0)
const BIOMES = [
  { name: 'MIDLAND BATTLEFIELD', tile: 'field', props: ['tree', 'spear', 'banner', 'rock', 'stake', 'sword', 'spear', 'campfire', 'wagon', 'torch'] },
  { name: 'DOLDREY', tile: 'stone', props: ['pillar', 'brazier', 'banner', 'rock', 'pillar', 'torch', 'brazier'] },
  { name: 'THE MISTY VALLEY', tile: 'field', mist: 1, props: ['tree', 'tree', 'tree', 'rock', 'tree', 'campfire', 'stake'] },
  { name: 'THE HILL OF SWORDS', tile: 'field', props: ['sword', 'sword', 'cross', 'wheel', 'tree', 'rock', 'campfire', 'torch'] },
  /* mid-to-late: a burning midland village overrun by the kushan */
  { name: 'THE KUSHAN INVASION', tile: 'field', kushan: 1, props: ['campfire', 'wagon', 'torch', 'banner', 'stake', 'wagon', 'campfire', 'rock'] },
]
/* each biome's day boss: zodd's duel on the battlefield, boscogn at doldrey, rosine in her valley, grunbeld late on the hill */
const DAYBOSS = ['zodd', 'wyald', 'rosine', 'grunbeld', 'silat'], NIGHTBOSS = ['wraith', 'zodd', 'godhand', 'count', 'grunbeld', 'boscogn']

function Game(opts) { this.opts = opts || {}; this.reset() }
const GP = Game.prototype
GP.reset = function () {
  const g = this
  g.seed = (this.opts.seed || (Date.now() & 0xffffff) || 1) >>> 0; g.t = 0; g.rt = 0; g.over = false; g.pending = null; g.pver = 0; g.queueLv = 0
  g.p = { x: 0, y: 0, hp: 100, maxHp: 100, spd: 77, armor: 0, regen: 0, might: 1, cdr: 1, area: 1, magnet: 48, face: 0.5, walk: 0, moving: false, inv: 0, lvl: 1, xp: 0, next: 6, kills: 0, gold: 0, swing: null, spin: null, crit: 0.05, dmgTaken: 1, mdx: 1, mdy: 0 }
  g.weapons = []; g.ups = {}; g.en = []; g.pr = []; g.eb = []; g.gems = []; g.coins = []; g.parts = []; g.pools = []; g.stains = []; g.texts = []; g.fx = []; g.allies = []; g.pickups = []; g.corpses = []; g.tele = []; g.wisps = []; g.riders = []
  g.flags = {}; g.cam = { x: 0, y: 0 }; g.shake = 0; g.hitstop = 0; g.spawnAcc = 0; g.input = { x: 0, y: 0 }; g.ban = null; g.boss = null; g.flashT = 0; g.flashC = null; g.bounds = null; g.choices = 3
  g.eclipsed = false; g.branded = false; g.brand = 0; g.brandRate = 1; g.light = 1; g.bleed = 0; g.burn = 0; g.thorns = 0; g.skT = 0; g.skRoll = false
  g.gore = { heat: 0, wet: 0, coat: 0 }
  g.rageOn = false; g.rage = 0; g.rageMul = 1; g.armorT = 0; g.armorDur = 8; g.drain = 3.2; g.hunger = 0; g.sense = 0; g.tired = 0
  g.allyMul = 1; g.lost = {}; g.tags = {}; g.sets = {}; g.reroll = 2; g.shops = 0; g.pit = false; g.lastPh = 'day'; g.nightN = 0; g.dayN = 1
  g.addWeapon('sweep'); g.allies.push(mkAlly(g, 'casca')); g.ups['ally:casca'] = 1; g.sysReset()
  g.banner('THE GOLDEN AGE', 'day 1 - ' + BIOMES[0].name.toLowerCase(), 3)
}
GP.R = function () { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296 }
GP.pick = function (a) { return a[Math.floor(this.R() * a.length)] }
GP.wlvl = function (id) { const w = this.weapons.find(w => w.id === id); return w ? w.lvl : 0 }
GP.ulvl = function (id) { return this.ups[id] || 0 }
GP.addWeapon = function (id) { const w = this.weapons.find(w => w.id === id); if (w) { w.lvl++; return w } const nw = { id, lvl: 1, cd: 0.4, ang: 0 }; this.weapons.push(nw); return nw }
GP.addHaste = function (k) { const p = this.p; p.haste = (p.haste || 0) + k; p.cdr = 1 / (1 + p.haste) }
GP.removeWeapon = function (id) { this.weapons = this.weapons.filter(w => w.id !== id) }
GP.heal = function (n) { const p = this.p, a = Math.min(n, p.maxHp - p.hp); if (a > 0) { p.hp += a; this.text(p.x, p.y, 52, '+' + Math.round(a), 'heal') } }
GP.text = function (x, y, z, s, col) { if (this.texts.length > 60) this.texts.shift(); this.texts.push({ x, y, z, s: String(s), col: col || 'dmg', t: 0 }) }
GP.banner = function (t, sub, dur) { this.ban = { t, sub: sub || '', d: dur || 2, a: 0, id: (this.ban ? this.ban.id : 0) + 1 } }
GP.setPending = function (p) { this.pending = p; this.pver++ }
GP.flash = function (c, a) { this.flashC = c; this.flashT = a }
GP.nearest = function (x, y, maxD) { let best = null, bd = (maxD || 1e9) ** 2; for (const e of this.en) { if (e.dead) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e } } return best }
GP.phase = function () { return phaseAt(this.t) }
GP.biome = function () { return BIOMES[(this.dayN - 1) % BIOMES.length] }
GP.depth = function () { return this.dayN + this.nightN }
/* the horde has no ceiling: polynomial in time, compounding 8% a minute past fifteen, and it reads the player's
   damage output, so a great build buys time but never immunity */
GP.threat = function () { const t = this.t; return Math.min(1e300, (1 + t / 100) * (1 + Math.floor((this.depth() - 1) / 6) * 0.45) * Math.pow(1.08, Math.max(0, t - 900) / 60)) }
GP.powerK = function () { const t = this.t; if (t < 300) return 1; const par = 30 * (1 + t / 50) * (1 + Math.max(0, t - 600) / 600); return 1 + (Math.max(1, Math.pow((this.dps || 0) / par, 0.6)) - 1) * Math.min(1, (t - 300) / 300) }
GP.hitMul = function () { const t = this.t; return Math.min(1e300, Math.min(1, 0.55 + t / 240) * (1 + Math.max(0, t - 120) / 300) * Math.pow(1.06, Math.max(0, t - 1200) / 60) * Math.pow(this.powerK(), 0.25)) }
/* the eclipse is the whole first night: its own red-black look, its own horde, then dawn */
GP.eclipseOn = function () { return this.nightN === 1 && this.phase().k === 'night' }
/* ink is a state, not a time of day: the burning brand, the eclipse, or the last sense lost (which wears off) */
GP.inkOn = function () { return this.sense >= 3 || this.inkMode || this.eclipseOn() }
GP.style = function () { return this.inkOn() ? 'ink' : 'golden' }
/* frenzy power scales with fury and the beast swing; frenzy inside ink is the rare peak */
GP.frenzyMul = function () { return this.armorT > 0 ? (1 + 0.6 * (1 + 0.1 * this.ulvl('fury') + (this.wlvl('beast') ? 0.2 : 0) + (this.frenzyBonus || 0))) * (this.inkMode ? 1.15 : 1) : 1 }
GP.dmgMul = function () { return (this.cryT > 0 ? 1 + this.cryMul : 1) * (this.inkMode ? 1.5 : this.branded ? 1 + this.brand / 400 : 1) * this.frenzyMul() * (this.sense >= 3 ? 1.3 : 1) * (this.eclipseOn() ? 1.45 : 1) }
GP.lootMul = function () { return this.sense >= 3 ? 3 : this.sense >= 1 ? 2 : 1 }
GP.spdMul = function () { return this.armorT > 0 ? 1.3 : this.tired > 0 ? 0.7 : 1 }

/* ---------- spawning: off screen on the open field, behind red warnings inside the pit ---------- */
GP.spawn = function (type, x, y, o) {
  const d = EN[type], g = this; let sc = (d.boss ? 1 + Math.max(0, g.t - 170) / 110 + (g.depth() - 2) * 0.25 : g.threat()) * g.powerK()
  if (x == null) {
    if (g.bounds) { const b = g.bounds; let k = 0; do { x = b.x0 + 20 + g.R() * (b.x1 - b.x0 - 40); y = b.y0 + 20 + g.R() * (b.y1 - b.y0 - 40); k++ } while (Math.hypot(x - g.p.x, y - g.p.y) < 90 && k < 20); g.tele.push({ x, y, type, t: 0.75, o }); return null }
    const a = g.R() * TAU, vw = g.view || { w: 480, h: 270 }; x = g.p.x + Math.cos(a) * (vw.w / 2 + 40); y = g.p.y + Math.sin(a) * ((vw.h / 2 + 60) / CAM.ky)
  }
  /* elites and mutated foes grow more common forever; neither ever reaches certainty, neither ever stops climbing */
  const elite = !d.boss && !d.apo && g.R() < 1 - Math.exp(-Math.max(0, g.t - 110) / 2000); if (elite) sc *= 6
  const mut = !d.boss && g.t > 720 && g.R() < 1 - Math.exp(-(g.t - 720) / 1500) ? g.pick(['swift', 'iron', 'burst']) : null
  if (type === 'soldier' && nightAmt(g.phase()) > 0.3 && g.R() < 0.08) (o = o || {}).lantern = 1
  const hp = Math.min(1e300, d.hp * sc)
  const e = Object.assign({ type, d, x, y, elite, mut, hp, maxHp: hp, kx: 0, ky: 0, flash: 0, face: 0, anim: g.R() * 4, dead: false, stun: 0, ai: { t: 0, s: 0 }, ph: g.R() * TAU, spd: d.spd * (0.9 + g.R() * 0.2) * (mut === 'swift' ? 1.5 : 1), born: g.t }, o || {})
  if (d.boss) { g.boss = e; g.banner(d.boss, BOSSSUB[type] || '', 2.4); g.shake = Math.max(g.shake, 6) }
  g.en.push(e); return e
}
const BOSSSUB = { wyald: 'leader of the black dog knights', silat: 'of the bakiraka, for a duel', ganishka: 'the fog takes the shape of his face', zodd: 'the immortal comes for a duel', count: 'the apostle feeds', grunbeld: 'the dragon of fire and crystal', rosine: 'the elf queen of the misty valley', boscogn: 'the tudor iron wall', godhand: 'it does not touch the ground', wraith: 'a hundred dead voices', pitlord: 'it was waiting under the sand' }
GP.spawnRing = function (type, n, r) { for (let i = 0; i < n; i++) { const a = (i / n) * TAU; this.spawn(type, this.p.x + Math.cos(a) * r, this.p.y + Math.sin(a) * r) } }
GP.rateSpawn = function (dt, rate, pick, cap) {
  const g = this; if (g.en.length >= (cap || 190) + Math.min(120, g.t / 5)) return
  g.spawnAcc += rate * dt; while (g.spawnAcc >= 1) { g.spawnAcc -= 1; g.spawn(g.t > 240 && g.R() < Math.min(0.3, (g.t - 240) / 1200) ? g.pick(['troll', 'knight', 'imp', 'crawler']) : pick(g.R())) }
}

/* ---------- damage, death and gore ---------- */
GP.damage = function (e, dmg, kx, ky, kb, o) {
  const g = this; if (e.dead) return; o = o || {}
  const crit = g.R() < g.p.crit, T = g.tal, G = g.gear; dmg *= g.p.might * g.dmgMul() * (crit ? 2 + 0.3 * (T.sunder || 0) : 1) * (T.execute && e.hp < e.maxHp * 0.25 ? 1.6 : 1) * (G.nightDmg ? 1 + G.nightDmg * nightAmt(g.phase()) : 1) * (e.mut === 'iron' ? 0.6 : 1) * (e.type === 'ganishka' ? (e.weakT > 0 ? 2.5 : 0.15) : 1); if (!(dmg < 1e300)) dmg = 1e300
  g.dmgAcc = (g.dmgAcc || 0) + Math.min(dmg, Math.max(0, e.hp)); e.hp -= dmg; e.flash = 0.09
  /* lifesteal from the blood-drunk affix and blood tide, tripled for the tide below 40% hp */
  const lee = (G.leech || 0) + (T.bloodtide ? 0.01 * (g.p.hp < g.p.maxHp * 0.4 ? 3 : 1) : 0); if (lee) g.p.hp = Math.min(g.p.maxHp, g.p.hp + Math.min(dmg, Math.max(0, e.hp + dmg)) * lee)
  if (kb) kb *= (1 + (G.knock || 0)) * (G.fx_anvil ? 2 : 1)
  if (kb) { const l = Math.hypot(kx, ky) || 1, m = Math.sqrt(e.d.mass); e.kx += (kx / l) * kb / m; e.ky += (ky / l) * kb / m }
  if ((dmg >= 10 && !o.quiet && g.texts.length < 36) || crit) g.text(e.x + (g.R() - 0.5) * 6, e.y, e.d.h + 2, fmtN(dmg), crit ? 'crit' : 'dmg')
  g.blood(e.x, e.y, e.d.h * 0.55, Math.min(8, 2 + dmg / 8), kx, ky, e.d.spirit)
  if (e.d.boss) {
    g.hitstop = Math.max(g.hitstop, 0.03); g.shake = Math.max(g.shake, 2); e.flinch = 0.12
    /* a burst of damage between moves staggers an apostle */
    if (e.ai && e.ai.plan === null) { e.burst = (e.burst || 0) + dmg; if (e.burst > e.maxHp * 0.07) { e.burst = 0; e.stagger = 0.6; e.ai.cd = Math.max(e.ai.cd || 0, 0.6) } }
  } else if (g.armorT > 0) g.shake = Math.max(g.shake, 1.5)
  if (e.hp <= 0) g.kill(e, kx, ky)
}
GP.kill = function (e, kx, ky) {
  const g = this; e.dead = true; g.p.kills++
  if (g.tal.momentum) g.mom = (g.mom || 0) + 0.01 * g.tal.momentum
  if (g.tal.blacksword && ++g.bsN % 10 === 0 && !g.p.spin) g.p.spin = { t: 0, a: g.p.face, w: -18, dur: 0.6, every: 0.15, tick: 0, R: 80 * g.p.area, dmg: 30 * (1 + g.depth() * 0.3), kb: 180 }
  /* trash xp thins out as the kill rate climbs, so a mowed horde can't outpace the curve; elites and apostles pay in chunks */
  const xp = e.d.xp * (e.elite ? 15 : e.d.apo ? 1 : 1 / (1 + (g.kps || 0) / 6)) * g.lootMul() * Math.max(1, Math.pow(g.threat() / 12, 0.3))
  if (e.mut === 'burst' || e.d.burst) for (let k = 0; k < 6; k++) { const an = (k / 6) * TAU + g.R(); g.eb.push({ x: e.x, y: e.y, vx: Math.cos(an) * 90, vy: Math.sin(an) * 90, life: 1.6, r: 4, dmg: 9, kind: 'bile' }) }
  if (e.d.boss) {
    for (let i = 0; i < 14; i++) g.dropGem(e.x + (g.R() - 0.5) * 50, e.y + (g.R() - 0.5) * 40, Math.ceil(xp / 14))
    for (let i = 0; i < 12; i++) g.coins.push({ x: e.x + (g.R() - 0.5) * 50, y: e.y + (g.R() - 0.5) * 40, v: 2 })
    g.pickups.push({ x: e.x, y: e.y, kind: 'chest', t: 0 }); g.pickups.push({ x: e.x + 14, y: e.y, kind: 'item', item: g.makeItem(null, 1), t: 0 }); g.tp++; g.text(g.p.x, g.p.y, 70, '+1 TALENT POINT', 'heal'); g.shake = 10; g.hitstop = 0.12; g.flash('#fff3b0', 0.5); g.boss = null; g.banner(e.d.boss + ' FALLS', '', 2)
  } else {
    g.dropGem(e.x, e.y, xp)
    if (e.elite && g.R() < 0.07) g.pickups.push({ x: e.x, y: e.y - 4, kind: 'item', item: g.makeItem(), t: 0 })
    if (g.R() < (e.elite ? 0.08 : 0.0015)) g.pickups.push({ x: e.x + 5, y: e.y, kind: 'flask', fl: g.pick(FLORDER), t: 0 })
    if (e.elite || g.R() < 0.07 * (g.pit ? 2 : 1)) g.coins.push({ x: e.x + 3, y: e.y, v: e.elite ? 5 : 1 })
    if ((e.elite && g.R() < 0.15) || g.R() < 0.012) g.pickups.push({ x: e.x - 4, y: e.y, kind: 'meat', t: 0 })
  }
  if (e.d.spirit) { for (let i = 0; i < 10; i++) g.wisps.push({ x: e.x, y: e.y, z: e.d.h * 0.6, vx: (g.R() - 0.5) * 50, vy: (g.R() - 0.5) * 50, vz: 10 + g.R() * 30, t: 0 }) }
  else {
    const gr = g.gore; gr.heat += e.d.boss ? 15 : e.elite ? 6 : e.d.apo ? 3 : 1; gr.wet = 1
    g.blood(e.x, e.y, e.d.h * 0.5, e.d.boss ? 50 : 12, 0, 0)
    g.pools.push({ x: e.x + (g.R() - 0.5) * 4, y: e.y + 2, s: Math.floor(g.R() * 6), r: e.d.boss ? 2 : e.type === 'troll' ? 1 : 0, t: 0 }); if (g.pools.length > 420) g.pools.shift()
    /* cut in half along the swing: the top flies off, the legs fall over */
    const l = Math.hypot(kx || 0, ky || 0) || 1, dx = (kx || g.R() - 0.5) / l, dy = (ky || g.R() - 0.5) / l
    g.corpses.push({ type: e.type, dying: BOSS[e.type] ? 1 : 0, v: e.type === 'soldier' && e.ph > Math.PI ? 1 : 0, elite: e.elite, x: e.x, y: e.y, face: e.face, frame: Math.floor(e.anim) & 3, t: 0, vx: dx * (60 + g.R() * 60), vy: dy * (40 + g.R() * 40), z: 0, vz: 70 + g.R() * 60, a: 0, va: (g.R() < 0.5 ? -1 : 1) * (5 + g.R() * 5), fall: g.R() < 0.5 ? -1 : 1 })
    if (g.corpses.length > 70) g.corpses.shift()
  }
  /* kills feed the rage, but a mowed-down horde no faster than a steady fight: the gain falls off with the kill rate */
  g.kpsAcc = (g.kpsAcc || 0) + 1; const kr = 1 / (1 + (g.kps || 0) / 3)
  if (g.rageOn) { if (g.armorT > 0) { g.rage += 1.6 * g.rageMul * kr; if (g.hunger) g.heal(g.hunger); if (g.tal.endless) g.armorT += 0.05 * g.tal.endless } else if (!(g.tired > 0)) g.rage = Math.min(100, g.rage + 0.35 * g.rageMul * kr) }
  if (g.hungerHeal && g.R() < 0.25) g.heal(1)
}
/* at the gem cap the farthest gem is folded into the new one, so xp follows the fight instead of piling up far behind */
GP.dropGem = function (x, y, v) {
  const g = this
  if (g.gems.length > 260) { let fi = 0, fd = -1; for (let i = 0; i < g.gems.length; i++) { const k = g.gems[i], d = (k.x - g.p.x) ** 2 + (k.y - g.p.y) ** 2; if (d > fd) { fd = d; fi = i } } v += g.gems[fi].v; g.gems.splice(fi, 1) }
  g.gems.push({ x, y, v, mag: false, t: 0 })
}
GP.blood = function (x, y, z, n, kx, ky, spirit) {
  const g = this; if (g.parts.length > 520) return; const l = Math.hypot(kx, ky) || 1
  for (let i = 0; i < n; i++) { const a = g.R() * TAU, s = 20 + g.R() * 60; g.parts.push({ x, y, z: z * (0.6 + g.R() * 0.6), vx: Math.cos(a) * s + (kx ? (kx / l) * 50 : 0), vy: Math.sin(a) * s + (ky ? (ky / l) * 50 : 0), vz: 30 + g.R() * 90, sp: spirit ? 1 : 0, life: 1.4 }) }
}
/* the blood on the dragonslayer: heat is the recent kills, fading over ~15s, and sets how far the coat spreads. wet
   is how fresh the last kill is; once it dries the coat darkens, then flakes off to clean steel within a minute */
GP.goreTick = function (dt) {
  const r = this.gore, tgt = 1 - Math.exp(-r.heat / 12); r.heat *= Math.exp(-dt / 15); r.wet = Math.max(0, r.wet - dt / 6)
  if (r.wet > 0) { if (tgt > r.coat) r.coat += (tgt - r.coat) * Math.min(1, dt * 4) }
  else r.coat = Math.max(0, Math.min(r.coat, 0.69) - dt / 90)
}
/* the coat quantised into the baked stages: 0 clean, 1-3 fresh specks, streaks, drenched, 4-5 dried specks, streaks */
GP.goreStage = function () {
  const r = this.gore, q = r.coat < 0.08 ? 0 : r.coat < 0.35 ? 1 : r.coat < 0.7 ? 2 : 3
  return !q ? 0 : r.wet > 0 ? q : q + 3
}
GP.hurt = function (dmg, src) {
  const g = this, p = g.p; if (p.inv > 0 || g.over || g.opts.god) return
  /* hits ramp forever; plate is a soft percentage (12 plate halves a hit) rather than a flat cut that zeroes it */
  const T = g.tal, G = g.gear
  dmg = Math.min(1e300, Math.max(1, dmg * p.dmgTaken * g.hitMul() * 12 / (12 + p.armor) * (g.gaston ? 0.85 : 1) * (T.laststand && p.hp < p.maxHp * 0.3 ? 1 / (1 + 0.25 * T.laststand) : 1) * (T.wolfskin && g.armorT > 0 ? 0.7 : 1)))
  if (src && src.d && !src.dead) { if (G.fx_reflect) g.damage(src, dmg * 0.3, src.x - p.x, src.y - p.y, 60, { quiet: true }); if (G.thornsG) g.damage(src, G.thornsG, 0, 0, 0, { quiet: true }); if (G.fx_talisman && src.d.spirit) g.damage(src, 30 * (1 + g.depth() * 0.4), 0, 0, 40) }
  p.hp -= dmg; p.inv = 0.6; p.hurtT = 0.6; g.shake = Math.max(g.shake, 3); g.text(p.x, p.y, 54, '-' + Math.round(dmg), 'hurt'); g.blood(p.x, p.y, 26, 6, 0, 0)
  if (g.rageOn && g.armorT <= 0) g.rage = Math.min(100, g.rage + dmg * 2.2 * g.rageMul)
  /* spirits feed the brand, but not while it burns, so the drain always wins */
  if (src && src.d && src.d.spirit && g.branded) { if (!g.inkMode) g.brand = Math.min(100, g.brand + 5 * g.brandRate); if (g.thorns) g.damage(src, g.thorns, 0, 0, 40) }
  if (G.fx_pendant && !(g.pendT > 0) && p.hp > 0 && p.hp < p.maxHp * 0.25) { g.pendT = 60; g.heal(p.maxHp * 0.3) }
  if (p.hp <= 0 && T.struggler && g.strugN !== g.nightN) { g.strugN = g.nightN; p.hp = 1; p.inv = 2; g.banner('NOT YET', 'the struggler endures', 1.4) }
  if (p.hp <= 0) { p.hp = 0; g.over = true; g.setPending({ type: 'dead' }) }
}

/* ---------- level-ups ---------- */
/* a level-up heals guts to full on the spot, before the card he picks is applied; the frenzy's drain keeps running */
GP.gainXp = function (v) {
  const p = this.p; p.xp = Math.min(1e300, p.xp + v * (1 + (this.gear.xp || 0))); let up = false, n = 0
  /* the curve steepens from level 15 with a cubic term; it never stops, it just slows. a vast gem pays out over
     several pickups (64 levels at a time) rather than looping forever */
  while (p.xp >= p.next && n++ < 64) { p.xp -= p.next; p.lvl++; p.next = Math.min(1e300, Math.round(5 + p.lvl * 4 + p.lvl * p.lvl * 0.25 + Math.max(0, p.lvl - 15) ** 3 * 0.045)); this.queueLv++; up = true; if (p.lvl % 2 === 0) this.tp++ }
  if (up && !this.over) { if (p.hp < p.maxHp) this.text(p.x, p.y, 58, '+HP', 'heal'); p.hp = p.maxHp; p.healT = 0.5 }
}
GP.pool = function () {
  const g = this, a = ['w:sweep', 'w:knives', 'w:bolts', 'w:bombs', ...PASSIVES, 'evo_beast', 'evo_salamander']
  a.push('banner', ...Object.keys(ALLY).map(id => 'ally:' + id))
  for (const id of ABORDER) if (id !== 'dash' || g.ab.dash) a.push('ab:' + id)
  if (g.eclipsed) a.push('w:cleave', 'w:lunge', 'w:cannon', 'w:puck', 'torch', 'talisman', 'armor', 'fury', 'ironwill', 'bloodrush', 'hunger')
  return a
}
GP.rollChoices = function (n, pool) {
  const g = this; pool = pool || g.pool(); n = n || g.choices
  const avail = pool.filter(id => {
    const u = UPG[id]; if (!u || (u.req && !u.req(g))) return false
    if (u.weapon) { if (WEAP[u.weapon].evo) return false; if (g.wlvl(u.weapon) === 0 && g.weapons.filter(w => !WEAP[w.id].evo).length >= 6) return false; if (u.weapon === 'sweep' && g.wlvl('beast')) return false; return true }
    return g.ulvl(id) < u.max
  })
  const cur = id => (UPG[id].weapon ? g.wlvl(UPG[id].weapon) : g.ulvl(id)), evo = avail.filter(id => UPG[id].evo), rest = avail.filter(id => !UPG[id].evo), out = []
  if (evo.length) out.push(evo[0])
  const locked = rest.filter(id => UPG[id].ability && !g.ab[UPG[id].ability]); if (locked.length && g.p.lvl % 3 === 0 && out.length < n) out.push(rest.splice(rest.indexOf(g.pick(locked)), 1)[0])
  const tilt = 1 + (g.depth() - 1) * 0.06
  while (out.length < n && rest.length) {
    const w = rest.map(id => { const r = rarOf(g, id, cur(id)); return RARW[r] * (r === 'common' ? 1 : tilt) * (UPG[id].w ? UPG[id].w(g) : 1) * (UPG[id].ability && !g.ab[UPG[id].ability] ? 3 : 1) }); let x = g.R() * w.reduce((s, v) => s + v, 0), i = 0
    while (i < w.length - 1 && (x -= w[i]) > 0) i++; out.push(rest.splice(i, 1)[0])
  }
  while (out.length < n) out.push('meat')
  return out.map(id => g.card(id))
}
GP.card = function (id) { const u = UPG[id], c = u.weapon ? this.wlvl(u.weapon) : u.ability ? (this.ab[u.ability] ? this.ab[u.ability].rank : 0) : this.ulvl(id); return { id, name: u.title ? u.title(this) : u.name, lvl: c + 1, isNew: c === 0 && !u.filler, evo: !!u.evo, relic: !!u.relic, rar: rarOf(this, id, c), desc: u.desc(this, c + 1) } }
GP.applyUpg = function (id) { const u = UPG[id]; if (!u) return; if (!u.weapon) this.ups[id] = (this.ups[id] || 0) + 1; u.apply(this) }
GP.choose = function (i) {
  const g = this, pd = g.pending; if (!pd) return
  if (pd.type === 'level' || pd.type === 'chest') { const c = pd.choices[i]; if (c) g.applyUpg(c.id); g.setPending(null); if (pd.after) pd.after(g) }
  else if (pd.type === 'shop') g.shopChoose(i)
}
GP.relicChest = function () {
  const g = this, pool = Object.keys(RELICS).filter(k => !g.ups[k]), ch = []
  while (ch.length < 3 && pool.length) ch.push(pool.splice(Math.floor(g.R() * pool.length), 1)[0])
  const choices = ch.length ? ch.map(id => g.card(id)) : g.rollChoices(g.choices)
  g.setPending({ type: 'chest', title: ch.length ? 'A RELIC FOR THE ROAD' : 'TREASURE', choices })
}
/* shop */
GP.openShop = function () { this.shops++; this.reroll = 2 + this.shops; this.setPending({ type: 'shop', title: "BETWEEN NIGHTS · GODO'S FORGE AND PUCK'S MARKET", items: this.shopRoll(), gold: this.p.gold }) }
GP.shopRoll = function () {
  const g = this, keys = Object.keys(ITEMS).filter(k => { const it = ITEMS[k]; return (!it.req || it.req(g)) && (!it.weapon || g.wlvl(it.weapon) > 0 || g.weapons.length < 6) }), out = []
  while (out.length < 6 && keys.length) {
    const k = keys.splice(Math.floor(g.R() * keys.length), 1)[0], it = ITEMS[k], l = it.weapon ? g.wlvl(it.weapon) : 0
    if (out.length === 2) { for (let j = 0; j < 2; j++) { const gi = g.makeItem(); out.push({ gear: gi, key: gi.icon, rar: gi.rar, name: gi.name, vendor: gi.slot === "charm" ? "Puck's Market" : "Godo's Forge", tags: [], price: gi.price, desc: gearDesc(gi), sold: false }) } const fl = g.pick(FLORDER); out.push({ flask: fl, key: FLASK[fl].icon, rar: "common", name: FLASK[fl].name + " ×2", vendor: "Puck's Market", tags: [], price: Math.round(FLASK[fl].price * 2 * (1 + g.shops * 0.1)), desc: FLASK[fl].desc, sold: false }) }
    out.push({ key: k, rar: it.rar || (it.price >= 28 ? 'rare' : 'common'), name: it.name + (it.weapon && l ? ' T' + (l + 1) : ''), vendor: it.v === 'forge' ? "Godo's Forge" : "Puck's Market", tags: it.tags, price: Math.round(it.price * (1 + g.shops * 0.15)), desc: it.weapon ? UPG['w:' + it.weapon].desc(g, l + 1) : it.desc, sold: false })
  }
  return out
}
const gearDesc = it => Object.entries(it.mods).map(([k, v]) => statLine(k, v).t).join(', ') + '. Item level ' + it.lvl + '.'
GP.shopChoose = function (i) {
  const g = this, pd = g.pending
  if (i === 'reroll') { if (g.p.gold >= g.reroll) { g.p.gold -= g.reroll; g.reroll += 2; pd.items = g.shopRoll() } pd.gold = g.p.gold; g.pver++; return }
  if (i === 'go') { g.setPending(null); return }
  const it = pd.items[i]; if (!it || it.sold || g.p.gold < it.price) return
  g.p.gold -= it.price; it.sold = true; pd.note = ''
  if (it.gear) { g.gainItem(it.gear); pd.gold = g.p.gold; g.pver++; return } if (it.flask) { g.flasks[it.flask] += 2; pd.gold = g.p.gold; g.pver++; return }
  const def = ITEMS[it.key]; def.apply(g)
  for (const t of def.tags) { g.tags[t] = (g.tags[t] || 0) + 1; const S = SETS[t]; if (S && g.tags[t] >= S.n && !g.sets[t]) { g.sets[t] = 1; S.apply(g); pd.note = 'SET BONUS: ' + S.name } }
  pd.gold = g.p.gold; g.pver++
}

/* ---------- the hawks ---------- */
/* the band forms up in rings around guts, six to a ring, as many rings as it takes */
const slotPos = i => { const ring = Math.floor(i / 6), a = (i % 6) / 6 * TAU + ring * 0.5 + 0.4, r = 30 + ring * 18; return [Math.cos(a) * r, Math.sin(a) * r * 0.75] }
function mkAlly(g, id) { const used = new Set(liveAllies(g).map(a => a.si)); let si = 0; while (used.has(si)) si++; const slot = slotPos(si); return { id, si, lvl: 1, x: g.p.x + slot[0], y: g.p.y + slot[1], slot, face: 0, anim: 0, cd: 0.5, moving: 0 } }
GP.updateAllies = function (dt) {
  const g = this, p = g.p, pk = partyK(g); g.gaston = false
  for (const a of g.allies) {
    if (a.leave) { a.fade = (a.fade || 0) + dt * 0.8; a.z = (a.z || 0) + dt * 30; if (a.fade >= 1) a.gone = true; continue }
    if (a.doom != null) { a.doom -= dt; if (a.doom <= 0) { a.fade = (a.fade || 0) + dt * 1.4; if (a.fade >= 1 && !a.gone) { a.gone = true; g.lost[a.id] = 1; g.ups['ally:' + a.id] = 0; g.blood(a.x, a.y, 20, 26, 0, 0); g.pools.push({ x: a.x, y: a.y, s: 1, r: 1, t: 0 }); g.text(a.x, a.y, 44, ALLY[a.id].name.toUpperCase(), 'crit'); for (let k = 0; k < 3; k++) g.spawn('ghost', a.x + (g.R() - 0.5) * 30, a.y + (g.R() - 0.5) * 20) } } continue }
    if (a.maxHp == null) { a.maxHp = 60; a.hp = 60 } a.maxHp = 60 + 20 * a.lvl; if (a.inv > 0) a.inv -= dt
    if (a.down > 0) { a.down -= dt; if (a.down <= 0) a.hp = a.maxHp * 0.5; continue }
    if (!(a.inv > 0)) { const e = g.nearest(a.x, a.y, 14); if (e && !e.d.boss) { a.hp -= e.d.dmg * 0.5 * Math.min(4, g.hitMul()); a.inv = 0.6; if (a.hp <= 0) { a.hp = 0; a.down = 8; g.text(a.x, a.y, 40, 'DOWN', 'hurt') } } }
    a.cd -= dt; const hx = p.x + a.slot[0], hy = p.y + a.slot[1], L = a.lvl, A = ALLY[a.id], mul = g.allyMul * pk * (A.squad ? 0.6 : 1) * (g.tal.pack ? 1.2 * (1 + 0.5 * p.crit) : 1)
    const move = (tx, ty, s) => { const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy); a.moving = d > 3; if (d > 2) { const v = Math.min(d, s * dt); a.x += (dx / d) * v; a.y += (dy / d) * v; a.face = Math.atan2(dy, dx); a.anim += dt * 6 } return d }
    const ai = A.ai
    if (ai === 'duel') { const e = g.nearest(a.x, a.y, 110); if (e && Math.hypot(e.x - hx, e.y - hy) < 140) { const d = move(e.x, e.y, 160 + L * 12); if (d < 18 && a.cd <= 0) { a.cd = Math.max(0.22, 0.75 - L * 0.06) * (A.rapier ? 0.55 : 1); g.damage(e, (10 + L * 5) * mul * (A.rapier ? 1.6 : 1), e.x - a.x, e.y - a.y, 60); g.fx.push({ kind: 'slash', x: e.x, y: e.y, t: 0, d: 0.2 }) } } else move(hx, hy, 135) }
    else if (ai === 'guard') { g.gaston = true; const e = g.nearest(p.x, p.y, 70); if (e) { const d = move(e.x, e.y, 150); if (d < 20 && a.cd <= 0) { a.cd = Math.max(0.35, 0.9 - L * 0.06); g.damage(e, (8 + L * 4) * mul, e.x - p.x, e.y - p.y, 200 + L * 20); g.fx.push({ kind: 'slash', x: e.x, y: e.y, t: 0, d: 0.2 }) } } else move(p.x + Math.cos(p.face) * 20, p.y + Math.sin(p.face) * 14, 140) }
    else if (ai === 'bombs') { move(hx, hy, 105); const e = g.nearest(a.x, a.y, 200); if (e && a.cd <= 0) { a.cd = Math.max(0.8, 2.6 - L * 0.15); for (let k = 0; k < Math.min(4, 1 + Math.floor(L / 3)); k++) g.pr.push({ x: a.x, y: a.y, sx: a.x, sy: a.y, tx: e.x + (g.R() - 0.5) * 30, ty: e.y + (g.R() - 0.5) * 24, t: 0, d: 0.65, z: 0, kind: 'bomb', dmg: (14 + L * 6) * mul, rad: 28 + L * 2, life: 2, hit: new Set() }); a.face = Math.atan2(e.y - a.y, e.x - a.x) } }
    else if (ai === 'knives') { move(hx, hy, 110); const e = g.nearest(a.x, a.y, 190); if (e && a.cd <= 0) { a.cd = Math.max(0.25, 0.8 - L * 0.06); for (let k = 0; k < Math.min(6, 1 + Math.floor(L / 2)); k++) { const an = Math.atan2(e.y - a.y, e.x - a.x) + (k - L / 4) * 0.15; g.pr.push({ x: a.x, y: a.y, z: 18, vx: Math.cos(an) * 290, vy: Math.sin(an) * 290, life: 0.8, dmg: (6 + L * 2) * mul, pierce: 1, r: 5, kind: 'knife', hit: new Set() }) } a.face = Math.atan2(e.y - a.y, e.x - a.x) } }
    else if (ai === 'slam') { move(hx, hy, 100); if (a.cd <= 0 && g.nearest(a.x, a.y, 60)) { a.cd = Math.max(0.9, 3 - L * 0.2); const R = Math.min(110, 38 + L * 6); g.fx.push({ kind: 'boom', x: a.x + Math.cos(a.face) * 10, y: a.y, rad: R * 0.6, t: 0, d: 0.3 }); g.shake = Math.max(g.shake, 3); for (const e of g.en) if (Math.hypot(e.x - a.x, e.y - a.y) < R) { g.damage(e, (16 + L * 7) * mul, e.x - a.x, e.y - a.y, 160); if (!e.d.boss) e.stun = 0.8 } } }
    else if (ai === 'snipe') { move(hx, hy, 110); if (a.cd <= 0) { let best = null, bh = 0; for (const e of g.en) { if (Math.hypot(e.x - a.x, e.y - a.y) < 250 && e.hp > bh) { bh = e.hp; best = e } } if (best) { a.cd = Math.max(0.3, 1.3 - L * 0.1); const an = Math.atan2(best.y - a.y, best.x - a.x); a.face = an; g.pr.push({ x: a.x, y: a.y, z: 20, vx: Math.cos(an) * 400, vy: Math.sin(an) * 400, life: 0.9, dmg: (14 + L * 6) * mul, pierce: 2, r: 5, kind: 'bolt', hit: new Set() }) } } }
  }
  g.allies = g.allies.filter(a => !a.gone)
  /* the skull knight rides through once in a while at night */
  for (const s of g.riders) {
    s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.anim += dt * 10
    if (s.t < 1.5) for (const e of g.en) if (!e.dead && !s.hit.has(e) && Math.hypot(e.x - s.x, e.y - s.y) < 38) { s.hit.add(e); g.damage(e, e.d.boss ? 250 : 999, s.vx, s.vy, 200) }
  }
  g.riders = g.riders.filter(s => s.t < 2.4)
}
GP.skullKnight = function () {
  const g = this, p = g.p, dir = g.R() < 0.5 ? 1 : -1, y = p.y + (g.R() - 0.5) * 40
  g.riders.push({ x: p.x - dir * 290, y, vx: dir * 410, vy: (p.y - y) * 0.4, face: dir > 0 ? 0 : Math.PI, anim: 0, t: 0, hit: new Set() })
  g.banner('THE SKULL KNIGHT', 'he cuts through the night', 2.6); g.brand = Math.max(0, g.brand - 50); g.shake = 8
}

/* ---------- the clock's events ---------- */
GP.once = function (key, cond, fn) { if (!this.flags[key] && cond) { this.flags[key] = 1; fn() } }
GP.updateWorld = function (dt) {
  const g = this, ph = g.phase(), t = g.t
  if (ph.k !== g.lastPh) {
    if (ph.k === 'dusk') { g.banner('DUSK', g.nightN === 0 ? 'the sun is going black' : 'the dead stir', 2) }
    if (ph.k === 'night') {
      g.nightN = ph.night; g.skT = 12 + g.R() * 20; g.skRoll = g.eclipsed && g.R() < 0.55
      if (!g.eclipsed) {
        g.eclipsed = g.branded = true; g.banner('THE ECLIPSE', 'the Brand claims the Hawks', 3.2); g.flash('#e81010', 1); g.shake = 10
        for (const e of g.en) if (e.type === 'soldier' || e.type === 'knight' || e.type === 'archer' || e.type === 'lancer') { g.blood(e.x, e.y, 20, 8, 0, 0); e.dead = true }
        if (g.boss) { g.boss.dead = true; g.boss = null }
        /* griffith ascends and leaves the band; rickert was never there; every other hawk is branded and falls */
        let i = 0; for (const a of g.allies) { if (a.id === 'griffith') { a.leave = 1; g.lost.griffith = 0 } else if (!ALLY[a.id].safe) { a.doom = 1.2 + i++ * 0.45; a.brand = true } }
        if (g.allies.some(a => a.leave)) g.fx.push({ kind: 'timer', t: 0, d: 2.2, fn: () => g.banner('GRIFFITH ASCENDS', 'the white hawk becomes Femto', 2.6) })
        const w = g.weapons.find(w => w.id === 'sweep'); if (w) w.lvl = Math.min(Math.max(w.lvl, 8), w.lvl + 2)
      } else if (g.nightN % 3 === 0) {
        g.pit = true; const p = g.p; g.bounds = { x0: p.x - 260, x1: p.x + 260, y0: p.y - 200, y1: p.y + 200 }
        for (const e of g.en) e.dead = true; g.banner('THE HELLHOUND PIT', 'night ' + g.nightN + ' - survive the walls', 2.6)
      } else g.banner('NIGHT ' + g.nightN, 'the dead come for the Brand', 2.4)
    }
    if (ph.k === 'dawn') { g.banner('DAWN', g.sense ? 'your senses return' : 'the spirits recede', 1.8); g.dawnTick(); g.sense = 0; g.senseT = 0; if (g.pit) { g.pit = false; g.bounds = null; g.tele = []; g.heal(g.p.maxHp) } }
    if (ph.k === 'day' && g.lastPh === 'dawn') {
      g.dayN = ph.day; const B = g.biome(); g.banner('DAY ' + g.dayN, B.name.toLowerCase() + (g.dayN > 3 ? ' - the dead are stronger' : ''), 2.6)
      if (!g.flags.puck) { g.flags.puck = 1; g.addWeapon('puck'); g.text(g.p.x, g.p.y, 60, 'PUCK JOINS', 'heal') }
      for (const e of g.en) if (e.d.spirit && !e.d.boss) e.flee = true
      g.openShop()
    }
    g.lastPh = ph.k
  }
  /* day 1: the encirclement and zodd's duel; later days bring the descent's stage bosses */
  if (g.dayN === 1 && ph.k === 'day') {
    g.once('ring', t >= 75, () => { g.spawnRing('soldier', 24, 180); g.banner('ENCIRCLED', 'the spear wall closes', 2) })
    g.once('zodd1', t >= 100, () => { g.dayBoss = g.spawn('zodd'); g.flash('#c03030', 0.6) })
  } else if (ph.k === 'day') g.once('dboss' + g.dayN, ph.u > 0.45, () => { g.dayBoss = g.spawn(DAYBOSS[(g.dayN - 1) % DAYBOSS.length]) })
  if (g.dayBoss && !g.dayBoss.dead && g.t - g.dayBoss.born > 45) { g.dayBoss.dead = true; if (g.boss === g.dayBoss) g.boss = null; g.banner(g.dayBoss.d.boss + ' WITHDRAWS', '', 2); g.dayBoss = null }
  if (ph.k === 'night') {
    if (g.nightN === 1) { /* the eclipse runs its own waves and lords (eclipseTick) */ }
    else if (g.pit) g.once('pit' + g.nightN, ph.u > 0.06, () => { const b = g.bounds; g.bounds = null; const e = g.spawn('pitlord', g.p.x, g.p.y - 140); g.bounds = b; e.hp = e.maxHp = 1300 + g.nightN * 500 })
    else if (BIOMES[(g.nightN - 1) % BIOMES.length].kushan) g.once('ganishka' + g.nightN, ph.u > 0.25, () => { g.spawn('ganishka', g.p.x, g.p.y - 150); g.flash('#efe8da', 0.8); g.banner('EMPEROR GANISHKA', 'strike between the eyes when they open', 3) })
    else g.once('nboss' + g.nightN, ph.u > 0.45, () => { g.spawn(NIGHTBOSS[(g.nightN - 2) % NIGHTBOSS.length]); g.flash('#efe8da', 0.5) })
    if (g.skRoll) { g.skT -= dt; if (g.skT <= 0) { g.skRoll = false; g.skullKnight() } }
  }
  /* the brand fills at night and when spirits touch you. full, it burns: the world turns to ink for ten
     seconds while it drains, you hit half again as hard, and you bleed */
  if (g.branded) {
    if (!g.inkMode) {
      if (ph.k === 'night') g.brand = Math.min(100, g.brand + 2 * g.brandRate * dt)
      if (g.brand < 100 && ph.k === 'day') g.brand = Math.max(0, g.brand - 2.5 * dt)
      if (g.brand >= 100) { g.inkMode = true; g.brand = 100; if (g.tal.inkburst) { const d = 100 * (1 + g.depth() * 0.4); for (const e of g.en) if (Math.abs(e.x - g.p.x) < 280 && Math.abs(e.y - g.p.y) < 200) g.damage(e, d, e.x - g.p.x, e.y - g.p.y, 120) } g.banner('THE BRAND BURNS', 'the world turns to ink', 2.2); g.flash('#b3141a', 0.7); g.spawnRing('ghost', 12, 130) }
    } else {
      g.brand -= 10 * dt
      if (!g.opts.god) { g.p.hp -= 3 * dt; if (g.p.hp <= 0) { g.p.hp = 0; g.over = true; g.setPending({ type: 'dead' }) } } if (g.R() < dt * 20) g.blood(g.p.x + 2, g.p.y, 30, 1, 0, 0)
      /* the burn always ends when the brand drains, and takes the last lost sense's ink with it */
      if (g.brand <= 0) { g.brand = 0; g.inkMode = false; if (g.sense >= 3) g.sense = 2; g.banner('THE BRAND COOLS', '', 1.4) }
    }
    g.bleed = g.inkMode ? 1 : 0
    if (g.burn && nightAmt(ph) > 0.5) { g.burnT = (g.burnT || 0) - dt; if (g.burnT <= 0) { g.burnT = 1; const R = 85 * g.light; for (const e of g.en) if (e.d.spirit && Math.hypot(e.x - g.p.x, e.y - g.p.y) < R) g.damage(e, g.burn, 0, 0, 0) } }
  }
  /* the berserker armor: full rage clamps it shut for a frenzy. faster, harder, wider swings, paid for in hp */
  if (g.rageOn) {
    const p = g.p; if (g.tired > 0) g.tired -= dt
    /* lost senses come back: one stage per 15s out of the armor, all of them by dawn */
    if (g.sense && g.armorT <= 0) { g.senseT = (g.senseT || 0) + dt; if (g.senseT >= 15) { g.senseT = 0; g.sense--; g.banner('A SENSE RETURNS', g.sense ? 'sense loss ' + 'I'.repeat(g.sense) : 'the world comes back', 1.6) } }
    g.choices = g.sense >= 2 ? 4 : 3
    if (g.armorT <= 0 && g.rage >= 100) { if (g.tal.howl) for (const e of g.en) if (!e.d.boss && Math.hypot(e.x - p.x, e.y - p.y) < 110) e.stun = Math.max(e.stun, 1.2); g.armorT = g.armorDur; g.rage = 0; g.senseHit = false; g.senseT = 0; p.spin = { t: 0, a: p.face, w: -16, dur: 0.7, every: 0.15, tick: 0, R: 70 * p.area, dmg: 20 + p.lvl * 2, kb: 160 }; g.banner('BERSERKER FRENZY', g.inkMode ? 'ink and blood' : 'it hungers', 1.8); g.flash('#0e0d0c', 0.5); g.shake = 6 }
    if (g.armorT > 0) {
      g.armorT -= dt; if (!g.opts.god && !g.tal.berserker) p.hp = Math.max(1, p.hp - g.drain * dt)
      /* overfilling rage inside the armor costs a sense, at most one per frenzy */
      if (g.rage >= 100) { g.rage = 0; if (!g.senseHit) { g.senseHit = true; g.sense = Math.min(3, g.sense + 1); const s = SENSES[g.sense - 1]; g.banner('SENSE LOSS: ' + s[0], s[1], 3.4); g.flash('#efe8da', 0.8) } }
      if (g.armorT <= 0) { g.tired = 5; g.banner('THE ARMOR RELEASES', '', 1.2) }
    }
  }
}
GP.spawnTick = function (dt) {
  const g = this, ph = g.phase(), t = g.t, n = nightAmt(ph), d = g.dayN
  /* shooters and chargers make up a growing share as the run deepens */
  const sp = Math.min(0.4, 0.08 + t / 2500)
  if (g.eclipseOn()) g.eclipseTick(dt, ph)
  else if (g.pit) { const w = g.nightN; g.rateSpawn(dt, 1.3 + w * 0.3 + ph.u * 3, r => (r < 0.25 ? 'crawler' : r < 0.45 ? 'troll' : r < 0.6 ? 'imp' : r < 0.7 ? 'hound' : r < 0.85 ? 'knight' : 'ghost'), 150 + w * 10) }
  else if (n > 0.5 && BIOMES[(g.dayN - 1) % BIOMES.length].kushan) g.rateSpawn(dt, 2.6 + t * 0.03, r => (r < 0.3 ? 'daka' : r < 0.5 ? 'hound' : r < 0.62 ? 'sorcerer' : r < 0.8 ? 'ghost' : 'imp'), 220)
  else if (n > 0.5) g.rateSpawn(dt, 2.6 + t * 0.03, r => (r < sp ? (r < sp / 2 ? 'hound' : 'spitter') : r < 0.6 ? 'ghost' : r < 0.82 ? 'imp' : r < 0.93 ? 'crawler' : 'troll'), 220)
  else if (ph.k === 'day' && g.biome().kushan) g.rateSpawn(dt, (1.3 + t * 0.045) * (g.boss && g.boss.type === 'silat' ? 0.35 : 1), r => (r < 0.34 ? 'ksoldier' : r < 0.54 ? 'karcher' : r < 0.64 ? 'bakiraka' : r < 0.8 ? 'daka' : r < 0.9 ? 'sorcerer' : r < 0.95 ? 'elephant' : 'ksoldier'))
  else if (ph.k === 'day' && g.biome().mist && g.R() < 0.35) g.rateSpawn(dt, 0.5 + t * 0.01, () => 'elfling')
  else if (ph.k === 'day') g.rateSpawn(dt, 1.3 + t * 0.045, d === 1 ? r => (t < 35 ? 'soldier' : r < 0.6 ? 'soldier' : r < 0.75 ? 'archer' : r < 0.82 ? 'lancer' : 'knight') : r => (r < sp ? (r < sp / 2 ? 'lancer' : 'archer') : r < 0.35 ? 'soldier' : r < 0.55 ? 'knight' : r < 0.8 ? 'crawler' : 'troll'))
}
/* the eclipse: apostles flood in from every side in waves, with two lesser apostle lords as mini-bosses */
const ECLAPO = ['horse', 'bloat', 'winged', 'snake', 'horse', 'winged', 'lzodd', 'lgrun', 'lcount', 'lrosine']
GP.eclipseTick = function (dt, ph) {
  const g = this
  g.rateSpawn(dt, 3 + ph.u * 4, r => (r < 0.3 ? 'imp' : r < 0.45 ? 'crawler' : r < 0.55 ? 'ghost' : g.pick(ECLAPO)), 230)
  if ((g.waveT = (g.waveT == null ? 6 : g.waveT) - dt) <= 0) { g.waveT = 13; g.wave = (g.wave || 0) + 1; const n = 4 + g.wave; for (let i = 0; i < n; i++) { const a = (i / n) * TAU + g.R(); g.spawn(g.pick(ECLAPO), g.p.x + Math.cos(a) * 210, g.p.y + Math.sin(a) * 170) } g.banner('THE APOSTLES DESCEND', 'wave ' + g.wave, 1.4) }
  g.once('ecl_rosine', ph.u > 0.22, () => { const e = g.spawn('rosine'); e.hp = e.maxHp *= 0.5 })
  g.once('ecl_count', ph.u > 0.58, () => { const e = g.spawn('count'); e.hp = e.maxHp *= 0.5 })
}

/* ---------- the step ---------- */
GP.step = function (dt) {
  const g = this; g.rt += dt
  if (g.pending || g.over) { g.updateFx(dt); return }
  if (g.hitstop > 0) { g.hitstop -= dt; return }
  g.t += dt; const p = g.p
  /* measured once a second: kills and damage per second, smoothed; the horde scales off the damage */
  if ((g.rateT = (g.rateT || 0) + dt) >= 1) { g.kps = (g.kps || 0) * 0.7 + (g.kpsAcc || 0) * 0.3 / g.rateT; g.dps = (g.dps || 0) * 0.85 + (g.dmgAcc || 0) * 0.15 / g.rateT; g.kpsAcc = g.dmgAcc = g.rateT = 0 }
  g.goreTick(dt)
  let ix = g.input.x, iy = g.input.y; const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il }
  let slow = 1; for (const f of g.fx) if ((f.kind === 'acid' || f.kind === 'dust') && !f.smoke && Math.hypot(p.x - f.x, p.y - f.y) < f.rad) slow = Math.min(slow, f.kind === 'acid' ? 0.5 : 0.6)
  const spd = p.spd * g.spdMul() * slow; p.moving = il > 0.15
  /* input is in screen space; the ground is squashed, so vertical screen motion covers more ground */
  if (p.held > 0) { p.held -= dt; p.moving = false }
  else if (p.moving) { p.x += ix * spd * dt; p.y += (iy * spd * dt) / Math.sqrt(CAM.ky); p.walk += dt * spd * 0.12; if (!p.swing && !p.spin) p.face = Math.atan2(iy, ix); p.mdx = ix / (il || 1); p.mdy = iy / (il || 1) }
  if (p.dash) { p.x += p.dash.vx * dt; p.y += p.dash.vy * dt; p.dash.t -= dt; if (p.dash.t <= 0) p.dash = null }
  if (g.bounds) { p.x = clamp(p.x, g.bounds.x0 + 10, g.bounds.x1 - 10); p.y = clamp(p.y, g.bounds.y0 + 10, g.bounds.y1 - 10) }
  if (p.inv > 0) p.inv -= dt; if (p.hurtT > 0) p.hurtT -= dt; if (p.regen) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt)
  g.cam.x += (p.x - g.cam.x) * Math.min(1, dt * 8); g.cam.y += (p.y - g.cam.y) * Math.min(1, dt * 8)
  g.talTick(dt); g.abilTick(dt); if (g.opts.auto) g.autoCast(g.opts.auto)
  g.updateWorld(dt); g.spawnTick(dt)
  for (const tl of g.tele) { tl.t -= dt; if (tl.t <= 0) { const b = g.bounds; g.bounds = null; g.spawn(tl.type, tl.x, tl.y, tl.o); g.bounds = b } } g.tele = g.tele.filter(t => t.t > 0)
  for (const w of g.weapons) { w.cd -= dt * (g.armorT > 0 ? (g.tal.berserker ? 2.6 : 1.3) : 1) * (1 + (g.mom || 0)); if (w.cd <= 0) { const nd = WFIRE[w.id](g, w); w.cd = (nd == null ? WEAP[w.id].cd(wl(w)) : nd) * p.cdr } if (w.id === 'bolts') boltTick(g, w, dt); if (w.id === 'puck') w.ang += dt * 2.4 }
  g.updateSwing(dt); g.updateSpin(dt); g.updateEnemies(dt); g.updateProj(dt); g.updateAllies(dt)
  const mg = p.magnet
  for (const k of g.gems) { k.t += dt; const dx = p.x - k.x, dy = p.y - k.y, d = Math.hypot(dx, dy) || 1; if (d < mg || k.mag) { k.mag = true; const s = Math.min(380, 70 + k.t * 50); k.x += (dx / d) * s * dt * Math.min(1, d); k.y += (dy / d) * s * dt * Math.min(1, d) } if (d < 9) { k.got = true; g.gainXp(k.v) } }
  g.gems = g.gems.filter(k => !k.got)
  for (const k of g.coins) { const dx = p.x - k.x, dy = p.y - k.y, d = Math.hypot(dx, dy) || 1; if (d < mg * 0.8 || k.mag) { k.mag = true; k.x += (dx / d) * 220 * dt; k.y += (dy / d) * 220 * dt } if (d < 9) { k.got = true; p.gold += Math.round(k.v * (1 + (g.gear.gold || 0))) * (g.pit ? 2 : 1) } }
  g.coins = g.coins.filter(k => !k.got)
  for (const k of g.pickups) { k.t += dt; if (Math.hypot(p.x - k.x, p.y - k.y) < 14) { k.got = true; if (k.kind === 'meat') g.heal(30); else if (k.kind === 'item') g.gainItem(k.item); else if (k.kind === 'flask') { g.flasks[k.fl]++; g.text(p.x, p.y, 60, '+' + FLASK[k.fl].name.toUpperCase(), 'heal') } else { for (const gm of g.gems) gm.mag = true; g.relicChest() } } }
  g.pickups = g.pickups.filter(k => !k.got)
  if (g.queueLv > 0 && !g.pending && !g.over) { g.queueLv--; g.setPending({ type: 'level', title: 'LEVEL ' + (p.lvl - g.queueLv), choices: g.rollChoices(g.choices) }) }
  g.updateFx(dt)
}
GP.updateFx = function (dt) {
  const g = this
  for (const q of g.parts) { q.vz -= 340 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.life -= dt; if (q.z <= 0) { q.life = 0; if (!q.sp && g.R() < 0.6) { g.stains.push({ x: q.x, y: q.y, s: g.R() < 0.3 ? 2 : 1 }); if (g.stains.length > 1600) g.stains.splice(0, 200) } } }
  g.parts = g.parts.filter(q => q.life > 0)
  for (const w of g.wisps) { w.t += dt; w.x += w.vx * dt; w.y += w.vy * dt; w.z += w.vz * dt } g.wisps = g.wisps.filter(w => w.t < 0.8)
  for (const t of g.texts) t.t += dt; g.texts = g.texts.filter(t => t.t < 0.8)
  for (const f of g.fx) f.t += dt; g.fx = g.fx.filter(f => f.t < f.d)
  for (const c of g.corpses) { if (c.dying > 0) { c.dying -= dt; continue } c.t += dt; if (c.z > 0 || c.t < 0.1) { c.vz -= 380 * dt; c.x2 = (c.x2 || 0) + c.vx * dt; c.y2 = (c.y2 || 0) + c.vy * dt; c.z = Math.max(0, c.z + c.vz * dt); c.a += c.va * dt; if (c.z === 0) { c.va = 0; c.vx *= 0.3; c.vy *= 0.3 } } }
  g.corpses = g.corpses.filter(c => c.t < 9)
  for (const pl of g.pools) if (pl.t < 1) pl.t += dt * 1.5
  if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 30)
  if (g.flashT > 0) g.flashT -= dt * 2.2
  if (g.p.healT > 0) g.p.healT -= dt
  if (g.ban) { g.ban.a += dt; if (g.ban.a > g.ban.d) g.ban = null }
}
GP.updateEnemies = function (dt) {
  const g = this, p = g.p, en = g.en, GW = 32, GH = 32, CS = 24, ox = p.x - (GW * CS) / 2, oy = p.y - (GH * CS) / 2
  if (!g.gridH) { g.gridH = new Int32Array(GW * GH); g.gridN = new Int32Array(1024) }
  g.gridH.fill(-1); if (g.gridN.length < en.length) g.gridN = new Int32Array(en.length * 2)
  for (let i = 0; i < en.length; i++) { const e = en[i], cx = Math.floor((e.x - ox) / CS), cy = Math.floor((e.y - oy) / CS); e._c = -1; if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) continue; const c = cy * GW + cx; e._c = c; g.gridN[i] = g.gridH[c]; g.gridH[c] = i }
  for (let i = 0; i < en.length; i++) {
    const e = en[i]; if (e.dead) continue; const d = e.d
    e.anim += dt * (d.fly ? 7 : e.spd * 0.11); if (e.flash > 0) e.flash -= dt; if (e.weakT > 0) e.weakT -= dt; if (e.flinch > 0) e.flinch -= dt; if (e.burst) e.burst *= Math.pow(0.3, dt)
    const lure = g.decoy && !d.boss && Math.abs(g.decoy.x - e.x) < 140 && Math.abs(g.decoy.y - e.y) < 140, tx = lure ? g.decoy.x : p.x, ty = lure ? g.decoy.y : p.y
    const dx = tx - e.x, dy = ty - e.y, dist = Math.hypot(dx, dy) || 1, pdist = lure ? Math.hypot(p.x - e.x, p.y - e.y) : dist
    if (e.stun > 0) e.stun -= dt
    else if (d.ai) BOSSAI[d.ai](g, e, dt, dx, dy, dist)
    else if (d.role && !e.flee) ROLE[d.role](g, e, dt, dx, dy, dist)
    else if (e.flee || e.fear > 0) { if (e.fear > 0) e.fear -= dt; e.x -= (dx / dist) * e.spd * dt; e.y -= (dy / dist) * e.spd * dt; if (dist > 400) e.dead = true }
    else { let mx = dx / dist, my = dy / dist; if (d.fly) { const w = Math.sin(g.t * 3 + e.ph) * 0.7; mx += -my * w; my += (dx / dist) * w } e.x += mx * e.spd * dt; e.y += my * e.spd * dt }
    if (dist > 2) e.face = e.flee ? Math.atan2(-dy, -dx) : Math.atan2(dy, dx)
    e.x += e.kx * dt; e.y += e.ky * dt; const fr = Math.pow(0.0015, dt); e.kx *= fr; e.ky *= fr
    if (e._c >= 0) {
      const cx = e._c % GW, cy = (e._c / GW) | 0
      for (let yy = cy - 1; yy <= cy + 1; yy++) for (let xx = cx - 1; xx <= cx + 1; xx++) {
        if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) continue
        for (let j = g.gridH[yy * GW + xx]; j >= 0; j = g.gridN[j]) { if (j === i) continue; const o = en[j]; if (o.dead) continue; const ddx = e.x - o.x, ddy = e.y - o.y, rr = d.r + o.d.r - 2, d2 = ddx * ddx + ddy * ddy; if (d2 < rr * rr && d2 > 0.01) { const dd = Math.sqrt(d2), push = (rr - dd) * 0.5 * Math.min(1, o.d.mass / d.mass); e.x += (ddx / dd) * push; e.y += (ddy / dd) * push } }
      }
    }
    if (pdist < d.r * (e.elite ? 1.25 : 1) + 6 && !e.flee && !(e.fear > 0) && !(e.z > 20)) g.hurt(d.dmg * (e.elite ? 1.6 : 1) * (e.rs === 2 ? 1.6 : 1) * (g.pit ? 1 + g.nightN * 0.08 : 1), e)
    if (!g.bounds && !d.boss && dist > 520) { const a = Math.atan2(dy, dx); e.x = p.x - Math.cos(a) * 290; e.y = p.y - Math.sin(a) * 300 }
    if (g.bounds) { e.x = clamp(e.x, g.bounds.x0 + 4, g.bounds.x1 - 4); e.y = clamp(e.y, g.bounds.y0 + 4, g.bounds.y1 - 4) }
  }
  g.en = en.filter(e => !e.dead)
}
/* ranged foes hold a ring around guts and loose after a visible draw; chargers stop, lock a line, then run it.
   e.rs is the state (0 move, 1 wind-up, 2 charging, 3 recover); e.aim the locked angle the telegraph draws */
const ROLE = {
  /* the bakiraka close in, vanish, and reappear just behind you for a quick lunge */
  assassin(g, e, dt, dx, dy, dist) {
    if (e.vanish > 0) { if ((e.vanish -= dt) <= 0) { const b = g.p.face + Math.PI + (g.R() - 0.5); e.x = g.p.x + Math.cos(b) * 46; e.y = g.p.y + Math.sin(b) * 36; e.rs = 1; e.wind = 0.4; e.aim = Math.atan2(g.p.y - e.y, g.p.x - e.x) } return }
    if (!e.rs && (e.cd = (e.cd == null ? 1 + g.R() * 2 : e.cd) - dt) <= 0 && dist < 150) { e.vanish = 1.1; e.cd = 4 + g.R() * 2; return }
    ROLE.charge(g, e, dt, dx, dy, dist)
  },
  /* sorcerers keep their distance and, after a visible chant, call up a pair of pishacha */
  summon(g, e, dt, dx, dy, dist) {
    const want = dist > 200 ? 1 : dist < 140 ? -0.8 : 0; e.x += (dx / dist) * want * e.spd * dt; e.y += (dy / dist) * want * e.spd * dt
    if ((e.cd = (e.cd == null ? 2 + g.R() * 3 : e.cd) - dt) <= 0) { e.cd = 7; e.chant = 0.9; g.fx.push({ kind: 'boom', x: e.x, y: e.y, rad: 26, t: 0, d: 0.9 }) }
    if (e.chant > 0 && (e.chant -= dt) <= 0) for (let i = 0; i < 2; i++) { const a = g.R() * TAU; g.spawn('hound', e.x + Math.cos(a) * 24, e.y + Math.sin(a) * 18) }
  },
  ranged(g, e, dt, dx, dy, dist) {
    e.cd = (e.cd == null ? 1 + g.R() * 2 : e.cd) - dt
    const want = dist > 175 ? 1 : dist < 115 ? -0.8 : 0, sw = Math.sin(g.t * 0.7 + e.ph) * 0.6
    if (e.rs !== 1) { e.x += ((dx / dist) * want - (dy / dist) * sw) * e.spd * dt; e.y += ((dy / dist) * want + (dx / dist) * sw) * e.spd * dt }
    if (e.rs !== 1 && e.cd <= 0 && dist < 260) { e.rs = 1; e.wind = 0.5; e.aim = Math.atan2(dy, dx) }
    if (e.rs === 1) { e.aim = Math.atan2(dy, dx); if ((e.wind -= dt) <= 0) { e.rs = 0; e.cd = 2.2 + g.R() * 1.2
      const n = e.d.shot === 'bile' ? 3 : 1, v = e.d.shot === 'bile' ? 120 : 175
      for (let k = 0; k < n; k++) { const an = e.aim + (k - (n - 1) / 2) * 0.22; g.eb.push({ x: e.x, y: e.y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, life: 2.4, r: e.d.shot === 'arrow' ? 3 : 4.5, dmg: e.d.dmg * 1.6 * (e.elite ? 1.6 : 1), kind: e.d.shot }) } } }
  },
  charge(g, e, dt, dx, dy, dist) {
    e.cd = (e.cd == null ? g.R() * 2 : e.cd) - dt
    /* the war elephant's howdah archer shoots while the beast lumbers on */
    if (e.d.howdah && (e.hcd = (e.hcd == null ? 2 : e.hcd) - dt) <= 0 && dist < 260) { e.hcd = 2.6; const an = Math.atan2(dy, dx); g.eb.push({ x: e.x, y: e.y, vx: Math.cos(an) * 175, vy: Math.sin(an) * 175, life: 2, r: 3, dmg: 10, kind: 'arrow' }) }
    if (!e.rs) { e.x += (dx / dist) * e.spd * dt; e.y += (dy / dist) * e.spd * dt; if (e.cd <= 0 && dist < 160) { e.rs = 1; e.wind = 0.65; e.aim = Math.atan2(dy, dx) } }
    else if (e.rs === 1) { if ((e.wind -= dt) <= 0) { e.rs = 2; e.wind = 0.55 } }
    else if (e.rs === 2) { const v = 290 + e.spd; e.x += Math.cos(e.aim) * v * dt; e.y += Math.sin(e.aim) * v * dt; if ((e.wind -= dt) <= 0) { e.rs = 3; e.wind = 0.9 } }
    else if ((e.wind -= dt) <= 0) { e.rs = 0; e.cd = 2.5 + g.R() * 1.5 }
  },
}
const BOSSAI = {
  apostle: apostleAI,
  spit(g, e, dt, dx, dy, dist) { const a = e.ai; a.t -= dt; e.x += (dx / dist) * e.spd * dt; e.y += (dy / dist) * e.spd * dt
    if (a.t <= 0) { a.t = 2.4; const base = Math.atan2(dy, dx); for (let k = -2; k <= 2; k++) { const an = base + k * 0.24; g.eb.push({ x: e.x, y: e.y, vx: Math.cos(an) * 115, vy: Math.sin(an) * 115, life: 3, r: 5, dmg: 12, kind: 'bile' }) } } },
  axe(g, e, dt, dx, dy, dist) { const a = e.ai; a.t -= dt
    if (a.s === 0) { e.x += (dx / dist) * e.spd * dt; e.y += (dy / dist) * e.spd * dt; if (a.t <= 0 && dist < 190) { a.s = 1; a.t = 0.8 } }
    else { e.flash = Math.sin(a.t * 30) > 0 ? 0.05 : 0; if (a.t <= 0) { a.s = 0; a.t = 3.4; g.shake = Math.max(g.shake, 8); g.eb.push({ x: e.x, y: e.y, ring: true, R: 12, v: 145, w: 10, life: 1.4, dmg: 18, kind: 'ring' }) } } },
  god(g, e, dt, dx, dy, dist) { const a = e.ai; a.t -= dt; a.u = (a.u || 0) - dt; const want = dist > 130 ? 1 : dist < 95 ? -0.6 : 0; e.x += (dx / dist) * e.spd * want * dt; e.y += (dy / dist) * e.spd * want * dt
    if (a.t <= 0) { a.t = 1.9; a.k = (a.k || 0) + 1; for (let i = 0; i < 14; i++) { const an = (i / 14) * TAU + a.k * 0.22; g.eb.push({ x: e.x, y: e.y, vx: Math.cos(an) * 85, vy: Math.sin(an) * 85, life: 4, r: 4.5, dmg: 12, kind: 'orb' }) } }
    if (a.u <= 0) { a.u = 6; for (let i = 0; i < 4; i++) { const an = g.R() * TAU; g.spawn('imp', e.x + Math.cos(an) * 36, e.y + Math.sin(an) * 30) } } },
  wraith(g, e, dt, dx, dy, dist) { const a = e.ai; a.t -= dt; e.x += (dx / dist) * e.spd * dt + Math.sin(g.t * 2) * 12 * dt; e.y += (dy / dist) * e.spd * dt; if (a.t <= 0) { a.t = 3.2; g.spawnRing('ghost', 7, 115) } },
}

/* ---------- weapons ---------- */
function aimDir(g, range) { const p = g.p, e = g.nearest(p.x, p.y, range); return e ? Math.atan2(e.y - p.y, e.x - p.x) : p.face }
function startSwing(g, dir, arc, R, dmg, kb, dur, o) { if (g.armorT > 0) { arc = Math.min(TAU * 0.95, arc * 1.3); R *= 1.1; kb *= 1.5 } const p = g.p, sg = Math.cos(dir) >= 0 ? 1 : -1; p.face = dir; p.swing = Object.assign({ t: 0, dur: dur || 0.26, dir, a0: dir - (arc / 2) * sg, a1: dir + (arc / 2) * sg, R, dmg, kb, hit: new Set() }, o || {}) }
GP.updateSwing = function (dt) {
  const g = this, p = g.p, s = p.swing; if (!s) return; s.t += dt
  const u = Math.min(1, s.t / s.dur), e2 = 1 - Math.pow(1 - u, 2.2), a = s.a0 + (s.a1 - s.a0) * e2; s.cur = a
  for (const e of g.en) {
    if (e.dead || s.hit.has(e)) continue; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); if (d > s.R + e.d.r) continue
    const da = angDiff(s.a0, Math.atan2(dy, dx)), span = a - s.a0
    if ((span >= 0 && da >= -0.15 && da <= span + 0.15) || (span < 0 && da <= 0.15 && da >= span - 0.15) || d < 12) { s.hit.add(e); g.damage(e, s.dmg, dx, dy, s.kb) }
  }
  if (u >= 1) { p.swing = null; if (s.big) g.shake = Math.max(g.shake, s.big); if (s.then) { const n = s.then; g.fx.push({ kind: 'timer', t: 0, d: 0.05, fn: () => { if (!p.swing) p.swing = Object.assign({ t: 0, hit: new Set(), dir: s.dir }, n) } }) } }
}
GP.updateSpin = function (dt) {
  const g = this, p = g.p, s = p.spin; if (!s) return; s.t += dt; s.a += s.w * dt; s.tick -= dt
  if (s.tick <= 0) { s.tick = s.every; for (const e of g.en) { if (e.dead) continue; const dx = e.x - p.x, dy = e.y - p.y; if (Math.hypot(dx, dy) < s.R + e.d.r) g.damage(e, s.dmg, dx, dy, s.kb, { quiet: true }) } }
  if (s.dur && s.t >= s.dur) p.spin = null
}
const WFIRE = {
  sweep(g, w) { const L = wl(w), W = WEAP.sweep, edge = g.tal.godoedge ? 1.15 : 1, R = W.R(L) * g.p.area * edge, dir = aimDir(g, R * 1.6), o = W.twin(L) || (g.tal.twin && ++g.swN % 4 === 0) ? { then: { R, dmg: W.dmg(L) * ov(w) * 0.7, kb: 90, dur: 0.22 } } : null
    startSwing(g, dir, W.arc(L) * (g.tal.godoedge ? 1.4 : 1), R, W.dmg(L) * ov(w), 110, 0.27, o); if (o) { const s = g.p.swing; s.then.a0 = s.a1; s.then.a1 = s.a0 } },
  beast(g, w) { if (g.p.spin) return 0.3; g.p.spin = { t: 0, a: g.p.face, w: -17, dur: 0.75, every: 0.18, tick: 0, R: WEAP.beast.R() * g.p.area, dmg: WEAP.beast.dmg() * ov(w), kb: 130, beast: true }; g.shake = Math.max(g.shake, 3) },
  cleave(g, w) { if (g.p.swing) return 0.15; const L = wl(w), W = WEAP.cleave, R = W.R(L) * g.p.area; startSwing(g, aimDir(g, R * 1.5), W.arc(L), R, W.dmg(L) * ov(w), 170, 0.2, { big: 3 }) },
  lunge(g, w) { if (g.p.swing) return 0.15; const L = wl(w), W = WEAP.lunge, p = g.p; let R = W.R(L) * p.area, dmg = W.dmg(L) * ov(w), o = { big: 2 }
    const e = g.nearest(p.x, p.y, R * 2.4), dir = e ? Math.atan2(e.y - p.y, e.x - p.x) : p.face
    if (!p.moving) { R *= 1.2; dmg *= 1.5; o = { big: 4 } } else if (e) { const d = Math.hypot(e.x - p.x, e.y - p.y), go = Math.max(0, Math.min(d - 12, 42)); p.dash = { vx: ((e.x - p.x) / d) * go / 0.12, vy: ((e.y - p.y) / d) * go / 0.12, t: 0.12 }; p.inv = Math.max(p.inv, 0.2) }
    startSwing(g, dir, W.arc(L), R, dmg, 150, 0.22, o) },
  knives(g, w) { const L = wl(w), W = WEAP.knives, p = g.p, n = W.n(L), base = p.moving ? Math.atan2(p.mdy, p.mdx) : p.face
    for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * 0.12; g.pr.push({ x: p.x, y: p.y, z: 22, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 0.9, dmg: W.dmg(L) * ov(w), pierce: W.pierce(L), r: 5, kind: 'knife', hit: new Set(), delay: i * 0.04 }) } },
  bolts(g, w) { w.burst = WEAP.bolts.n(wl(w)); w.bt = 0 },
  cannon(g, w) { const L = wl(w), W = WEAP.cannon, p = g.p, e = g.nearest(p.x, p.y, 250); if (!e) return 0.5; const a = Math.atan2(e.y - p.y, e.x - p.x)
    g.pr.push({ x: p.x, y: p.y, z: 26, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, life: 1.2, dmg: W.dmg(L) * ov(w), pierce: 1, r: 7, kind: 'ball', rad: W.rad(L) * p.area, hit: new Set() }); g.fx.push({ kind: 'muzzle', x: p.x + Math.cos(a) * 12, y: p.y + Math.sin(a) * 12, t: 0, d: 0.12 }); g.shake = Math.max(g.shake, 2.5) },
  bombs(g, w) { const L = wl(w), W = WEAP.bombs, p = g.p; for (let i = 0; i < W.n(L); i++) { const e = g.en.length ? g.pick(g.en) : { x: p.x + 70, y: p.y }; g.pr.push({ x: p.x, y: p.y, sx: p.x, sy: p.y, tx: e.x + (g.R() - 0.5) * 24, ty: e.y + (g.R() - 0.5) * 18, t: 0, d: 0.7, z: 0, kind: 'bomb', dmg: W.dmg(L) * ov(w), rad: W.rad(L) * p.area, life: 2, hit: new Set() }) } },
  puck(g, w) { const L = wl(w), nut = g.gear.fx_chestnut ? 2 : 1; g.heal(WEAP.puck.heal(L) * ov(w) * nut); g.fx.push({ kind: 'dust', x: g.p.x, y: g.p.y, t: 0, d: 0.9 }); if (L >= 3) for (const e of g.en) if (Math.hypot(e.x - g.p.x, e.y - g.p.y) < 85 * nut && !e.d.boss) { e.stun = 1.2; g.damage(e, 4, 0, 0, 0) } },
}
function boltTick(g, w, dt) { if (!w.burst) return; w.bt -= dt; if (w.bt > 0) return; w.bt = 0.08; w.burst--; const p = g.p, e = g.nearest(p.x, p.y, 280); if (!e) { w.burst = 0; return } const a = Math.atan2(e.y - p.y, e.x - p.x) + (g.R() - 0.5) * 0.1; g.pr.push({ x: p.x, y: p.y, z: 24, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, life: 0.8, dmg: WEAP.bolts.dmg(wl(w)) * ov(w), pierce: 1, r: 5, kind: 'bolt', hit: new Set() }) }
GP.explode = function (x, y, rad, dmg, fire) {
  const g = this; g.fx.push({ kind: 'boom', x, y, rad, t: 0, d: 0.35 }); g.shake = Math.max(g.shake, rad > 36 ? 5 : 3)
  for (const e of g.en) { if (e.dead) continue; const dx = e.x - x, dy = e.y - y; if (Math.hypot(dx, dy) < rad + e.d.r) g.damage(e, dmg, dx, dy, 150) }
  g.stains.push({ x, y, s: 3, soot: 1 }); if (fire) g.fx.push({ kind: 'fire', x, y, rad, t: 0, d: 2.5, tick: 0, dmg: dmg * 0.15 })
}
GP.updateProj = function (dt) {
  const g = this, p = g.p
  for (const q of g.pr) {
    if (q.delay > 0) { q.delay -= dt; q.x = p.x; q.y = p.y; continue }
    if (q.kind === 'bomb') { q.t += dt; const u = Math.min(1, q.t / q.d); q.x = q.sx + (q.tx - q.sx) * u; q.y = q.sy + (q.ty - q.sy) * u; q.z = Math.sin(u * Math.PI) * 40
      if (u >= 1) { q.life = 0; g.explode(q.x, q.y, q.rad * (g.gear.fx_satchel && !q.child ? 1.5 : 1), q.dmg, p.salamander || q.fire); if (p.salamander && !q.child) for (let k = 0; k < 2; k++) { const a = g.R() * TAU; g.pr.push({ x: q.x, y: q.y, sx: q.x, sy: q.y, tx: q.x + Math.cos(a) * 50, ty: q.y + Math.sin(a) * 50, t: 0, d: 0.5, z: 0, kind: 'bomb', dmg: q.dmg * 0.5, rad: q.rad * 0.7, life: 2, hit: new Set(), child: 1 }) } } continue }
    q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt
    for (const e of g.en) { if (e.dead || q.hit.has(e) || q.life <= 0) continue; if (Math.hypot(e.x - q.x, e.y - q.y) < e.d.r + q.r) { q.hit.add(e); if (q.kind === 'ball') { g.explode(q.x, q.y, q.rad, q.dmg); q.life = 0; if (q.bounce > 0) { let nx = null, nd = 1e9; for (const o of g.en) { if (o.dead || q.hit.has(o)) continue; const dd = Math.hypot(o.x - q.x, o.y - q.y); if (dd < 170 && dd < nd) { nd = dd; nx = o } } if (nx) { const an = Math.atan2(nx.y - q.y, nx.x - q.x); g.pr.push(Object.assign({}, q, { vx: Math.cos(an) * 300, vy: Math.sin(an) * 300, life: 0.8, bounce: q.bounce - 1, hit: new Set(q.hit) })) } } } else { g.damage(e, q.dmg, q.vx, q.vy, q.kind === 'bolt' ? 40 : 25); if (--q.pierce <= 0) q.life = 0 } } }
  }
  g.pr = g.pr.filter(q => q.life > 0)
  for (const f of g.fx) { if (f.kind === 'timer' && !f.done && f.t + dt >= f.d) { f.done = true; f.fn() } if (f.kind === 'fire') { f.tick -= dt; if (f.tick <= 0) { f.tick = 0.3; for (const e of g.en) if (Math.hypot(e.x - f.x, e.y - f.y) < f.rad * 0.7) g.damage(e, f.dmg, 0, 0, 0, { quiet: true }) } }
    /* boss hazards on the ground: burning ground, acid brood, scale-dust. they burn you; acid and dust slow you */
    if ((f.kind === 'bfire' || f.kind === 'acid' || f.kind === 'dust') && !f.smoke) { f.tick -= dt; if (f.tick <= 0) { f.tick = 0.5; if (Math.hypot(p.x - f.x, p.y - f.y) < (f.core || f.rad * 0.8)) g.hurt(f.dmg, null) } } }
  for (const b of g.eb) { b.life -= dt
    if (b.ring) { b.R += b.v * dt; if (Math.abs(Math.hypot(p.x - b.x, p.y - b.y) - b.R) < b.w) g.hurt(b.dmg, b) }
    else { b.x += b.vx * dt; b.y += b.vy * dt; if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 5) { g.hurt(b.dmg, b); b.life = 0 } } }
  g.eb = g.eb.filter(b => b.life > 0)
}
