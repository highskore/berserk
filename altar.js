/* the blood altar ui: abilities in bronze diamond sockets along the bottom, flasks beside them, the party as round
   portraits with hp rings, buffs, a round compass minimap, the boss's cast bar, and the gear and talent screens.
   on a phone the abilities become round tap buttons at the bottom right and the flasks sit at the left. */
/* settings: auto-cast abilities (on), the ultimate (off, it costs hp), flasks below 30% hp (off). a preference, not
   progress, so it is remembered in this browser */
const SETTINGS = (() => { const d = { ab: 1, ult: 0, flask: 0 }; try { return Object.assign(d, JSON.parse(localStorage.getItem('berserk-settings') || '{}')) } catch (e) { return d } })()
const SETNAMES = [['ab', 'Auto-cast abilities', 'Each ability fires on its own when it would help. Manual presses always work too.'], ['ult', 'Auto ultimate', 'Let the Berserker Armor clamp shut on its own. It drinks your HP.'], ['flask', 'Auto-drink', 'Drink a healing draught below 30% HP.']]
const setHTML = () => '<h2>Settings</h2>' + SETNAMES.map(([k, n, d]) => `<button class="setrow ${SETTINGS[k] ? 'on' : ''}" data-act="set" data-k="${k}"><b>${n}</b><span>${d}</span><i>${SETTINGS[k] ? 'ON' : 'OFF'}</i></button>`).join('') + '<button class="btn close" data-act="close">Close <kbd>O</kbd></button>'
let PANEL = null, abarKey = '', partyKey = '', altarT = 0, gearSel = null, talSel = null, talTab = 'sword'
const abURL = id => iconURL('ab:' + id)
function altarBuild(g) {
  const ids = ABORDER, key = ABORDER.map(id => (g.ab[id] ? 1 : 0)).join('')
  if (key !== abarKey) {
    abarKey = key
    $('abar').innerHTML = ids.map(id => `<div class="ab${ABIL[id].ult ? ' ult' : ''}${g.ab[id] ? '' : ' locked'}" data-id="${id}" title="${ABIL[id].name}${g.ab[id] ? '' : id === 'armor' ? ': unlocks with the Berserker Armor card' : ': unlock from level-up cards'}"><i class="sk"><img src="${abURL(id)}" alt=""><i class="sw"></i></i><b class="secs"></b><em class="ch"></em><kbd>${ABKEY[id]}</kbd></div>`).join('')
    $('quick').innerHTML = FLORDER.map(id => `<div class="qs" data-id="${id}" title="${FLASK[id].name}"><img src="${iconURL(FLASK[id].icon)}" alt=""><em></em><kbd>${FLASK[id].key}</kbd></div>`).join('')
  }
  const pk = g.allies.filter(a => !a.leave && a.doom == null).map(a => a.id + a.lvl).join(',')
  if (pk !== partyKey) { partyKey = pk; $('party').innerHTML = g.allies.filter(a => !a.leave && a.doom == null).slice(0, 12).map(a => `<div class="pm"><i class="ring"><img src="${iconURL('ally:' + a.id)}" alt=""></i><span>${ALLY[a.id].name}<small>${a.lvl}</small></span></div>`).join('') + (g.allies.length > 12 ? `<div class="pm more">+${g.allies.length - 12}</div>` : '') }
}
function altarHud(g, dt) {
  altarBuild(g)
  for (const el of $('abar').children) { const id = el.dataset.id, a = g.ab[id]; if (!a) continue; const max = g.abCharges(id), ready = a.ch >= 1 && !(id === 'armor' && !(g.rageOn && g.rage >= 50 && g.armorT <= 0))
    const left = a.ch < max ? (1 - a.t) * ABIL[id].cd * g.abCdMul(id) : 0
    el.style.setProperty('--cd', (a.ch >= 1 ? 0 : (1 - a.t) * 100).toFixed(1) + '%'); el.classList.toggle('ready', ready)
    hudSet(el.querySelector('.secs'), 'text', a.ch >= 1 ? '' : Math.ceil(left) + ''); hudSet(el.querySelector('.ch'), 'text', max > 1 ? a.ch + '' : '') }
  for (const el of $('quick').children) { const n = g.flasks[el.dataset.id]; hudSet(el.querySelector('em'), 'text', n + ''); el.classList.toggle('empty', !n) }
  hudSet($('tpn'), 'text', g.tp ? g.tp + '' : '')
  if ((altarT -= dt) > 0) return; altarT = 0.1
  /* hp rings on the party, buffs, the compass */
  const live = g.allies.filter(a => !a.leave && a.doom == null); $('party').querySelectorAll('.ring').forEach((r, i) => { const a = live[i]; if (a) { r.style.setProperty('--hp', Math.round(a.hp / a.maxHp * 100) + '%'); r.classList.toggle('down', a.down > 0) } })
  const B = []; if (g.armorT > 0) B.push(['fury', 'Frenzy', g.armorT, 'buff']); if (g.cryT > 0) B.push(['banner', 'War Cry', g.cryT, 'buff']); if (g.dustT > 0) B.push(['regen', 'Elf Dust', g.dustT, 'buff']); if (g.inkMode) B.push(['wound', 'The Brand burns', 0, 'debuff']); if (g.bleed) B.push(['vigor', 'Bleeding', 0, 'debuff']); if (g.sense) B.push(['talisman', 'Sense loss ' + 'I'.repeat(g.sense), 0, 'debuff']); if (g.tired > 0) B.push(['ironwill', 'Exhausted', g.tired, 'debuff'])
  const bk = B.map(b => b[1] + Math.ceil(b[2])).join(); if ($('buffs')._k !== bk) { $('buffs')._k = bk; $('buffs').innerHTML = B.map(([i, n, t, k]) => `<div class="bf ${k}" title="${n}"><img src="${iconURL(i)}" alt="">${t ? `<em>${Math.ceil(t)}</em>` : ''}</div>`).join('') }
  const mc = $('minic'), x = mc.getContext('2d'), R = 60, S = 1 / 6; x.clearRect(0, 0, 120, 120); x.save(); x.beginPath(); x.arc(R, R, R - 1, 0, TAU); x.clip(); x.fillStyle = 'rgba(28,8,6,.82)'; x.fillRect(0, 0, 120, 120)
  x.strokeStyle = 'rgba(168,132,60,.25)'; x.beginPath(); x.arc(R, R, 30, 0, TAU); x.stroke()
  for (const e of g.en) { const dx = (e.x - g.p.x) * S, dy = (e.y - g.p.y) * S; if (dx * dx + dy * dy > R * R) continue; x.fillStyle = e.d.boss ? '#ff4a24' : e.elite ? '#e08a3a' : '#a01c14'; const s = e.d.boss ? 5 : 2; x.fillRect(R + dx - s / 2, R + dy - s / 2, s, s) }
  x.fillStyle = '#c9b78e'; for (const a of g.allies) x.fillRect(R + (a.x - g.p.x) * S - 1, R + (a.y - g.p.y) * S - 1, 2, 2)
  for (const k of g.pickups) { x.fillStyle = '#f0c48a'; x.fillRect(R + (k.x - g.p.x) * S - 1.5, R + (k.y - g.p.y) * S - 1.5, 3, 3) }
  x.fillStyle = '#fff'; x.fillRect(R - 2, R - 2, 4, 4); x.restore()
  hudSet($('minit'), 'text', g.pit ? 'THE PIT' : g.biome().name)
  /* the boss cast bar: the move being wound up, and how close it is to landing */
  const b = g.boss, P = b && b.ai && b.ai.plan; hudSet($('cast'), 'hide', !P); if (P) { const t0 = (P.st.find(s => !s.done) || P.st[P.st.length - 1] || { t: P.dur }).t; hudSet($('castn'), 'text', castName(b)); $('castb').style.width = pct(b.ai.t / Math.max(0.01, t0)) }
}
const CASTN = { wyaldA: 'Chest Maw', wyaldB: 'Ground Pound', wyaldC: 'Leap', wyaldD: 'Swipe', silatA: 'Urumi Lash', silatB: 'Chakrams', silatC: 'Katar Dash', silatD: 'Vanish', ganishkaA: 'Lightning Rain', ganishkaB: 'Thunder Lanes', ganishkaC: 'Storm Ring', ganishkaD: 'Fog Beasts', zoddA: 'Goring Charge', zoddB: 'Skyfall', zoddC: 'Gore', zoddD: 'Blade Ring', grunbeldA: 'Fire Breath', grunbeldB: 'Crystal Rain', grunbeldC: 'Tail Sweep', grunbeldD: 'Dragon Leap', countA: 'Slug Crush', countB: 'Tentacle Lash', countC: 'Bile', countD: 'Devour', rosineA: 'Lance Dive', rosineB: 'Wing Dust', rosineC: 'Proboscis', rosineD: 'Swarm' }
const castName = b => CASTN[b.type + b.ai.k] || 'Winding up'

