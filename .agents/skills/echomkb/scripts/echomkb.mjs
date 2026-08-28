#!/usr/bin/env node
// EchoMKB — live Midnight docs search for coding agents.
// Zero dependencies. Node >= 18 (global fetch). MIT. https://m.echoforgeef.com/echomkb
//
//   node echomkb.mjs search <query...>   rank docs pages from the live llms.txt index, fetch the top hits, print cited excerpts
//   node echomkb.mjs page <path|url>     print one docs page as markdown (tries .md, falls back to stripped HTML)
//   node echomkb.mjs versions            support-matrix (tested) vs release notes / npm / GitHub (latest) — drift table
//   node echomkb.mjs index               overview of the live docs index (sections + counts)
//   node echomkb.mjs doctor              connectivity + cache check
//
// Flags: --json  --fresh (ignore cache)  --max N (ranked pages, default 8)  --fetch N (pages to open, default 3)
//        --section NAME (restrict to an llms.txt section, e.g. compact)  --no-npm  --no-github  --max-chars N
//
// Only three hosts are ever contacted: docs.midnight.network, registry.npmjs.org (via `npm view`), api.github.com.
// Nothing from the caller's repository is sent anywhere.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const DOCS = 'https://docs.midnight.network';
const UA = 'EchoMKB/0.1 (+https://m.echoforgeef.com/echomkb)';
const CACHE_DIR = join(tmpdir(), 'echomkb-cache');
const TTL = { index: 15 * 60e3, page: 60 * 60e3, api: 30 * 60e3 };
const STOP = new Set('a an and are as at be by for from how in into is it of on or that the this to what when where which with does do can i my your you use using'.split(' '));

// ---------- args ----------
const argv = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const k = a.slice(2);
    const next = argv[i + 1];
    if (['max', 'fetch', 'section', 'max-chars'].includes(k) && next && !next.startsWith('--')) { flags[k] = next; i++; }
    else flags[k] = true;
  } else positional.push(a);
}
const [cmd, ...rest] = positional;
const JSON_OUT = !!flags.json;
const FRESH = !!flags.fresh;

// ---------- cache + fetch ----------
function cachePath(url) { return join(CACHE_DIR, createHash('sha1').update(url).digest('hex') + '.txt'); }

