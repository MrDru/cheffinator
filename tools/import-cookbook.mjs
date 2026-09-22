#!/usr/bin/env node
// Import the static bilingual recipe pages from the Recipes site into Cheffinator
// via its local API (backend on :3001).
//
// Usage (run from the Cheffinator folder):
//   node tools/import-cookbook.mjs --dry-run            # parse only, print JSON, no network
//   node tools/import-cookbook.mjs                      # import all recipes
//   node tools/import-cookbook.mjs --only chicken-bao   # import a single recipe (basename)
//
// The source pages are hand-authored, consistent HTML — parsed with regex/string ops
// on purpose; no dependencies.

import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const RECIPES_DIR = 'C:\\work\\personal\\Recipes';
const API_BASE = 'http://localhost:3001/api';
const USER_CODE = 'mrdru3000';
const DEFAULT_SERVINGS = 4;

// Hardcoded tags per source file (from the app's default tag set).
const TAGS = {
  'almond-apple-cake': ['Dessert', 'Baking'],
  'banana-muffins': ['Dessert', 'Baking'],
  'chicken-bao': ['Asian', 'Chicken'],
  'crepes': ['Dessert', 'Baking'],
  'fathead-pizza-dough': ['Italian', 'Baking'],
  'gluten-pizza-dough': ['Italian', 'Baking'],
  'japanese-cloud-cake': ['Dessert', 'Baking'],
  'kvass': ['Healthy'],
  'peach-sponge-cake': ['Dessert', 'Baking'],
  'pickled-cucumber-kohlrabi': ['Healthy'],
  'pizza-dough': ['Italian', 'Baking'],
  'sauerkraut': ['Healthy'],
};

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  '&apos;': "'", '&nbsp;': ' ', '&ndash;': '\u2013', '&mdash;': '\u2014',
  '&hellip;': '\u2026', '&times;': '\u00d7', '&deg;': '\u00b0', '&frac12;': '\u00bd',
};

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&[a-zA-Z]+\d*;/g, (m) => ENTITIES[m] ?? m);
}

