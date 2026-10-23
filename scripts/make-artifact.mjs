// Turns the single-file Vite build (dist-artifact/index.html) into the page shape claude.ai Artifacts expect:
// no <!doctype>/<html>/<head>/<body> wrappers, <title> and <style> first, then the app root and the inlined script.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync(new URL('../dist-artifact/index.html', import.meta.url), 'utf8');

const pick = (re) => [...src.matchAll(re)].map((m) => m[0]);
const title = pick(/<title>[\s\S]*?<\/title>/g)[0] ?? '<title>Snakes and Ladders – Bible Edition</title>';
const fontLinks = pick(/<link[^>]+fonts\.(?:googleapis|gstatic)\.com[^>]*>/g);
const styles = pick(/<style[^>]*>[\s\S]*?<\/style>/g);
const scripts = pick(/<script[^>]*>[\s\S]*?<\/script>/g);

if (!scripts.length) throw new Error('No inlined script found. Run "vite build --mode artifact" first.');

const out = [title, ...fontLinks, ...styles, '<div id="root"></div>', ...scripts].join('\n') + '\n';
mkdirSync(new URL('../artifact/', import.meta.url), { recursive: true });
writeFileSync(new URL('../artifact/index.html', import.meta.url), out);
console.log(`artifact/index.html written (${(out.length / 1024).toFixed(0)} KB)`);
