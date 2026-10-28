# Developing berserk

How the page is put together and built. For what the game is, see the [README](../README.md).

## Building

The game is one self-contained HTML page with no dependencies:

```sh
node build.mjs   # → dist/berserk.html
node talents-check.mjs   # asserts every talent gate can be reached from its own tree
```

Open `dist/berserk.html` in a browser to play it locally.

| file | what it is |
| --- | --- |
| `page.html` | layout, styles and menus; `__HUDCSS__` and `__GAME__` are filled in by the build |
| `hud.css` | the HUD's layout and Brand sigil dressing |
| `render.js` | the renderer: figures from 3D spheres, capsules and triangles, projected into a geometry buffer |
| `shade.js` | turns the geometry buffer into colour: golden age painterly by day, Miura ink by night |
| `figs.js` | the figures in 3D |
| `bosses.js` | the apostle bosses: Nosferatu Zodd, Grunbeld, the Count |
| `game.js` | the run: enemies, waves, the arc from the golden age to the Brand nights |
| `systems.js` | abilities, gear, flasks and talents, all per run |
| `sprites.js` | sprite caches: every figure rasterised once per direction and frame |
| `icons.js` | card icons, built from the same primitives |
| `ui.js` | the canvas, world rendering, the DOM HUD and menus, input and the frame loop |
| `altar.js` | the blood altar UI: ability sockets, flasks, party portraits, minimap, boss cast bar |
| `build.mjs` | stitches them into one page |

## Test hooks

`ui.js` exposes `window.__BZ` for headless smoke runs. It's harmless in play. From the browser console:

```js
__BZ.start({ god: true })   // a new run; god mode takes no damage
__BZ.auto(true)             // walk, cast and pick cards on its own
__BZ.speed(4)               // run the simulation 4× faster
__BZ.g                      // the current Game: __BZ.g.t, __BZ.g.p.lvl, __BZ.g.nightN…
__BZ.bench(300)             // ms per step + render, over 300 frames
```

## Where it's used

highskore.com has this repo as a submodule at `games/berserk`; its `pnpm build:berserk` runs `node build.mjs` and copies `dist/berserk.html` to `public/berserk.html`.
