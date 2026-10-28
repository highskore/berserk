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

/* ---------- gear screen: a paper doll with five slots, stats, a pack grid, and a tooltip that compares ---------- */
const STATK = [['Damage', g => '+' + Math.round((g.p.might - 1) * 100) + '%'], ['Plate', g => g.p.armor.toFixed(1) + ' (−' + Math.round(100 - 1200 / (12 + g.p.armor)) + '% hits)'], ['Attack rate', g => '+' + Math.round((1 / g.p.cdr - 1) * 100) + '%'], ['Move speed', g => Math.round(g.p.spd)], ['Crit', g => Math.round(g.p.crit * 100) + '%'], ['Max HP', g => fmtN(g.p.maxHp)], ['HP regen', g => g.p.regen.toFixed(1) + '/s'], ['Damage taken', g => (g.p.dmgTaken >= 1 ? '+' : '') + Math.round((g.p.dmgTaken - 1) * 100) + '%']]
const itemCell = (it, act) => `<button class="cell r-${it.rar}" data-act="${act}" data-uid="${it.uid}" data-slot="${it.slot}"><img src="${iconURL(it.icon)}" alt="${it.name}"></button>`
function itemTip(g, it, worn) {
  const lines = Object.entries(it.mods).map(([k, v]) => statLine(k, v)), cmp = !worn && g.worn[it.slot]
  let c = ''; if (cmp) { const d = {}; for (const [k, v] of Object.entries(it.mods)) d[k] = (d[k] || 0) + v; for (const [k, v] of Object.entries(cmp.mods)) d[k] = (d[k] || 0) - v; c = '<p class="cmp">' + Object.entries(d).filter(([, v]) => Math.abs(v) > 1e-6).map(([k, v]) => { const l = statLine(k, v); return `<span class="${l.neg ? 'dn' : 'up'}">${l.neg ? '▼' : '▲'} ${l.t}</span>` }).join('') + '</p>' }
  return `<div class="tip r-${it.rar}"><small>${it.rar.toUpperCase()} · ${it.slot.toUpperCase()} · ILVL ${it.lvl}</small><b>${it.cursed ? '<em class="curse">CURSED</em> ' : ''}${it.name}</b>${it.text ? `<p class="fx">${it.text}</p>` : ''}${it.set ? `<p class="set">${SETS2[it.set].name} · ${g.setCount(it.set)}/3 worn<br>2: ${SETS2[it.set].b2}<br>3: ${SETS2[it.set].b3}</p>` : ''}<p>${lines.map(l => `<span class="${l.neg ? 'dn' : ''}">${l.t}</span>`).join('<br>')}</p>${c}<div class="acts">${worn ? `<button data-act="unequip" data-slot="${it.slot}">Unequip</button>` : `<button data-act="equip" data-uid="${it.uid}">Equip</button><button data-act="sell" data-uid="${it.uid}">Sell · ${Math.round(it.price * 0.35)} gold</button>`}</div></div>`
}
function gearHTML(g) {
  const sel = gearSel && (gearSel.worn ? g.worn[gearSel.slot] : g.pack.find(i => i.uid === gearSel.uid))
  return `<h2>Guts · Equipment</h2><div class="gwrap"><div class="doll"><img class="fig" src="${gutsSprite(2, 'i', 0).golden.toDataURL()}" alt="">${GSLOTS.map(s => { const it = g.worn[s]; return `<div class="gs gs-${s}">${it ? itemCell(it, 'worn') : `<span class="cell emp"></span>`}<small>${s}</small></div>` }).join('')}</div>
    <div class="stats2"><h3>Stats</h3>${STATK.map(([n, f]) => `<p><span>${n}</span><b>${f(g)}</b></p>`).join('')}<h3>Flasks</h3>${FLORDER.map(id => `<p><span>${FLASK[id].name}</span><b>${g.flasks[id]}</b></p>`).join('')}</div>
    <div class="inv"><h3>Pack <small>${g.pack.length} / 24</small></h3><div class="grid">${Array.from({ length: 24 }, (_, i) => (g.pack[i] ? itemCell(g.pack[i], 'pack') : '<span class="cell emp"></span>')).join('')}</div>${sel ? itemTip(g, sel, gearSel.worn) : '<p class="hint">Pick an item to see it, compare it with what you wear, equip it or sell it. Elites and bosses drop gear; Godo and Puck sell it between nights.</p>'}</div></div><button class="btn close" data-act="close">Close <kbd>I</kbd></button>`
}
/* ---------- talent screen: three trees, rows unlocked by points spent in the tree ---------- */
function talHTML(g) {
  const cx = c => 50 + c * 100, cy = r => 30 + r * 62
  const sel = talSel && TNODE[talSel]
  return `<h2>Talents <small>${g.tp} point${g.tp === 1 ? '' : 's'} to spend</small></h2><div class="tabs">${TREES.map(([tid, tn]) => `<button data-act="tab" data-t="${tid}" class="${talTab === tid ? 'on' : ''}">${tn}</button>`).join('')}</div><div class="trees">${TREES.map(([tid, tn, ticon, nodes]) => `<div class="tree ${talTab === tid ? 'on' : ''}"><h3><img src="${iconURL(ticon)}" alt="">${tn}<small>${g.treeSpent(tid)} pts</small></h3><div class="tw"><svg class="links" viewBox="0 0 300 420">${nodes.flatMap(b => nodes.filter(a => a[4] === b[4] - 1 && Math.abs(a[5] - b[5]) <= 1).map(a => `<line x1="${cx(a[5])}" y1="${cy(a[4])}" x2="${cx(b[5])}" y2="${cy(b[4])}" class="${g.tal[b[0]] ? '' : 'dim'}"/>`)).join('')}</svg>${nodes.map(([id, n, icon, max, row, col]) => { const r = g.tal[id] || 0, open = g.treeSpent(tid) >= ROWREQ[row]
    return `<button class="tn ${row === 5 ? 'cap' : row === 6 ? 'rep' : ''} ${r ? 'got' : open ? 'open' : 'off'} ${g.canTalent(id) ? 'can' : ''} ${talSel === id ? 'sel' : ''}" data-act="node" data-id="${id}" style="left:${cx(col) - 26}px;top:${cy(row) - 26}px"><img src="${iconURL(icon)}" alt=""><em>${max === Infinity ? '∞ ' + r : r + '/' + max}</em><span>${n}</span><i class="plus">+</i></button>` }).join('')}</div></div>`).join('')}</div>
    ${sel ? `<div class="tip"><small>${TREES.find(t => t[0] === sel.tree)[1].toUpperCase()} · ${sel.row === 5 ? 'CAPSTONE' : sel.row === 6 ? 'REPEATABLE' : sel.choice ? 'FORK · TAKE ONE' : 'TIER ' + (sel.row + 1)}${ROWREQ[sel.row] ? ' · NEEDS ' + ROWREQ[sel.row] + ' IN THE TREE' : ''}</small><b>${sel.name}</b><p>${sel.desc(Math.max(1, g.tal[talSel] || 0))}</p><div class="acts"><button data-act="take" data-id="${talSel}" ${g.canTalent(talSel) ? '' : 'disabled'}>Take · 1 point</button></div></div>` : '<p class="hint">Points come every second level and from every boss. Rows open as you spend in a tree; the last node takes points forever.</p>'}
    <button class="btn close" data-act="close">Close <kbd>N</kbd></button>`
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
