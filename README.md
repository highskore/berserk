# berserk

The Black Swordsman as an endless survivor roguelike: golden age paint by day, a burning Brand that turns the world to ink by night. Play it at [highskore.com/berserk](https://highskore.com/berserk).

Move with WASD or the arrow keys, or drag anywhere on a phone. The Dragonslayer swings on its own; P pauses. Day 1 is the golden age with the Hawks, the first night is the Eclipse, then Brand nights forever. Nothing is saved: each visit starts fresh.

> An unofficial fan work. Berserk and all of its characters are the creation of Kentaro Miura (1966–2021) and belong to their rights holders. Everything here is drawn by code; no art from the manga or anime is used.

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

highskore.com has this repo as a submodule at `games/berserk`; its `pnpm build:berserk` runs `node build.mjs` and copies `dist/berserk.html` to `public/berserk.html`.