/* ---------- gear screen, iron and veins: guts as a black red-rimmed silhouette with the slots on his body, stats and
   sets beside him, a riveted iron pack, and a tooltip that compares. a phone gets a plain list of what he wears ---------- */
const STATK = [['Damage', g => '+' + Math.round((g.p.might - 1) * 100) + '%'], ['Plate', g => g.p.armor.toFixed(1) + ' (−' + Math.round(100 - 1200 / (12 + g.p.armor)) + '% hits)'], ['Attack rate', g => '+' + Math.round((1 / g.p.cdr - 1) * 100) + '%'], ['Move speed', g => Math.round(g.p.spd)], ['Crit', g => Math.round(g.p.crit * 100) + '%'], ['Max HP', g => fmtN(g.p.maxHp)], ['HP regen', g => g.p.regen.toFixed(1) + '/s'], ['Damage taken', g => (g.p.dmgTaken >= 1 ? '+' : '') + Math.round((g.p.dmgTaken - 1) * 100) + '%']]
const itemCell = (it, act, on) => `<button class="cell r-${it.rar}${it.cursed ? ' cursed' : ''}${it.set ? ' setp' : ''}${on ? ' sel' : ''}" data-act="${act}" data-uid="${it.uid}" data-slot="${it.slot}"><img src="${iconURL(it.icon)}" alt="${it.name}">${it.cursed ? '<i class="cz"></i>' : ''}</button>`
function itemTip(g, it, worn) {
  const lines = Object.entries(it.mods).map(([k, v]) => statLine(k, v)), cmp = !worn && g.worn[it.slot], n = it.set && g.setCount(it.set)
  let c = ''; if (cmp) { const d = {}; for (const [k, v] of Object.entries(it.mods)) d[k] = (d[k] || 0) + v; for (const [k, v] of Object.entries(cmp.mods)) d[k] = (d[k] || 0) - v; c = `<p class="cmp"><small>Against ${cmp.name}</small>` + Object.entries(d).filter(([, v]) => Math.abs(v) > 1e-6).map(([k, v]) => { const l = statLine(k, v); return `<span class="${l.neg ? 'dn' : 'up'}">${l.neg ? '▼' : '▲'} ${l.t}</span>` }).join('') + '</p>' }
  return `<div class="tip r-${it.rar}"><small>${it.cursed ? '<em class="curse">Cursed</em> · ' : ''}${it.rar} · ${it.slot} · item level ${it.lvl}</small><b><img src="${iconURL(it.icon)}" alt="">${it.name}</b>${it.text ? `<p class="fx">${it.text}</p>` : ''}<p>${lines.map(l => `<span class="${l.neg ? 'dn' : ''}">${l.t}</span>`).join('<br>')}</p>${it.set ? `<p class="set"><b>${SETS2[it.set].name}</b> · ${n}/3 worn<br><span class="${n >= 2 ? 'on' : ''}">(2) ${SETS2[it.set].b2}</span><br><span class="${n >= 3 ? 'on' : ''}">(3) ${SETS2[it.set].b3}</span></p>` : ''}${c}<div class="acts">${worn ? `<button data-act="unequip" data-slot="${it.slot}">Unequip</button>` : `<button data-act="equip" data-uid="${it.uid}">Equip</button><button data-act="sell" data-uid="${it.uid}">Sell · ${Math.round(it.price * 0.35)} gold</button>`}</div></div>`
}
/* the sprite cropped to guts himself, so the silhouette fills the doll and the slots can sit on his body */
let DOLL = null
const dollFig = () => { if (DOLL) return DOLL; const c = gutsSprite(2, 'i', 0).golden, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 8) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
  const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1; o.getContext('2d').drawImage(c, -x0, -y0); return (DOLL = o.toDataURL()) }
