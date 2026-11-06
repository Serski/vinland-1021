// Wraps src/game.html (a page fragment, which can be published to claude.ai as it is) into index.html, a standalone page.
// Usage: node tools/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const srcUrl = new URL('../src/game.html', import.meta.url);
const outUrl = new URL('../index.html', import.meta.url);
const src = readFileSync(srcUrl, 'utf8');

// Everything up to the end of the first <style> block belongs in <head>; the rest is the body.
const end = src.indexOf('</style>');
if (end < 0) throw new Error('src/game.html has no <style> block to split on');
const cut = end + '</style>'.length;
const head = src.slice(0, cut).trim();
const body = src.slice(cut).trim();

const page = `<!doctype html>
<!-- Generated from src/game.html by tools/build.mjs. Edit the source, then run: node tools/build.mjs -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}img{max-width:100%}</style>
${head}
</head>
<body>
${body}
</body>
</html>
`;

writeFileSync(outUrl, page);
console.log(`Wrote index.html (${Math.round(page.length / 1024)} KB)`);