async function fetchText(url, ttl = TTL.page) {
  mkdirSync(CACHE_DIR, { recursive: true });
  const p = cachePath(url);
  if (!FRESH && existsSync(p)) {
    const age = Date.now() - statSync(p).mtimeMs;
    if (age < ttl) return { text: readFileSync(p, 'utf8'), status: 200, source: 'cache', ageMs: age };
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/markdown,text/plain,application/json;q=0.9,*/*;q=0.5' }, signal: ctrl.signal });
    clearTimeout(t);
    const text = await r.text();
    if (r.ok) writeFileSync(p, text);
    return { text, status: r.status, source: 'live', contentType: r.headers.get('content-type') || '' };
  } catch (e) {
    if (existsSync(p)) return { text: readFileSync(p, 'utf8'), status: 200, source: 'stale-cache', ageMs: Date.now() - statSync(p).mtimeMs, error: e.message };
    throw new Error(`fetch failed for ${url}: ${e.message}`);
  }
}

// ---------- llms.txt index ----------
function parseIndex(text) {
  const entries = [];
  let section = 'root', sub = '';
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    if (line.startsWith('## ')) { section = line.slice(3).trim(); sub = ''; continue; }
    if (line.startsWith('### ')) { sub = line.slice(4).trim(); continue; }
    const m = /^- \[(.+?)\]\((\/[^)\s]+)\)(?::\s*(.*))?$/.exec(line);
    if (m) entries.push({ title: m[1], path: m[2], desc: (m[3] || '').trim(), section, sub });
  }
  return entries;
}

async function loadIndex() {
  const r = await fetchText(`${DOCS}/llms.txt`, TTL.index);
  const entries = parseIndex(r.text);
  if (!entries.length) throw new Error('llms.txt parsed to zero entries — docs index format may have changed');
  return { entries, meta: r };
}

// ---------- ranking ----------
function tokenize(q) {
  const spaced = q.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  const toks = spaced.toLowerCase().split(/[^a-z0-9_]+/).filter(t => t.length >= 2 && !STOP.has(t));
  return [...new Set(toks)];
}
// light stemmer so "disclose" finds "disclosure", "witness" finds "witnesses", "proving" finds "proof server"? (no — but "prove"/"proving" → "prov")
function stem(t) {
  for (const suf of ['ations', 'ation', 'ings', 'ing', 'ures', 'ure', 'ies', 'ers', 'er', 'ed', 'es', 's', 'e']) {
    if (t.length - suf.length >= 4 && t.endsWith(suf)) return t.slice(0, -suf.length);
  }
  return t;
}
function isIdentifierQuery(q) { return /[A-Z_]/.test(q.replace(/^[A-Z]/, '')) || /\w+\.\w+/.test(q); }

function scoreEntry(e, tokens, q, identQ) {
  const title = e.title.toLowerCase(), path = e.path.toLowerCase(), desc = e.desc.toLowerCase(), sec = (e.section + ' ' + e.sub).toLowerCase();
  let s = 0, hits = 0;
  for (const t of tokens) {
    const st = stem(t);
    let h = false;
    if (title.includes(st)) { s += 4; h = true; if (new RegExp(`(^|[^a-z0-9])${t}([^a-z0-9]|$)`).test(title)) s += 2; }
    if (path.includes(st)) { s += 3; h = true; }
    if (desc.includes(st)) { s += 1.5; h = true; }
    if (sec.includes(st)) { s += 1; h = true; }
    if (h) hits++;
  }
  if (!hits) return 0;
  s *= 0.4 + 0.6 * (hits / tokens.length);
  if (title.includes(q.toLowerCase())) s += 5;
  if (e.section === 'api-reference') s += identQ ? 2 : -2.5;
  if (e.section === 'relnotes' && !/release|version|relnote|changelog|latest|matrix|support/i.test(q)) s -= 2;
  return s;
}

function rank(entries, q, opts = {}) {
  const tokens = tokenize(q);
  if (!tokens.length) return { tokens, ranked: [] };
  const identQ = isIdentifierQuery(q);
  let pool = entries;
  if (opts.section) pool = entries.filter(e => e.section === opts.section || e.sub === opts.section);
  const ranked = pool.map(e => ({ ...e, score: scoreEntry(e, tokens, q, identQ) })).filter(e => e.score > 0).sort((a, b) => b.score - a.score);
  return { tokens, ranked };
}

// ---------- page handling ----------
function cleanMd(md) {
  return md
    .replace(/^> For the complete documentation index, see \[llms\.txt\]\(\/llms\.txt\)\s*/m, '')
    .replace(/\[​\]\(#[^)]*\)/g, '')            // docusaurus "Direct link" anchors
    .replace(/<!--\s*-->/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
function stripHtml(html) {
  let t = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const main = /<main[\s\S]*?<\/main>/i.exec(t) || /<article[\s\S]*?<\/article>/i.exec(t);
  if (main) t = main[0];
  t = t.replace(/<\/(p|div|li|h[1-6]|tr|pre|section)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
  t = t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
  return t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function toDocsPath(input) {
  let p = input.trim();
  if (/^https?:\/\//.test(p)) p = p.replace(/^https?:\/\/[^/]+/, '');
  if (!p.startsWith('/')) p = '/' + p;
  p = p.replace(/#.*$/, '').replace(/\/+$/, '');
  return p || '/index';
}
async function fetchPage(input) {
  const base = toDocsPath(input).replace(/\.md$/, '');
  const mdUrl = `${DOCS}${base}.md`;
  const r = await fetchText(mdUrl);
  const looksHtml = /^\s*<!doctype html/i.test(r.text);
  if (r.status === 200 && !looksHtml) return { url: `${DOCS}${base}`, md: cleanMd(r.text), meta: r, format: 'markdown' };
  const r2 = await fetchText(`${DOCS}${base}`);
  if (r2.status !== 200) throw new Error(`${DOCS}${base} → HTTP ${r2.status}`);
  return { url: `${DOCS}${base}`, md: stripHtml(r2.text), meta: r2, format: 'html-stripped' };
}
function versionStamp(md) {
  const m = /Compact language version ([\d.]+), compiler version ([\d.]+)/.exec(md);
  return m ? `docs page stamped: Compact language ${m[1]}, compiler ${m[2]}` : '';
}

function excerpts(md, tokens, max = 3) {
  const lines = md.split('\n');
  const blocks = [];
  let trail = [], cur = [], inCode = false;
  const flush = () => { if (cur.length) { blocks.push({ trail: [...trail], text: cur.join('\n'), order: blocks.length }); cur = []; } };
  for (const line of lines) {
    if (line.startsWith('```')) { if (!inCode) { flush(); cur.push(line); inCode = true; } else { cur.push(line); inCode = false; flush(); } continue; }
    if (inCode) { cur.push(line); continue; }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) { flush(); const lvl = h[1].length; trail = trail.filter(t => t.lvl < lvl); trail.push({ lvl, text: h[2].trim() }); continue; }
    if (!line.trim()) { flush(); continue; }
    cur.push(line);
  }
  flush();
  const scored = blocks.map(b => {
    const low = (b.text + ' ' + b.trail.map(t => t.text).join(' ')).toLowerCase();
    let hits = 0, occ = 0;
    for (const t of tokens) { const c = low.split(stem(t)).length - 1; if (c) { hits++; occ += c; } }
    const len = b.text.length;
    const score = hits ? hits * 3 + Math.min(occ, 6) * 0.4 + (len < 40 && !b.text.startsWith('```') ? -2 : 0) : 0;
    return { ...b, score };
  }).filter(b => b.score > 0).sort((a, b) => b.score - a.score || a.order - b.order).slice(0, max).sort((a, b) => a.order - b.order);
  return scored.map(b => ({ heading: b.trail.map(t => t.text).join(' › '), text: b.text.length > 900 ? b.text.slice(0, 900) + ' …' : b.text }));
}

// ---------- commands ----------
async function cmdSearch() {
  const q = rest.join(' ').trim();
  if (!q) die('usage: echomkb search <query>');
  const { entries, meta } = await loadIndex();
  const { tokens, ranked } = rank(entries, q, { section: flags.section });
  const max = +flags.max || 8, nFetch = Math.min(+flags.fetch || 3, max);
  const top = ranked.slice(0, max);
  const opened = [];
  for (const e of top.slice(0, nFetch)) {
    try {
      const pg = await fetchPage(e.path);
      opened.push({ ...e, url: pg.url, stamp: versionStamp(pg.md), format: pg.format, source: pg.meta.source, excerpts: excerpts(pg.md, tokens) });
    } catch (err) { opened.push({ ...e, url: `${DOCS}${e.path.replace(/\.md$/, '')}`, error: err.message, excerpts: [] }); }
  }
  const out = { query: q, tokens, fetchedAt: new Date().toISOString(), index: { source: meta.source, entries: entries.length }, ranked: top.map(e => ({ title: e.title, url: `${DOCS}${e.path.replace(/\.md$/, '')}`, section: e.section, desc: e.desc, score: +e.score.toFixed(1) })), opened };
  if (JSON_OUT) return console.log(JSON.stringify(out, null, 2));
  const L = [];
  L.push(`# EchoMKB · live search — "${q}"`);
  L.push(`FETCHED ${out.fetchedAt} · index: ${entries.length} pages (${meta.source}${meta.ageMs ? ', ' + Math.round(meta.ageMs / 60e3) + ' min old' : ''}) · source: ${DOCS}`);
  if (!top.length) { L.push('', 'No index hits. Try fewer / different words, or `echomkb index` to see sections.'); return console.log(L.join('\n')); }
  L.push('', '## Ranked pages');
  top.forEach((e, i) => { L.push(`${i + 1}. **${e.title}** — ${DOCS}${e.path.replace(/\.md$/, '')}  [${e.section}${e.sub ? '/' + e.sub : ''}]`); if (e.desc) L.push(`   ${e.desc.slice(0, 220)}`); });
  L.push('', '## Excerpts (live)');
  for (const [i, p] of opened.entries()) {
    L.push('', `### ${i + 1}. ${p.title}`, `${p.url}${p.stamp ? '  ·  ' + p.stamp : ''}${p.format === 'html-stripped' ? '  ·  (html fallback)' : ''}`);
    if (p.error) { L.push(`(could not open: ${p.error})`); continue; }
    if (!p.excerpts.length) { L.push('(page opened; no paragraph matched the query tokens — read it with `echomkb page ' + p.url + '`)'); continue; }
    for (const x of p.excerpts) { if (x.heading) L.push(`> ${x.heading}`); L.push(x.text, ''); }
  }
  L.push('---', 'Cite the URL you relied on. Live docs override any bundled snapshot and anything recalled from training data.', 'Open a full page: `echomkb page <url>` · Version drift: `echomkb versions`');
  console.log(L.join('\n'));
}

async function cmdPage() {
  const target = rest[0];
  if (!target) die('usage: echomkb page <path|url>');
  const pg = await fetchPage(target);
  const maxChars = +flags['max-chars'] || 60000;
  const body = pg.md.length > maxChars ? pg.md.slice(0, maxChars) + `\n\n… (truncated at ${maxChars} chars; pass --max-chars N)` : pg.md;
  if (JSON_OUT) return console.log(JSON.stringify({ url: pg.url, format: pg.format, source: pg.meta.source, chars: pg.md.length, markdown: body }, null, 2));
  console.log(`# ${pg.url}\nFETCHED ${new Date().toISOString()} · ${pg.format} · ${pg.meta.source}${versionStamp(pg.md) ? ' · ' + versionStamp(pg.md) : ''}\n\n${body}`);
}

function parseMatrix(md) {
  const nets = ['Preview', 'Preprod', 'Mainnet'];
  const tables = [];
  let cur = null;
  for (const line of md.split('\n')) {
    if (/^\|\s*Functional area/i.test(line)) { cur = {}; tables.push(cur); continue; }
    if (!cur || !line.startsWith('|') || /^\|\s*-+/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    if (cells.length < 3 || !cells[1] || !cells[2]) continue;
    cur[cells[1].replace(/\s*\(`[^`]*`\)/, '').replace(/\s+/g, ' ')] = cells[2];
  }
  const out = {};
  tables.forEach((t, i) => { out[nets[i] || `table${i + 1}`] = t; });
  const upd = /Last updated on ([A-Za-z]+ \d{1,2}, \d{4})/.exec(md);
  return { networks: out, lastUpdated: upd ? upd[1] : '' };
}
function latestFromRelnote(md) {
  const rel = /Release\s*(?:<!--\s*-->)?\s*([0-9][\w.\-]*)/.exec(md);
  const lang = /Compact language\s*(?:<!--\s*-->)?\s*([\d.]+)/.exec(md);
  const date = /\n(\d{1,2} [A-Z][a-z]+ \d{4})\n/.exec(md);
  return { version: rel ? rel[1] : '', language: lang ? lang[1] : '', date: date ? date[1] : '' };
}
function semverCmp(a, b) {
  const pa = String(a).replace(/^[^0-9]*/, '').split(/[.\-]/), pb = String(b).replace(/^[^0-9]*/, '').split(/[.\-]/);
  for (let i = 0; i < 3; i++) { const x = parseInt(pa[i] || '0', 10), y = parseInt(pb[i] || '0', 10); if (isNaN(x) || isNaN(y)) return 0; if (x !== y) return x - y; }
  return 0;
}
function npmVersion(pkg) {
  try { return execFileSync('npm', ['view', pkg, 'version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 20000 }).trim(); }
  catch { return ''; }
}
async function ghLatest(repo) {
  try {
    const r = await fetchText(`https://api.github.com/repos/${repo}/releases/latest`, TTL.api);
    if (r.status === 403 || r.status === 429) return 'rate-limited';
    if (r.status !== 200) return '';
    const j = JSON.parse(r.text);
    return `${j.tag_name} (${(j.published_at || '').slice(0, 10)})`;
  } catch { return ''; }
}
const COMPONENTS = [
  { name: 'Compact toolchain', matrix: 'Compact toolchain', relnote: '/relnotes/compact', github: 'LFDT-Minokawa/compact', local: 'compact check' },
  { name: 'Compact devtools', matrix: 'Compact devtools', relnote: '/relnotes/compact-tools', github: 'midnightntwrk/compact', local: 'compact self check' },
  { name: 'Compact runtime', matrix: 'Compact runtime', npm: '@midnight-ntwrk/compact-runtime' },
  { name: 'Compact JS', matrix: 'Compact JS', relnote: '/relnotes/compact-js' },
  { name: 'Midnight.js', matrix: 'Midnight.js', relnote: '/relnotes/midnight-js', npm: '@midnight-ntwrk/midnight-js', github: 'midnightntwrk/midnight-js' },
  { name: 'Wallet SDK', matrix: 'Wallet SDK', relnote: '/relnotes/wallet', github: 'midnightntwrk/midnight-wallet' },
  { name: 'DApp Connector API', matrix: 'DApp Connector API', relnote: '/relnotes/dapp-connector-api', npm: '@midnight-ntwrk/dapp-connector-api' },
  { name: 'Ledger (incl. proof server)', relnote: '/relnotes/ledger', github: 'midnightntwrk/midnight-ledger' },
  { name: 'Proof server', matrix: 'Proof server' },
  { name: 'Node (Midnight)', matrix: 'Node (Midnight)', relnote: '/relnotes/node', github: 'midnightntwrk/midnight-node' },
  { name: 'Midnight Indexer', matrix: 'Midnight Indexer', relnote: '/relnotes/midnight-indexer', github: 'midnightntwrk/midnight-indexer' },
  { name: 'testkit-js', matrix: 'testkit-js' },
];
async function cmdVersions() {
  const mx = await fetchText(`${DOCS}/relnotes/support-matrix.md`, TTL.index);
  const matrix = parseMatrix(cleanMd(mx.text));
  const rows = [];
  for (const c of COMPONENTS) {
    const row = { component: c.name, matrix: {}, relnote: null, npm: '', github: '' };
    if (c.matrix) for (const [net, t] of Object.entries(matrix.networks)) row.matrix[net] = t[c.matrix] || '';
    if (c.relnote) { try { const r = await fetchText(`${DOCS}${c.relnote}.md`, TTL.index); row.relnote = { ...latestFromRelnote(r.text), url: `${DOCS}${c.relnote}` }; } catch { row.relnote = { version: '', error: true }; } }
    if (c.npm && !flags['no-npm']) row.npm = npmVersion(c.npm) ? `${npmVersion(c.npm)} (${c.npm})` : '';
    if (c.github && !flags['no-github']) row.github = await ghLatest(c.github);
    if (c.local) row.local = c.local;
    rows.push(row);
  }
  const out = { fetchedAt: new Date().toISOString(), matrixUrl: `${DOCS}/relnotes/support-matrix`, matrixLastUpdated: matrix.lastUpdated, matrixSource: mx.source, rows };
  if (JSON_OUT) return console.log(JSON.stringify(out, null, 2));
  const nets = Object.keys(matrix.networks);
  const L = [];
  L.push('# EchoMKB · versions — tested (support matrix) vs latest (relnotes / npm / GitHub)');
  L.push(`FETCHED ${out.fetchedAt} · matrix: ${out.matrixUrl}${matrix.lastUpdated ? ' (page says last updated ' + matrix.lastUpdated + ')' : ''} · ${mx.source}`);
  L.push('', `| Component | ${nets.map(n => 'Matrix ' + n).join(' | ')} | Relnotes latest | npm latest | GitHub latest | Drift |`);
  L.push(`|---|${nets.map(() => '---').join('|')}|---|---|---|---|`);
  for (const r of rows) {
    const mv = nets.map(n => r.matrix[n] || '—');
    const rel = r.relnote ? (r.relnote.version ? r.relnote.version + (r.relnote.language ? ` (lang ${r.relnote.language})` : '') + (r.relnote.date ? ', ' + r.relnote.date : '') : (r.relnote.error ? 'fetch error' : '?')) : '—';
    const baseline = mv.find(v => v && v !== '—') || '';
    const latests = [r.relnote?.version, r.npm.split(' ')[0], (r.github || '').replace(/^[^0-9]*/, '').split(' ')[0]].filter(Boolean);
    let drift = '';
    if (baseline) {
      const newer = latests.filter(v => semverCmp(v, baseline) > 0);
      const older = r.relnote?.version && semverCmp(r.relnote.version, baseline) < 0;
      drift = newer.length ? `⚠ newer than matrix (${[...new Set(newer)].join(', ')})` : 'in sync';
      if (older) drift += (newer.length ? '; ' : ' · ') + 'relnotes page behind matrix';
    }
    L.push(`| ${r.component} | ${mv.join(' | ')} | ${rel} | ${r.npm || '—'} | ${r.github || '—'} | ${drift} |`);
  }
  L.push('', 'Reading the table:', '- The support matrix lists **tested / supported** combinations — deploy against these.', '- Relnotes / npm / GitHub show what is **newest**; "⚠ newer than matrix" means a release channel moved ahead of the matrix — say so explicitly when answering version questions, and quote the docs page stamp for syntax.', '- Per-component relnotes pages can lag the matrix or use a different version line (e.g. Wallet SDK relnotes track `wallet-sdk-facade`, the matrix tracks the SDK) — the matrix is the deploy authority; always cite the page you read.', '- Compiler ↔ runtime must match exactly; pin `@midnight-ntwrk/*` without ^/~. Local checks: `compact check`, `compact self check`, `npm view <pkg> version`.');
  console.log(L.join('\n'));
}

async function cmdIndex() {
  const { entries, meta } = await loadIndex();
  const bySec = {};
  for (const e of entries) (bySec[e.section] ||= []).push(e);
  if (JSON_OUT) return console.log(JSON.stringify({ fetchedAt: new Date().toISOString(), source: meta.source, total: entries.length, sections: Object.fromEntries(Object.entries(bySec).map(([k, v]) => [k, v.length])) }, null, 2));
  console.log(`# EchoMKB · docs index — ${entries.length} pages (${meta.source})\n`);
  for (const [sec, list] of Object.entries(bySec)) {
    console.log(`## ${sec} (${list.length})`);
    for (const e of list.slice(0, sec === 'api-reference' ? 3 : 12)) console.log(`- ${e.title} — ${DOCS}${e.path.replace(/\.md$/, '')}`);
    if (list.length > (sec === 'api-reference' ? 3 : 12)) console.log(`- … ${list.length - (sec === 'api-reference' ? 3 : 12)} more (use \`search --section ${sec} <query>\`)`);
    console.log('');
  }
}

async function cmdDoctor() {
  const started = Date.now();
  const r = await fetchText(`${DOCS}/llms.txt`, 0);
  const n = parseIndex(r.text).length;
  let files = 0; try { files = readdirSync(CACHE_DIR).length; } catch {}
  const out = { node: process.version, docs: `${DOCS}/llms.txt`, status: r.status, entries: n, ms: Date.now() - started, cacheDir: CACHE_DIR, cachedFiles: files, ok: r.status === 200 && n > 100 };
  if (JSON_OUT) return console.log(JSON.stringify(out, null, 2));
  console.log(`EchoMKB doctor\n  node        ${out.node}\n  index       ${out.docs} → HTTP ${out.status}, ${out.entries} entries, ${out.ms} ms\n  cache       ${out.cacheDir} (${out.cachedFiles} files)\n  verdict     ${out.ok ? 'OK — live docs reachable' : 'FAIL — fall back to kb/MIDNIGHT_KB.md and say the answer is from a dated snapshot'}`);
  if (!out.ok) process.exitCode = 1;
}

function die(msg) { console.error(msg); process.exit(2); }

const commands = { search: cmdSearch, page: cmdPage, versions: cmdVersions, index: cmdIndex, doctor: cmdDoctor };
if (!cmd || !commands[cmd] || flags.help) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 14).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(cmd && !commands[cmd] ? 2 : 0);
}
commands[cmd]().catch(e => { console.error(`echomkb ${cmd}: ${e.message}`); process.exit(1); });
