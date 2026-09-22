/**
 * Database abstraction layer
 * Uses PostgreSQL when DATABASE_URL is set, SQLite otherwise (local development).
 * The SQLite path mimics the pg Pool API (query / connect) and translates the
 * server's PostgreSQL queries to SQLite at runtime.
 */

const path = require('path');
const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';
const hasPostgres = !!process.env.DATABASE_URL;

let db;
let isUsingSQLite = false;

if (hasPostgres) {
  console.log('📦 Using PostgreSQL database');
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false
  });
} else {
  console.log('📦 Using SQLite database (local development)');
  isUsingSQLite = true;

  // Node's built-in SQLite (node:sqlite) — no native module to build.
  // Requires --experimental-sqlite on Node 22 (unflagged from Node 23).
  const { DatabaseSync } = require('node:sqlite');
  // DATA_DIR lets hosted deploys keep the DB on a mounted persistent volume
  const dbPath = process.env.DATA_DIR
    ? path.join(process.env.DATA_DIR, 'cheffinator.db')
    : path.join(__dirname, 'cheffinator_local.db');
  const sqlite = new DatabaseSync(dbPath);
  sqlite.exec('PRAGMA journal_mode = WAL');

  // SQLite can only bind null/number/string/bigint/buffer
  const sanitizeParam = (p) =>
    p === undefined ? null
    : typeof p === 'boolean' ? (p ? 1 : 0)
    : p instanceof Date ? p.toISOString()
    : p;

  // Convert PostgreSQL DDL/SQL syntax to SQLite
  function convertPgToSqlite(sql) {
    let result = sql;
    result = result.replace(/SERIAL\s+PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
    result = result.replace(/\bSERIAL\b/gi, 'INTEGER');
    result = result.replace(/\bTIMESTAMP\b/gi, 'TEXT');
    result = result.replace(/\bBOOLEAN\b/gi, 'INTEGER');
    result = result.replace(/DEFAULT\s+CURRENT_TIMESTAMP/gi, "DEFAULT (datetime('now'))");
    result = result.replace(/ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS/gi, 'ALTER TABLE $1 ADD COLUMN');
    return result;
  }

  // Replace $N placeholders with ?, expanding array params for `= ANY($N)` → `IN (...)`.
  // Handles repeated placeholders and $10+ correctly (single regex pass).
  function translate(text, params) {
    let sql = convertPgToSqlite(text);
    // `col = ANY($1)` → `col IN ($1)` (the $1 array is expanded below)
    sql = sql.replace(/(!?=)\s*ANY\s*\(\s*(\$\d+)\s*\)/gi, (m, op, ph) =>
      `${op === '!=' ? 'NOT IN' : 'IN'} (${ph})`);

    const outParams = [];
    sql = sql.replace(/\$(\d+)/g, (m, n) => {
      const p = params[Number(n) - 1];
      if (Array.isArray(p)) {
        if (p.length === 0) return 'NULL'; // IN (NULL) matches nothing
        for (const v of p) outParams.push(sanitizeParam(v));
        return p.map(() => '?').join(', ');
      }
      outParams.push(sanitizeParam(p));
      return '?';
    });
    return { sql, params: outParams };
  }

  // information_schema.columns existence checks → PRAGMA table_info
  function handleInformationSchema(text) {
    const table = /table_name\s*=\s*'(\w+)'/i.exec(text);
    const column = /column_name\s*=\s*'(\w+)'/i.exec(text);
    if (!table) return { rows: [] };
    let cols;
    try {
      cols = sqlite.prepare(`PRAGMA table_info(${table[1]})`).all();
    } catch {
      return { rows: [] };
    }
    const names = cols.map(c => ({ column_name: c.name }));
    if (column) return { rows: names.filter(c => c.column_name === column[1]) };
    return { rows: names };
  }

  function runQuery(text, params) {
    if (text.includes('information_schema')) {
      return handleInformationSchema(text);
    }

    const trimmed = text.trim().toUpperCase();
    if (/^(BEGIN|COMMIT|ROLLBACK)\b/.test(trimmed)) {
      try { sqlite.exec(trimmed.split(/\s/)[0]); } catch { /* no active tx */ }
      return { rows: [] };
    }

    const { sql, params: p } = translate(text, params);

    try {
      if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA') || trimmed.startsWith('WITH')) {
        const rows = sqlite.prepare(sql).all(...p);
        return { rows, rowCount: rows.length };
      }

      const returningMatch = /\sRETURNING\s+(.+)$/is.exec(sql);
      if (returningMatch) {
        const baseQuery = sql.replace(/\s+RETURNING\s+.*$/is, '');
        const table = (/(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+(\w+)/i.exec(baseQuery) || [])[1];
        const isInsert = /^\s*INSERT/i.test(baseQuery);
        const info = sqlite.prepare(baseQuery).run(...p);
        if (!table || info.changes === 0) return { rows: [], rowCount: Number(info.changes) };
        let rows = [];
        if (isInsert) {
          const row = sqlite.prepare(`SELECT * FROM ${table} WHERE rowid = ?`).get(info.lastInsertRowid);
          rows = row ? [row] : [];
        } else {
          // UPDATE/DELETE ... RETURNING: re-select using the original WHERE clause.
          const whereMatch = /\bWHERE\b([\s\S]+)$/i.exec(baseQuery);
          if (whereMatch) {
            const whereSql = whereMatch[1];
            const whereParamCount = (whereSql.match(/\?/g) || []).length;
            const whereParams = whereParamCount ? p.slice(-whereParamCount) : [];
            try {
              rows = sqlite.prepare(`SELECT * FROM ${table} WHERE ${whereSql}`).all(...whereParams);
            } catch { rows = []; }
          }
        }
        return { rows, rowCount: Number(info.changes) };
      }

      const info = sqlite.prepare(sql).run(...p);
      return { rows: [], rowCount: Number(info.changes) };
    } catch (error) {
      // Migrations re-run on every start (no information_schema short-circuit for
      // ALTERs) — swallow only the harmless re-apply errors, only for ALTER TABLE.
      if (/^\s*ALTER\s+TABLE/i.test(sql) &&
          (error.message.includes('duplicate column name') || error.message.includes('no such column'))) {
        return { rows: [] };
      }
      throw error;
    }
  }

  db = {
    query: async (text, params = []) => runQuery(text, params),
    connect: async () => ({
      query: async (text, params = []) => runQuery(text, params),
      release: () => {},
    })
  };
}

module.exports = {
  db,
  isUsingSQLite,
  isProduction
};