/** Strip tags, decode entities, collapse whitespace. */
function textOf(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/**
 * Extract the top-level content block `<div data-lang="he|en">...</div>` from the
 * page body by walking nested <div>s. (The topbar uses <span data-lang>, so the
 * first matching <div> is the content block.)
 */
function extractLangBlock(html, lang) {
  const open = `<div data-lang="${lang}">`;
  const start = html.indexOf(open);
  if (start === -1) throw new Error(`no <div data-lang="${lang}"> block found`);
  let depth = 0;
  const re = /<div\b|<\/div>/g;
  re.lastIndex = start;
  for (let m; (m = re.exec(html)); ) {
    depth += m[0] === '</div>' ? -1 : 1;
    if (depth === 0) return html.slice(start + open.length, m.index);
  }
  throw new Error(`unbalanced <div>s in data-lang="${lang}" block`);
}

/** All <li> item texts of a <ul>/<ol> fragment. */
function listItems(fragment) {
  return [...fragment.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((m) => textOf(m[1]));
}

// ---------------------------------------------------------------------------
// Per-language parsing
// ---------------------------------------------------------------------------

/**
 * Parse one language block into { name, desc, metaFirst, ingredients, steps, notes }.
 * Ingredients are flattened across the component groups (h3 headings inside
 * .columns), prefixed "Group: item". Notes come from every .notes div.
 */
function parseLangBlock(block, lang) {
  const h1 = block.match(/<h1>([\s\S]*?)<\/h1>/);
  if (!h1) throw new Error(`[${lang}] missing <h1>`);
  const name = textOf(h1[1]);

  const descM = block.match(/<p class="description">([\s\S]*?)<\/p>/);
  if (!descM) throw new Error(`[${lang}] missing description`);
  const desc = textOf(descM[1]);

  // Meta line spans (e.g. "Serves 8", "Makes 12 buns", "Prep 20 min", "23 cm round pan").
  const metaM = block.match(/<div class="meta">([\s\S]*?)<\/div>/);
  const metaSpans = metaM
    ? [...metaM[1].matchAll(/<span>([\s\S]*?)<\/span>/g)].map((m) => textOf(m[1]))
    : [];

  // Ingredients region: between the first <h2> (Ingredients) and the second (Instructions).
  const h2s = [...block.matchAll(/<h2>[\s\S]*?<\/h2>/g)];
  if (h2s.length < 2) throw new Error(`[${lang}] expected 2 <h2> sections, found ${h2s.length}`);
  const ingRegion = block.slice(h2s[0].index + h2s[0][0].length, h2s[1].index);
  const afterInstr = block.slice(h2s[1].index + h2s[1][0].length);

  // Grouped lists: every <h3>Group</h3> followed by a <ul>. Fall back to bare <ul>s.
  const ingredients = [];
  const groupRe = /<h3>([\s\S]*?)<\/h3>\s*<ul>([\s\S]*?)<\/ul>/g;
  let grouped = false;
  for (const m of ingRegion.matchAll(groupRe)) {
    grouped = true;
    const group = textOf(m[1]);
    for (const item of listItems(m[2])) ingredients.push(`${group}: ${item}`);
  }
  if (!grouped) {
    for (const m of ingRegion.matchAll(/<ul>([\s\S]*?)<\/ul>/g)) {
      ingredients.push(...listItems(m[1]));
    }
  }
  if (ingredients.length === 0) throw new Error(`[${lang}] no ingredients found`);

  // Steps: the <ol> right after the Instructions <h2>.
  const olM = afterInstr.match(/<ol>([\s\S]*?)<\/ol>/);
  if (!olM) throw new Error(`[${lang}] no <ol> instructions found`);
  const steps = listItems(olM[1]);
  if (steps.length === 0) throw new Error(`[${lang}] instructions list is empty`);

  // Notes: every <div class="notes"> in the block (kvass has two). Each holds a <ul>.
  const notes = [];
  for (const m of block.matchAll(/<div class="notes">([\s\S]*?)<\/div>/g)) {
    const ulM = m[1].match(/<ul>([\s\S]*?)<\/ul>/);
    if (ulM) notes.push(...listItems(ulM[1]));
  }

  return { name, desc, metaSpans, ingredients, steps, notes };
}

/**
 * Servings from the EN meta spans. Handles "Serves 8", "Makes 12 (buns)",
 * "Makes 16–18", "One ~28 cm pizza (3 servings)". Spans with size/volume/time
 * units ("Makes ~2 liters", "21 cm clay baker", "Prep 10 min") don't count.
 */
function extractServings(metaSpans) {
  for (const span of metaSpans) {
    const serves = span.match(/serves\s+~?(\d+)/i) || span.match(/\(?\s*(\d+)\s+servings?\)?/i);
    if (serves) return parseInt(serves[1], 10);
  }
  for (const span of metaSpans) {
    const makes = span.match(/^makes\s+~?(\d+)(?:\s*[–-]\s*\d+)?\s*(\S*)/i);
    if (makes && !/^(cm|mm|l|ml|liters?|litres?|g|kg|min|h|hours?|days?|weeks?)$/i.test(makes[2])) {
      return parseInt(makes[1], 10);
    }
  }
  return DEFAULT_SERVINGS;
}

// ---------------------------------------------------------------------------
// Whole-page parsing
// ---------------------------------------------------------------------------

function padToSameLength(a, b) {
  while (a.length < b.length) a.push('');
  while (b.length < a.length) b.push('');
}

function parseRecipeFile(filePath) {
  const slug = basename(filePath, '.html');
  const html = readFileSync(filePath, 'utf8');

  const en = parseLangBlock(extractLangBlock(html, 'en'), 'en');
  const he = parseLangBlock(extractLangBlock(html, 'he'), 'he');

  // Servings from the EN meta line; falls back to 4 when the meta has no
  // serving count (e.g. sauerkraut's "Clay fermentation crock").
  const servings = extractServings(en.metaSpans);

  // Append notes as final steps.
  const stepsEn = [...en.steps, ...en.notes.map((n) => `Note: ${n}`)];
  const stepsHe = [...he.steps, ...he.notes.map((n) => `\u05d4\u05e2\u05e8\u05d4: ${n}`)]; // הערה:

  const ingredientsEn = [...en.ingredients];
  const ingredientsHe = [...he.ingredients];

  const mismatches = [];
  if (ingredientsEn.length !== ingredientsHe.length) {
    mismatches.push(`ingredients EN=${ingredientsEn.length} HE=${ingredientsHe.length}`);
  }
  if (stepsEn.length !== stepsHe.length) {
    mismatches.push(`steps EN=${stepsEn.length} HE=${stepsHe.length}`);
  }
  // Keep the arrays parallel regardless.
  padToSameLength(ingredientsEn, ingredientsHe);
  padToSameLength(stepsEn, stepsHe);

  return {
    slug,
    nameEn: en.name,
    nameHe: he.name,
    descEn: en.desc,
    descHe: he.desc,
    servings,
    ingredientsEn,
    ingredientsHe,
    stepsEn,
    stepsHe,
    tags: TAGS[slug] ?? [],
    mismatches,
  };
}

// ---------------------------------------------------------------------------
// Import via API
// ---------------------------------------------------------------------------

async function api(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${path} -> ${res.status} ${res.statusText} ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function importRecipe(r) {
  // 1. Create the recipe.
  const created = await api('POST', '/recipes', {
    name: r.nameEn,
    description: r.descEn,
    servings: r.servings,
    tags: r.tags,
    bannerImage: null,
    ingredients: r.ingredientsEn.map((name) => ({ name })),
    stages: r.stepsEn.map((text) => ({ text })),
    userCode: USER_CODE,
  });
  const id = created.id;
  if (id === undefined || id === null) throw new Error('POST /recipes returned no id');

  // 2. Fetch the created recipe to learn the auto-created variation's id.
  let variationId = null;
  try {
    const full = await api('GET', `/recipes/${id}`);
    variationId = full?.variations?.[0]?.id ?? null;
  } catch (e) {
    process.stderr.write(`  warn: GET /recipes/${id} failed (${e.message}); using variation id null\n`);
  }

  // 3. Update the variation with the Hebrew translation.
  await api('PUT', `/recipes/${id}`, {
    name: r.nameEn,
    variations: [
      {
        id: variationId,
        name: 'Original',
        description: r.descEn,
        servings: r.servings,
        tags: r.tags,
        bannerImage: null,
        ingredients: r.ingredientsEn.map((name) => ({ name })),
        stages: r.stepsEn.map((text) => ({ text })),
        translation: {
          langName: 'Hebrew',
          name: r.nameHe,
          description: r.descHe,
          ingredients: r.ingredientsHe.map((name) => ({ name })),
          stages: r.stepsHe.map((text) => ({ text })),
        },
      },
    ],
  });

  return id;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function summaryLine(r) {
  return `${r.slug}: "${r.nameEn}" / "${r.nameHe}" | servings=${r.servings} | ` +
    `ingredients=${r.ingredientsEn.length} | steps=${r.stepsEn.length} | tags=[${r.tags.join(', ')}]`;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const onlyIdx = args.indexOf('--only');
  const only = onlyIdx !== -1 ? args[onlyIdx + 1]?.replace(/\.html$/, '') : null;
  if (onlyIdx !== -1 && !only) {
    process.stderr.write('error: --only requires a recipe basename\n');
    process.exit(1);
  }

  let files = readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith('.html') && f !== 'index.html')
    .sort();
  if (only) {
    files = files.filter((f) => basename(f, '.html') === only);
    if (files.length === 0) {
      process.stderr.write(`error: no recipe page named "${only}.html" in ${RECIPES_DIR}\n`);
      process.exit(1);
    }
  }

  let failed = 0;
  for (const file of files) {
    const path = join(RECIPES_DIR, file);
    let recipe;
    try {
      recipe = parseRecipeFile(path);
    } catch (e) {
      failed++;
      process.stderr.write(`warn: skipping ${file} — parse failed: ${e.message}\n`);
      continue;
    }

    if (dryRun) {
      console.log(summaryLine(recipe));
      for (const m of recipe.mismatches) console.log(`  MISMATCH: ${m}`);
      const { slug, mismatches, ...json } = recipe;
      console.log(JSON.stringify(json, null, 2));
    } else {
      for (const m of recipe.mismatches) {
        process.stderr.write(`warn: ${recipe.slug}: EN/HE count mismatch (${m}) — padded\n`);
      }
      try {
        const id = await importRecipe(recipe);
        console.log(`ok     ${summaryLine(recipe)} | id=${id}`);
      } catch (e) {
        failed++;
        console.log(`failed ${recipe.slug}: ${e.message}`);
      }
    }
  }

  if (dryRun) {
    console.log(`\n${files.length - failed}/${files.length} recipes parsed cleanly` +
      (failed ? `, ${failed} failed` : ''));
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  process.stderr.write(`fatal: ${e.stack ?? e}\n`);
  process.exit(1);
});
