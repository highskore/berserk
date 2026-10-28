// asserts every talent gate can be reached from its own tree: before a row opens, the rows above it must offer at least
// as many points as the gate asks (a fork counts once, at its best option). also checks that every tree has a capstone
// and an endless node, that every row has a node, and that the gates rise. run: node berserk/talents-check.mjs
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const here = dirname(fileURLToPath(import.meta.url))
const ctx = { console, Math }
vm.createContext(ctx)
vm.runInContext(['render.js', 'shade.js', 'figs.js', 'bosses.js', 'game.js', 'systems.js'].map(f => readFileSync(join(here, f), 'utf8')).join('\n') + '\n;globalThis.__T = { TREES, ROWREQ, TNODE, Game }', ctx)
const { TREES, ROWREQ, Game } = ctx.__T
let bad = 0
const fail = m => { bad++; console.log('FAIL', m) }
for (let r = 1; r < ROWREQ.length; r++) if (!(ROWREQ[r] >= ROWREQ[r - 1])) fail(`gates must rise: row ${r} asks ${ROWREQ[r]} after ${ROWREQ[r - 1]}`)
for (const [tid, tname, , nodes] of TREES) {
  const rows = ROWREQ.map((_, r) => nodes.filter(n => n[4] === r))
  rows.forEach((ns, r) => { if (!ns.length) fail(`${tname}: row ${r} is empty`) })
  /* the most points a player can have in this tree before row r opens */
  const offered = r => { let n = 0; for (let k = 0; k < r; k++) { const free = rows[k].filter(x => !x[7]), forks = {}; for (const x of free) n += x[3] === Infinity ? 0 : x[3]; for (const x of rows[k].filter(x => x[7])) forks[x[7]] = Math.max(forks[x[7]] || 0, x[3]); for (const v of Object.values(forks)) n += v } return n }
  for (let r = 1; r < ROWREQ.length; r++) { const o = offered(r); if (o < ROWREQ[r]) fail(`${tname}: row ${r} needs ${ROWREQ[r]} points but rows above offer only ${o}`); else console.log(`ok   ${tname}: row ${r} needs ${ROWREQ[r]}, rows above offer ${o}`) }
  if (!nodes.some(n => n[4] === ROWREQ.length - 2 && n[3] === 1)) fail(`${tname}: no capstone`)
  if (!nodes.some(n => n[3] === Infinity)) fail(`${tname}: no endless node`)
  /* and in play: spend points greedily top-down and make sure the capstone and the endless node actually get taken */
  const g = new Game({ seed: 1 }); g.tp = 999
  for (let pass = 0; pass < 200; pass++) { const can = nodes.filter(n => n[3] !== Infinity && g.canTalent(n[0])); if (!can.length) break; g.takeTalent(can[0][0]) }
  const cap = nodes.find(n => n[4] === ROWREQ.length - 2), rep = nodes.find(n => n[3] === Infinity)
  if (!g.tal[cap[0]]) fail(`${tname}: greedy spending never reached the capstone ${cap[1]} (spent ${g.treeSpent(tid)})`)
  for (let k = 0; k < 5; k++) g.takeTalent(rep[0])
  if ((g.tal[rep[0]] || 0) < 5) fail(`${tname}: the endless node ${rep[1]} would not take points`)
  /* a fork never allows two */
  for (const f of new Set(nodes.filter(n => n[7]).map(n => n[7]))) { const picked = nodes.filter(n => n[7] === f && g.tal[n[0]]).length; if (picked > 1) fail(`${tname}: fork ${f} has ${picked} picks`) }
  console.log(`ok   ${tname}: capstone and endless node reachable in play (${g.treeSpent(tid)} points spent)`)
}
console.log(bad ? `${bad} FAILED` : 'all talent gates reachable')
process.exit(bad ? 1 : 0)
