/**
 * Renders a recipe as a standalone bilingual cookbook page — the exact format
 * of the static Recipes site (Heebo, HE/EN toggle, metric, one A4 page when
 * printed). Used by GET /api/recipes/:id/export and the static-site exporter.
 */

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// "Dough: 325 g flour" -> { group: "Dough", text: "325 g flour" }
// A group label is short and contains no digits (so "5 g lemon juice" stays whole).
function splitGroup(text) {
  const m = /^([^:\d]{2,30}):\s+(.+)$/s.exec(text);
  if (m) return { group: m[1].trim(), text: m[2].trim() };
  return { group: null, text };
}

// -> [{ group: string|null, items: [string] }], consecutive same-group merged
function groupIngredients(items) {
  const groups = [];
  for (const raw of items) {
    const { group, text } = splitGroup(raw);
    const last = groups[groups.length - 1];
    if (last && last.group === group) last.items.push(text);
    else groups.push({ group, items: [text] });
  }
  return groups;
}

// Steps whose text starts with a note prefix become notes instead
function splitNotes(steps, prefixes) {
  const real = [], notes = [];
  for (const s of steps) {
    const p = prefixes.find(p => s.startsWith(p));
    if (p) notes.push(s.slice(p.length).trim());
    else real.push(s);
  }
  return { steps: real, notes };
}

function renderIngredientColumns(groups) {
  const blocks = groups.map(g =>
    (g.group ? `<h3>${esc(g.group)}</h3>\n` : '') +
    `<ul>\n${g.items.map(i => `  <li>${esc(i)}</li>`).join('\n')}\n</ul>`
  );
  if (blocks.length <= 1) {
    return `<div class="columns">\n<div>\n${blocks.join('\n')}\n</div>\n</div>`;
  }
  const half = Math.ceil(blocks.length / 2);
  return `<div class="columns">\n<div>\n${blocks.slice(0, half).join('\n\n')}\n</div>\n<div>\n${blocks.slice(half).join('\n\n')}\n</div>\n</div>`;
}

function renderNutrition(nutrition, he) {
  if (!nutrition || !nutrition.perServing) return '';
  const L = he
    ? { title: 'ערכים תזונתיים', per: 'למנה', per100: 'ל-100 ג\'', cal: 'קלוריות', protein: 'חלבון', carbs: 'פחמימות', sugars: 'מתוכן סוכרים', fat: 'שומן' }
    : { title: 'Nutrition', per: 'Per serving', per100: 'Per 100 g', cal: 'Calories', protein: 'Protein', carbs: 'Carbs', sugars: 'of which sugars', fat: 'Fat' };
  const rows = [
    ['cal', L.cal, ''], ['protein', L.protein, ' g'], ['carbs', L.carbs, ' g'],
    ['sugars', L.sugars, ' g'], ['fat', L.fat, ' g']
  ].filter(([k]) => nutrition.perServing[k] != null);
  if (rows.length === 0) return '';
  const cell = (v, u) => v == null ? '—' : `${v}${u}`;
  return `
<h2>${L.title}</h2>
<table class="nutrition">
  <tr><th></th><th>${L.per}</th><th>${L.per100}</th></tr>
${rows.map(([k, label, unit]) =>
  `  <tr><td>${label}</td><td>${cell(nutrition.perServing[k], unit)}</td><td>${cell(nutrition.per100g?.[k], unit)}</td></tr>`
).join('\n')}
</table>`;
}

