#!/usr/bin/env node
/**
 * Export the whole cookbook as a static site (the Recipes-site format).
 *
 * Fetches every recipe of a user from the local Cheffinator API and writes
 * one standalone bilingual A4-printable HTML page per recipe, plus an
 * index.html listing. The output can be served by Caddy for the kitchen
 * tablet or deployed to Netlify - no server needed.
 *
 * Usage:
 *   node tools/export-cookbook.mjs [--user mrdru3000] [--out export-site]
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const API = process.env.CHEFFINATOR_URL || 'http://localhost:3001';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const user = arg('user', 'mrdru3000');
const outDir = path.resolve(arg('out', 'export-site'));

const slugify = (s) =>
  s.normalize('NFD').replace(/\p{M}/gu, '') // strip diacritics (Crêpes -> crepes)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'recipe';

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function renderIndex(entries) {
  const li = (e) => `    <li>
      <a href="${e.slug}.html">
        <span data-lang="he">${esc(e.nameHe)}</span><span data-lang="en">${esc(e.nameEn)}</span>
      </a>
      <span class="desc"><span data-lang="he">${esc(e.descHe)}</span><span data-lang="en">${esc(e.descEn)}</span></span>
    </li>`;
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<title>Recipes</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  body {
    font-family: 'Heebo', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    max-width: 720px; margin: 2rem auto; padding: 0 1.5rem;
    line-height: 1.6; color: #222; background: #fafaf7;
  }
  h1 { border-bottom: 2px solid #333; padding-bottom: 0.3rem; }
  ul { list-style: none; padding: 0; }
  li { margin-bottom: 0.9rem; }
  a { color: #1a5c9e; font-weight: 500; text-decoration: none; font-size: 1.05rem; }
  a:hover { text-decoration: underline; }
  .desc { display: block; color: #666; font-size: 0.9rem; }
  .topbar { display: flex; justify-content: flex-end; direction: ltr; margin-bottom: 1rem; }
  .lang-btn {
    font: inherit; font-size: 0.9rem; padding: 0.4rem 0.9rem;
    background: transparent; color: #333; border: 1px solid #333;
    border-radius: 3px; cursor: pointer; font-weight: bold; letter-spacing: 0.05em;
  }
  .lang-btn:hover { background: #333; color: #fafaf7; }
  html[lang="he"] [data-lang="en"] { display: none !important; }
  html[lang="en"] [data-lang="he"] { display: none !important; }
  @media (prefers-color-scheme: dark) {
    body { background: #1a1a1a; color: #d8d4c8; }
    h1 { border-bottom-color: #d8d4c8; }
    a { color: #c8a165; }
    .desc { color: #999; }
    .lang-btn { color: #d8d4c8; border-color: #d8d4c8; }
    .lang-btn:hover { background: #d8d4c8; color: #1a1a1a; }
  }
</style>
<script>
  (function() {
    try {
      var saved = localStorage.getItem('recipeLang');
      if (saved === 'en' || saved === 'he') {
        document.documentElement.lang = saved;
        document.documentElement.dir = saved === 'he' ? 'rtl' : 'ltr';
      }
    } catch (e) {}
  })();
</script>
</head>
<body>
<div class="topbar">
  <button class="lang-btn" onclick="toggleLang()" aria-label="Toggle language">
    <span data-lang="he">EN</span><span data-lang="en">עב</span>
  </button>
</div>
<h1><span data-lang="he">מתכונים</span><span data-lang="en">Recipes</span></h1>
<ul>
${entries.map(li).join('\n')}
</ul>
<script>
  function toggleLang() {
    var lang = document.documentElement.lang === 'he' ? 'en' : 'he';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    try { localStorage.setItem('recipeLang', lang); } catch (e) {}
  }
</script>
</body>
</html>
`;
}

async function main() {
  // The recipe list requires a session token - log in with the access code
  const loginRes = await fetch(`${API}/api/auth/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: user })
  });
  if (!loginRes.ok) throw new Error(`Login as "${user}" failed: HTTP ${loginRes.status}`);
  const { token } = await loginRes.json();

  const listRes = await fetch(`${API}/api/recipes?limit=100&offset=0`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!listRes.ok) throw new Error(`Failed to list recipes: HTTP ${listRes.status}`);
  const recipes = await listRes.json();
  if (recipes.length === 0) {
    console.log(`No recipes for user "${user}" - nothing to export.`);
    return;
  }

  await mkdir(outDir, { recursive: true });

  const entries = [];
  let failed = 0;
  for (const r of recipes) {
    const slug = slugify(r.name);
    try {
      const res = await fetch(`${API}/api/recipes/${r.id}/export`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      await writeFile(path.join(outDir, `${slug}.html`), html, 'utf8');
      const v = r.variations?.[0] || {};
      const tr = Array.isArray(v.translation) ? v.translation[0] : v.translation;
      entries.push({
        slug,
        nameEn: r.name,
        nameHe: tr?.name || r.name,
        descEn: v.description || '',
        descHe: tr?.description || v.description || ''
      });
      console.log(`ok     ${slug}.html`);
    } catch (err) {
      failed++;
      console.error(`FAILED ${slug}: ${err.message}`);
    }
  }

  entries.sort((a, b) => a.nameEn.localeCompare(b.nameEn));
  await writeFile(path.join(outDir, 'index.html'), renderIndex(entries), 'utf8');
  console.log(`\nExported ${entries.length}/${recipes.length} recipes + index.html to ${outDir}`);
  if (failed) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
