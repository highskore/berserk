// Builds public/berserk.html — the Berserk survivor as one self-contained file — from the sources in berserk/.
// /berserk is rewritten to it in next.config.js. Run: pnpm build:berserk
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const read = f => readFileSync(join(here, f), 'utf8')

const js = ['render.js', 'shade.js', 'figs.js', 'bosses.js', 'game.js', 'sprites.js', 'icons.js', 'ui.js'].map(read).join('\n')
if (js.includes('</script')) throw new Error('script terminator inside the game source')
const page = read('page.html').replace('__GAME__', () => js)
const split = page.indexOf('</style>') + '</style>'.length

const head = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<title>Berserk · highskore</title>
<meta name="description" content="An unofficial Berserk fan game: an endless survivor roguelike in golden age paint, where a burning Brand turns the world to ink.">
<meta name="theme-color" content="#0e0d0c">
<link rel="icon" href="/favicon.ico" sizes="any">
<meta property="og:title" content="Berserk · highskore">
<meta property="og:description" content="An unofficial Berserk fan game: an endless survivor roguelike in golden age paint, where a burning Brand turns the world to ink.">
<meta property="og:url" content="https://highskore.com/berserk">
<meta property="og:type" content="website">
`

writeFileSync(join(here, '..', 'public', 'berserk.html'), head + page.slice(0, split) + '\n</head>\n<body>\n' + page.slice(split) + '\n</body>\n</html>\n')
console.log('public/berserk.html written')
