# Vinland 1021

A small idle game in four voyages, based on the *Saga of the Greenlanders* and the Norse site at L'Anse aux Meadows in Newfoundland.

You don't chop the trees yourself. You give your crew jobs, get through the winters, explore, trade, and sail home with whatever you can carry. Some moments ask you to choose. When you choose differently from the saga, the narrator tells you what the saga says happened.

## Play

Open `index.html` in a browser. It is a single file with nothing to install, and progress saves in the browser.

To put it online for free with GitHub Pages (public repositories only on the free plan): in the repository, go to **Settings → Pages**, choose **Deploy from a branch**, then pick `main` and `/ (root)`. The game appears at `https://serski.github.io/vinland-1021/` a minute or two later.

## The four chapters

| Chapter | Leader | What's new |
| --- | --- | --- |
| I | Leif | Build the camp, explore, repair the ship, and the rescue at the reef |
| II | Thorvald | Voyages along the coast, the broken keel at Kjalarnes, and the first meeting with the people of the land |
| III | Karlsefni and Gudrid | Cattle and a byre, a palisade, trading milk for furs, and Snorri's birth |
| IV | Freydís | Two camps on one shore, and a feud that grows by itself |

After Chapter IV comes the epilogue: the camp sinking into the grass, the 1960 excavation, and the 2021 tree-ring date that gives the game its name. A full playthrough takes about 40 minutes.

Buildings, discoveries and the trust of the people of the land carry over from one chapter to the next, and the renown you earn buys the next crew better supplies.

## Project layout

- `src/game.html` is the whole game: HTML, CSS and JavaScript in one file. It is written as a page fragment, with no `<html>` or `<body>` tags, so it can be published as a claude.ai artifact as-is.
- `index.html` is the same game wrapped as a standalone page. It is generated, so don't edit it by hand.
- `tools/build.mjs` creates `index.html` from `src/game.html`.
- `tests/sim.js` plays all four chapters with simple bots to check pacing. It has no dependencies.
- `tests/play.js` plays the whole game in a phone-sized Chromium through the real buttons, and saves screenshots to `tests/shots/`. It needs Playwright.

Inside `src/game.html`, the game rules sit between `// ===== ENGINE START =====` and `// ===== ENGINE END =====` and never touch the page. That is what lets `tests/sim.js` run them on their own.

## Working on it

After editing `src/game.html`, regenerate the standalone page:

```bash
node tools/build.mjs
```

Check the pacing of all four chapters (takes a second or two):

```bash
node tests/sim.js
```

Play the whole game in a headless browser (takes a few minutes):

```bash
npm install
```

```bash
npx playwright install chromium
```

```bash
npm test
```

## Sources

- The *Saga of the Greenlanders* (*Grænlendinga saga*), for the voyages of Leif, Thorvald, Karlsefni and Gudrid, and Freydís.
- L'Anse aux Meadows, found in 1960 by Helge and Anne Stine Ingstad, shown the site by George Decker, and a UNESCO World Heritage Site since 1978.
- Kuitems et al., "Evidence for European presence in the Americas in AD 1021", *Nature* (2021), for the year in the title.

All the art and sound is drawn and synthesized in code.

## See also: Emporos

Emporos, a pixel-art trading game about a young trader from Rhodes in 290 BC, started here and now has its own repository: [Serski/Emporos](https://github.com/Serski/Emporos).