function renderLangSection(lang, d) {
  const he = lang === 'he';
  const L = he
    ? { servings: (n) => `${n} מנות`, ingredients: 'מצרכים', instructions: 'אופן ההכנה', notes: 'הערות' }
    : { servings: (n) => `Serves ${n}`, ingredients: 'Ingredients', instructions: 'Instructions', notes: 'Notes' };
  const { steps, notes } = splitNotes(d.steps, he ? ['הערה: ', 'הערה:'] : ['Note: ', 'Note:']);
  return `
<div data-lang="${lang}">
  <h1>${esc(d.name)}</h1>
  <div class="meta">
    <span>${L.servings(d.servings)}</span>
  </div>

  ${d.description ? `<p class="description">${esc(d.description)}</p>` : ''}

  <h2>${L.ingredients}</h2>
${renderIngredientColumns(groupIngredients(d.ingredients))}

  <h2>${L.instructions}</h2>
  <ol>
${steps.map(s => `    <li>${esc(s)}</li>`).join('\n')}
  </ol>
${notes.length ? `
  <div class="notes">
    <strong>${L.notes}</strong>
    <ul>
${notes.map(n => `      <li>${esc(n)}</li>`).join('\n')}
    </ul>
  </div>` : ''}
${renderNutrition(d.nutrition, he)}
</div>`;
}

/**
 * recipe: the full recipe object from the API (name, variations[...])
 * variationIndex: which variation to export
 * options.backHref: where the "All recipes" link points ('index.html' for the
 *                   static site, '/' when served from the app)
 */