/* each slot's cell (top-left) and the point on his body it is riveted to, in the 300x430 doll */
const DOLLS = { helm: [216, 128, 166, 212], charm: [236, 214, 188, 244], gauntlet: [236, 306, 212, 296], weapon: [4, 66, 102, 124], armor: [4, 280, 152, 284] }
function gearHTML(g) {
  const sel = gearSel && (gearSel.worn ? g.worn[gearSel.slot] : g.pack.find(i => i.uid === gearSel.uid)), on = (it, w) => !!sel && sel === it && !!gearSel.worn === w
  const sets = Object.values(SETS2).map(S => `<p class="setln"><span>${S.name}</span><b>${S.pieces.map(p => `<i class="${GSLOTS.some(s => g.worn[s] && g.worn[s].unique === p) ? 'on' : ''}"></i>`).join('')}</b></p>`).join('')
  const ties = GSLOTS.map(s => { const [x, y, ax, ay] = DOLLS[s]; return `<path class="${g.worn[s] ? 'lit' : ''}" d="M${x + 30} ${y + 28}L${ax} ${ay}"/><circle class="${g.worn[s] ? 'lit' : ''}" cx="${ax}" cy="${ay}" r="4"/>` }).join('')
  return `<h2>Equipment <small>${fmtN(g.p.gold)} gold</small></h2><div class="gwrap"><div class="doll"><img class="fig" src="${dollFig()}" alt=""><svg class="ties" viewBox="0 0 300 430">${ties}</svg>${GSLOTS.map(s => { const it = g.worn[s]; return `<div class="gs" style="left:${DOLLS[s][0]}px;top:${DOLLS[s][1]}px">${it ? itemCell(it, 'worn', on(it, true)) : `<span class="cell emp"></span>`}<small>${s}</small></div>` }).join('')}</div>
    <div class="wl">${GSLOTS.map(s => { const it = g.worn[s]; return it ? `<button class="li r-${it.rar}${it.cursed ? ' cursed' : ''}${on(it, true) ? ' sel' : ''}" data-act="worn" data-slot="${s}"><span class="cell r-${it.rar}"><img src="${iconURL(it.icon)}" alt=""></span><span><small>${s}${it.set ? ' · set' : ''}${it.cursed ? ' · cursed' : ''}</small><b>${it.name}</b><i>${it.text || Object.entries(it.mods).slice(0, 2).map(([k, v]) => statLine(k, v).t).join(', ')}</i></span></button>` : `<div class="li emp"><span class="cell emp"></span><span><small>${s}</small><b>Empty</b></span></div>` }).join('')}</div>
    <div class="stats2"><h3>Stats</h3>${STATK.map(([n, f]) => `<p><span>${n}</span><b>${f(g)}</b></p>`).join('')}<h3>Sets</h3>${sets}<h3>Flasks</h3>${FLORDER.map(id => `<p><span>${FLASK[id].name}</span><b>${g.flasks[id]}</b></p>`).join('')}</div>
    <div class="inv"><h3>Pack <small>${g.pack.length} / 24</small></h3><div class="grid">${Array.from({ length: 24 }, (_, i) => (g.pack[i] ? itemCell(g.pack[i], 'pack', on(g.pack[i], false)) : '<span class="cell emp"></span>')).join('')}</div>${sel ? itemTip(g, sel, gearSel.worn) : '<p class="hint">Pick an item to see it, compare it with what you wear, equip it or sell it. Elites and bosses drop gear; Godo and Puck sell it between nights.</p>'}</div></div><button class="btn close" data-act="close">Close <kbd>I</kbd></button>`
}
/* ---------- talent screen, iron and veins: three trees of round iron nodes on thick iron bars that run red where both
   ends are taken, iron-plate gates on the trunk, and a side tip. a phone gets one tree at a time as a list ---------- */
