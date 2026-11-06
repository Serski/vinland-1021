# Emporos

A pixel-art trading game for phones. Ariston, a young trader from Rhodes, sails out in 290 BC with a small ship, a sea loan and a crew that has to eat. *Emporos* is the Greek word for a merchant who travels by sea. It is a working title.

The plan is nine chapters, each a voyage further out from Rhodes. **Chapter I, to Halicarnassus and back, is playable now.**

## Play

Open `index.html` in a browser. It is a single file with nothing to install, and progress saves in the browser.

## Chapter I: Halicarnassus

Antimachos the banker has lent Ariston 150 drachmas on a sea loan. Bring the ship home and he owes 195. If she sinks, he owes nothing. A round trip takes six days at sea and about fifteen minutes to play.

- **The quay.** Tap a merchant, on the quay or in the picture, to buy, sell and haggle. Prices drop as you sell more of one thing, and haggling too hard makes them worse. A marker over a stall means that merchant buys something you are carrying.
- **The hold.** The ship is a grid, seen from above, with the quay beside it. Everything you take aboard needs squares: cargo, barley, water jars, the bolt-thrower, and the gear of anyone you hire. Drag to move, tap to turn, or turn mid-drag with a second finger. The bolt-thrower fits only in the bow. Fragile cargo breaks in rough water unless it touches something soft.
- **The crew.** Everyone aboard eats and drinks every day. A sack of barley or a jar of water does ten people for a day. Rowing doubles what the rowers drink. Thirsty sailors row badly and fall sick.
- **Hiring.** A Rhodian slinger in Rhodes. A Cretan archer and a doctor from Cos in Halicarnassus. Fighters shoot before pirates can board. With the doctor aboard, nobody dies of their wounds.
- **At sea.** The clock runs from dawn to dusk. Watch the wind, row when you are becalmed, cut the rations if you must, and reach the next beach before dark. Ports and night camps stop the clock.
- **Trouble.** A squall on the way out, and a pirate hemiolia on the way home. Run, pay them off with cargo, or fight.
- **Coming home.** Sell, repay the banker, and see how the season went. Your silver, your good name in each port, and a friend in Halicarnassus if you earned one are kept for the chapters to come.

The history of the period is real and stays in the background: the siege of Rhodes and the bronze Sun-god being built with the money, the tomb of Mausolus above Halicarnassus, Coan wine made with seawater, Cretan archers and Cretan pirates. Ariston and his crew are invented.

## The nine voyages

| Chapter | Ship | Voyage |
| --- | --- | --- |
| I | Small coastal trader | Halicarnassus (playable) |
| II | Small coastal trader | Miletus |
| III | Small coastal trader | Athens |
| IV–VI | Medium merchant ship | Corcyra, Taras, Syracuse |
| VII–IX | Large grain ship | Cyprus, Tyre, Alexandria |

## Project layout

- `src/game.html` is the whole game: HTML, CSS and JavaScript in one file. It is a page fragment, with no `<html>` or `<body>` tags, so it can be published as a claude.ai artifact as it is.
- `index.html` is the same game wrapped as a standalone page. It is generated, so don't edit it by hand.
- `tools/build.mjs` creates `index.html` from `src/game.html`.
- `tests/sim.js` plays Chapter I with bots that follow different strategies, over many seeds, to check the money and the risks. It has no dependencies.
- `tests/play.js` plays Chapter I in a phone-sized Chromium through the real buttons, and saves screenshots to `tests/shots/`. It needs Playwright.

Inside `src/game.html`, the rules sit between `// ===== ENGINE START =====` and `// ===== ENGINE END =====` and never touch the page. That is what lets `tests/sim.js` run them on their own. All the art and sound is drawn and synthesized in code.

## Working on it

Run these from the `emporos` folder. After editing `src/game.html`, regenerate the standalone page:

```bash
node tools/build.mjs
```

Check the balance (takes a few seconds):

```bash
node tests/sim.js
```

Play the chapter in a headless browser (takes about a minute):

```bash
npm install
```

```bash
npx playwright install chromium
```

```bash
npm test
```