function renderRecipePage(recipe, variationIndex = 0, options = {}) {
  const backHref = options.backHref || 'index.html';
  const v = recipe.variations[variationIndex] || recipe.variations[0];
  const tr = Array.isArray(v.translation) ? v.translation[0] : v.translation;

  const en = {
    name: recipe.name + (v.name && v.name !== 'Original' ? ` — ${v.name}` : ''),
    description: v.description || '',
    servings: v.servings || 4,
    ingredients: (v.ingredients || []).map(i => i.name),
    steps: (v.stages || []).map(s => s.text),
    nutrition: v.nutrition || null
  };
  // The Hebrew side falls back to English content when no translation exists
  const he = tr ? {
    name: tr.name || en.name,
    description: tr.description || en.description,
    servings: en.servings,
    ingredients: (tr.ingredients || []).map(i => i.name),
    steps: (tr.stages || []).map(s => s.text),
    nutrition: v.nutrition || null
  } : en;

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<title>${esc(en.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  body {
    font-family: 'Heebo', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    max-width: 720px;
    margin: 2rem auto;
    padding: 0 1.5rem;
    line-height: 1.6;
    color: #222;
    background: #fafaf7;
  }
  h1 { border-bottom: 2px solid #333; padding-bottom: 0.3rem; margin-bottom: 0.25rem; }
  .meta { color: #666; font-size: 0.9rem; margin-bottom: 1rem; font-style: italic; }
  .meta span + span::before { content: " · "; }
  .description { margin-bottom: 1.5rem; }
  h2 {
    margin-top: 1.75rem; margin-bottom: 0.5rem; font-size: 1.1rem;
    text-transform: uppercase; letter-spacing: 0.05em; color: #555;
    border-bottom: 1px solid #ddd; padding-bottom: 0.2rem;
  }
  ul, ol { padding-inline-start: 1.5rem; margin: 0.25rem 0 0.5rem; }
  li { margin-bottom: 0.35rem; }
  .columns { display: flex; gap: 2rem; flex-wrap: wrap; }
  .columns > div { flex: 1; min-width: 220px; }
  .columns h3 { font-size: 0.95rem; margin: 0.5rem 0 0.25rem; color: #444; }
  .notes {
    border-inline-start: 3px solid #c8a165; padding: 0.5rem 0.85rem;
    margin-top: 1rem; background: #fdf8ef; font-size: 0.95rem;
  }
  .notes ul { margin: 0.25rem 0 0; }
  .nutrition { border-collapse: collapse; font-size: 0.9rem; margin-top: 0.25rem; }
  .nutrition th, .nutrition td { padding: 0.2rem 0.9rem 0.2rem 0; text-align: start; }
  .nutrition th { color: #666; font-weight: 500; }
  .back { display: inline-block; margin-bottom: 1.5rem; color: #555; text-decoration: none; font-size: 0.9rem; }
  .back:hover { text-decoration: underline; }
  .topbar {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 1.5rem; gap: 0.5rem; direction: ltr;
  }
  .topbar .back { margin-bottom: 0; }
  .topbar-actions { display: flex; gap: 0.5rem; }
  .print-btn, .lang-btn {
    font: inherit; font-size: 0.9rem; padding: 0.4rem 0.9rem;
    background: #333; color: #fafaf7; border: none; border-radius: 3px; cursor: pointer;
  }
  .lang-btn {
    background: transparent; color: #333; border: 1px solid #333;
    font-weight: bold; letter-spacing: 0.05em;
  }
  .print-btn:hover { background: #555; }
  .lang-btn:hover { background: #333; color: #fafaf7; }

  /* Show only the current language's content */
  html[lang="he"] [data-lang="en"] { display: none !important; }
  html[lang="en"] [data-lang="he"] { display: none !important; }

  @media print {
    @page { size: A4; margin: 10mm 12mm; }
    body {
      background: #fff; color: #000; max-width: none; margin: 0; padding: 0;
      font-size: 9pt; line-height: 1.25;
    }
    .topbar, .print-btn, .lang-btn, .back { display: none !important; }
    h1 { font-size: 15pt; margin: 0 0 0.1rem; padding-bottom: 0.15rem; }
    h2 { font-size: 9.5pt; margin: 0.5rem 0 0.2rem; padding-bottom: 0.1rem; page-break-after: avoid; }
    .meta { margin-bottom: 0.4rem; font-size: 0.85rem; }
    .description { margin-bottom: 0.5rem; }
    .columns h3 { font-size: 0.9rem; margin: 0.25rem 0 0.1rem; page-break-after: avoid; }
    .description, .meta { color: #333; }
    ul, ol { padding-inline-start: 1.2rem; margin: 0.1rem 0 0.3rem; }
    li { margin-bottom: 0.12rem; page-break-inside: avoid; }
    .notes {
      background: transparent; border-inline-start: 2px solid #888;
      padding: 0.3rem 0.6rem; margin-top: 0.5rem; font-size: 0.9rem;
    }
    .notes ul { margin: 0.1rem 0 0; }
    .nutrition { font-size: 8pt; }
    ol, ul { page-break-inside: auto; }
    .columns { display: flex; gap: 1rem; }
    a { color: #000; text-decoration: none; }
  }

  @media (prefers-color-scheme: dark) {
    body { background: #1a1a1a; color: #d8d4c8; }
    h1 { border-bottom-color: #d8d4c8; }
    .meta { color: #999; }
    h2 { color: #aaa; border-bottom-color: #333; }
    .columns h3 { color: #bbb; }
    .notes { background: #2a2418; border-inline-start-color: #b08a4a; color: #d8d4c8; }
    .nutrition th { color: #999; }
    .back { color: #aaa; }
    a { color: #c8a165; }
    .lang-btn { color: #d8d4c8; border-color: #d8d4c8; }
    .lang-btn:hover { background: #d8d4c8; color: #1a1a1a; }
  }
</style>
<script>
  // Apply saved language before paint, to avoid flash
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
  <a class="back" href="${esc(backHref)}">
    <span data-lang="he">← כל המתכונים</span><span data-lang="en">← All recipes</span>
  </a>
  <div class="topbar-actions">
    <button class="lang-btn" onclick="toggleLang()" aria-label="Toggle language">
      <span data-lang="he">EN</span><span data-lang="en">עב</span>
    </button>
    <button class="print-btn" onclick="window.print()">
      <span data-lang="he">הדפסה</span><span data-lang="en">Print</span>
    </button>
  </div>
</div>

<!-- ============ HEBREW ============ -->
${renderLangSection('he', he)}

<!-- ============ ENGLISH ============ -->
${renderLangSection('en', en)}

<script>
  function setLang(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.title = lang === 'he' ? ${JSON.stringify(he.name)} : ${JSON.stringify(en.name)};
    try { localStorage.setItem('recipeLang', lang); } catch (e) {}
  }
  function toggleLang() {
    setLang(document.documentElement.lang === 'he' ? 'en' : 'he');
  }
  setLang(document.documentElement.lang === 'en' ? 'en' : 'he');
</script>

</body>
</html>
`;
}

module.exports = { renderRecipePage };