const TCX = c => 50 + c * 100, TCY = r => 26 + r * 82, TH = TCY(6) + 48
const talName = (row, ch) => (row === 5 ? 'Capstone' : row === 6 ? 'Endless' : ch ? 'Fork · take one' : 'Tier ' + (row + 1))
function talHTML(g) {
  const sel = talSel && TNODE[talSel], st = id => (g.tal[id] ? 'got' : g.canTalent(id) ? 'can' : g.treeSpent(TNODE[id].tree) >= ROWREQ[TNODE[id].row] ? 'open' : 'off')
  const rk = (id, max) => (max === Infinity ? '∞ ' + (g.tal[id] || 0) : (g.tal[id] || 0) + '/' + max)
  const tree = ([tid, tn, ticon, nodes]) => { const sp = g.treeSpent(tid)
    const bars = nodes.flatMap(b => nodes.filter(a => a[4] === b[4] - 1 && Math.abs(a[5] - b[5]) <= 1).map(a => { const d = `M${TCX(a[5])} ${TCY(a[4])}L${TCX(b[5])} ${TCY(b[4])}`; return `<path class="bar" d="${d}"/><path class="core${g.tal[a[0]] && g.tal[b[0]] ? ' lit' : ''}" d="${d}"/>` })).join('')
    const gates = ROWREQ.map((q, r) => (q ? `<i class="gate${sp >= q ? ' open' : ''}" style="top:${TCY(r) - 11}px" title="${q} points in the tree open this row">${q}</i>` : '')).join('')
    const forks = [...new Set(nodes.filter(n => n[7]).map(n => n[4]))].map(r => `<i class="fork" style="top:${TCY(r) - 30}px">take one</i>`).join('')
    return `<div class="tree"><h3><img src="${iconURL(ticon)}" alt="">${tn}<small>${sp} pts</small></h3><div class="tw" style="height:${TH}px"><svg class="links" viewBox="0 0 300 ${TH}">${bars}</svg>${gates}${forks}${nodes.map(([id, n, icon, max, row, col, , ch]) => `<button class="tn ${st(id)}${row === 5 ? ' cap' : row === 6 ? ' rep' : ''}${ch ? ' ch' : ''}${talSel === id ? ' sel' : ''}" data-act="node" data-id="${id}" style="left:${TCX(col) - 50}px;top:${TCY(row) - 23}px"><i class="fr"><img src="${iconURL(icon)}" alt=""></i><em>${rk(id, max)}</em><span>${n}</span></button>`).join('')}</div></div>` }
  const list = ([tid, , , nodes]) => ROWREQ.map((q, r) => { const ns = nodes.filter(n => n[4] === r), open = g.treeSpent(tid) >= q; return `<div class="rh${open ? '' : ' shut'}">${talName(r, ns[0][7])}<i>${q ? (open ? 'open' : 'needs ' + q + ' pts') : ''}</i></div>` + ns.map(([id, n, icon, max, , , desc]) => `<div class="li ${st(id)}"><i class="fr"><img src="${iconURL(icon)}" alt=""></i><span><b>${n}</b><i>${desc(Math.max(1, g.tal[id] || 0))}</i></span><em>${rk(id, max)}</em><button data-act="take" data-id="${id}" ${g.canTalent(id) ? '' : 'disabled'} aria-label="Take ${n}">+</button></div>`).join('') }).join('')
  return `<h2>Talents <small>${g.tp} point${g.tp === 1 ? '' : 's'} to spend</small></h2><div class="tabs">${TREES.map(([tid, tn]) => `<button data-act="tab" data-t="${tid}" class="${talTab === tid ? 'on' : ''}">${tn}</button>`).join('')}</div>
    <div class="trees">${TREES.map(tree).join('')}${sel ? `<div class="tip"><small>${TREES.find(t => t[0] === sel.tree)[1]} · ${talName(sel.row, sel.choice)}${ROWREQ[sel.row] ? ' · opens at ' + ROWREQ[sel.row] : ''}</small><b><img src="${iconURL(sel.icon)}" alt="">${sel.name}</b><p>${sel.desc(Math.max(1, g.tal[talSel] || 0))}</p><p class="rk">Rank ${rk(talSel, sel.max)}</p><div class="acts"><button data-act="take" data-id="${talSel}" ${g.canTalent(talSel) ? '' : 'disabled'}>Take · 1 point</button></div></div>` : '<p class="hint tip">Pick a node to read it. Points come every second level and from every boss. Rows open as you spend in a tree, a fork takes one of its three, and the endless node takes points forever.</p>'}</div>
    <div class="tlist">${list(TREES.find(t => t[0] === talTab))}</div><button class="btn close" data-act="close">Close <kbd>N</kbd></button>`
}
function openPanel(p) { if (state !== 'play' || game.over || game.pending) return; PANEL = PANEL === p ? null : p; gearSel = null; talSel = null; pver = -1; drawPanel() }
let panelVer = -1
function drawPanel() { const g = game; $('ovGear').hidden = PANEL !== 'gear'; $('ovTal').hidden = PANEL !== 'tal'; $('ovSet').hidden = PANEL !== 'set'; hudSet($('abar'), 'cls', SETTINGS.ab ? 'auto' : ''); if (!PANEL) return; const v = PANEL + g.pver + (gearSel ? 'g' + (gearSel.uid || gearSel.slot) : '') + (talSel || '') + talTab; if (panelVer === v) return; panelVer = v; if (PANEL === 'gear') $('gearP').innerHTML = gearHTML(g); else if (PANEL === 'set') $('setP').innerHTML = setHTML(); else $('talP').innerHTML = talHTML(g) }
for (const id of ['gearP', 'talP', 'setP']) $(id).addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return; const g = game, a = b.dataset.act
  if (a === 'close') { PANEL = null; drawPanel(); return }
  if (a === 'pack') gearSel = { uid: +b.dataset.uid }; else if (a === 'worn') gearSel = { worn: 1, slot: b.dataset.slot }
  else if (a === 'equip') { g.equip(+b.dataset.uid); gearSel = null } else if (a === 'sell') { g.sellItem(+b.dataset.uid); gearSel = null } else if (a === 'unequip') { g.unequip(b.dataset.slot); gearSel = null }
  else if (a === 'set') { SETTINGS[b.dataset.k] = SETTINGS[b.dataset.k] ? 0 : 1; try { localStorage.setItem('berserk-settings', JSON.stringify(SETTINGS)) } catch (e2) {} }
  else if (a === 'node') talSel = b.dataset.id; else if (a === 'take') g.takeTalent(b.dataset.id); else if (a === 'tab') talTab = b.dataset.t
  panelVer = -1; drawPanel()
})
$('abar').addEventListener('pointerdown', e => { const b = e.target.closest('.ab'); if (b && state === 'play' && !paused && !PANEL) { e.preventDefault(); game.cast(b.dataset.id) } })
$('quick').addEventListener('pointerdown', e => { const b = e.target.closest('.qs'); if (b && state === 'play' && !paused && !PANEL) { e.preventDefault(); game.useFlask(b.dataset.id) } })
$('gearB').onclick = () => openPanel('gear'); $('talB').onclick = () => openPanel('tal'); $('setB').onclick = () => openPanel('set')
const ABKEYS = { Digit1: 'spin', Digit2: 'cannon', Digit3: 'knives', Space: 'dash', KeyQ: 'cry', KeyE: 'keg', KeyR: 'armor' }, FLKEYS = { KeyZ: 'heal', KeyX: 'dust', KeyC: 'smoke', KeyV: 'bomb' }
function altarKey(e) {
  if (state !== 'play' || game.over || paused) return false
  if (e.code === 'KeyI') { openPanel('gear'); return true } if (e.code === 'KeyN' || e.code === 'KeyT') { openPanel('tal'); return true } if (e.code === 'KeyO') { openPanel('set'); return true }
  if (PANEL) { if (e.code === 'Escape') { PANEL = null; drawPanel(); return true } return true }
  if (game.pending) return false
  if (ABKEYS[e.code]) { game.cast(ABKEYS[e.code]); return true } if (FLKEYS[e.code]) { game.useFlask(FLKEYS[e.code]); return true }
  return false
}
