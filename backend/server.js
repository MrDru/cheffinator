const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const Anthropic = require('@anthropic-ai/sdk').default;
const { OAuth2Client } = require('google-auth-library');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Initialize Supabase client for storage
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('📦 Supabase Storage initialized');
} else {
  console.warn('⚠️ Supabase credentials not found - image uploads will use local storage');
}

// Initialize Anthropic client for AI features (nutrition estimation)
let anthropic = null;
if (process.env.CHEFFINATOR_API) {
  anthropic = new Anthropic({ apiKey: process.env.CHEFFINATOR_API });
  console.log('🤖 Anthropic AI initialized');
} else {
  console.warn('⚠️ CHEFFINATOR_API not set — AI nutrition estimation unavailable');
}

// Ensure uploads directory exists (local disk storage when Supabase is unset;
// DATA_DIR keeps it on a mounted persistent volume in hosted deploys)
const uploadsDir = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads (memory storage for Supabase, disk for local)
const storage = supabase
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
      }
    });
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB max per image
});

// Default tags from spec
const DEFAULT_TAGS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Quick', 'Easy', 
  'Dessert', 'Breakfast', 'Lunch', 'Dinner', 'Snack',
  'Israeli', 'Italian', 'Asian', 'Mexican', 
  'Healthy', 'Comfort Food', 'Kid-Friendly', 'Spicy',
  'Soup', 'Salad', 'Pasta', 'Meat', 'Fish', 'Chicken',
  'Baking', 'Holiday', 'Shabbat', 'Passover'
];

// Default user codes for initial seeding (used only if users table is empty)
const DEFAULT_USERS = [
  'cheffinator',
  'mrdru3000',
  'dante',
  'jono',
  'tester4'
];

// Validate environment. Production needs either a Postgres URL or a
// persistent data dir for SQLite - otherwise data dies with the instance.
if (isProduction && !process.env.DATABASE_URL && !process.env.DATA_DIR) {
  console.error('❌ Set DATABASE_URL (Postgres) or DATA_DIR (SQLite on a persistent volume) in production!');
  process.exit(1);
}
if (isProduction && !process.env.ADMIN_SECRET) {
  console.warn('⚠️ ADMIN_SECRET not set — the /api/admin endpoints are disabled');
}
for (const envVar of ['SUPABASE_URL', 'SUPABASE_ANON_KEY']) {
  if (!process.env[envVar]) {
    console.warn(`⚠️ ${envVar} not set — image uploads will use local disk storage`);
  }
}
if (!process.env.CHEFFINATOR_API) {
  console.warn('⚠️ CHEFFINATOR_API not set — AI nutrition estimation unavailable');
}

// db.js picks PostgreSQL when DATABASE_URL is set, SQLite otherwise (local dev)
const pool = require('./db').db;
const { renderRecipePage } = require('./export-template');

// DB TEXT columns hold JSON; never let one bad row 500 a whole endpoint
function safeParse(text, fallback) {
  if (!text) return fallback;
  if (typeof text === 'object') return text;
  try { return JSON.parse(text); } catch { return fallback; }
}

console.log('📦 Connecting to database...');

// Initialize database tables
async function initDatabase() {
  const client = await pool.connect();
  try {
    // Main recipes table (container for variations)
    await client.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        servings INTEGER DEFAULT 4,
        tags TEXT,
        banner_image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Recipe variations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS recipe_variations (
        id TEXT PRIMARY KEY,
        recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        servings INTEGER DEFAULT 4,
        tags TEXT,
        banner_image TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Ingredients now reference variations
    await client.query(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id TEXT PRIMARY KEY,
        recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE,
        variation_id TEXT REFERENCES recipe_variations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        amount TEXT,
        unit TEXT DEFAULT 'g',
        image TEXT,
        sort_order INTEGER DEFAULT 0
      )
    `);
    
    // Cooking steps now reference variations
    await client.query(`
      CREATE TABLE IF NOT EXISTS cooking_steps (
        id TEXT PRIMARY KEY,
        recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE,
        variation_id TEXT REFERENCES recipe_variations(id) ON DELETE CASCADE,
        step_text TEXT NOT NULL,
        image TEXT,
        sort_order INTEGER DEFAULT 0
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS custom_tags (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Users table for managing access codes
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Migration: Add variation_id column if it doesn't exist
    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'ingredients' AND column_name = 'variation_id'
    `);
    
    if (colCheck.rows.length === 0) {
      console.log('Running migration: adding variation support...');
      
      // Add variation_id columns
      await client.query(`ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS variation_id TEXT`);
      await client.query(`ALTER TABLE cooking_steps ADD COLUMN IF NOT EXISTS variation_id TEXT`);
      
      // Migrate existing recipes to have a default "Original" variation
      const existingRecipes = await client.query('SELECT * FROM recipes');
      
      for (const recipe of existingRecipes.rows) {
        // Check if this recipe already has variations
        const existingVariations = await client.query(
          'SELECT id FROM recipe_variations WHERE recipe_id = $1',
          [recipe.id]
        );
        
        if (existingVariations.rows.length === 0) {
          const variationId = uuidv4();
          
          // Create the "Original" variation
          await client.query(
            `INSERT INTO recipe_variations (id, recipe_id, name, description, servings, tags, banner_image, sort_order, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [variationId, recipe.id, 'Original', recipe.description, recipe.servings, recipe.tags, recipe.banner_image, 0, recipe.created_at, recipe.updated_at]
          );
          
          // Update existing ingredients to reference the variation
          await client.query(
            'UPDATE ingredients SET variation_id = $1 WHERE recipe_id = $2 AND variation_id IS NULL',
            [variationId, recipe.id]
          );
          
          // Update existing cooking steps to reference the variation
          await client.query(
            'UPDATE cooking_steps SET variation_id = $1 WHERE recipe_id = $2 AND variation_id IS NULL',
            [variationId, recipe.id]
          );
        }
      }
      
      console.log('Migration complete: variation support added');
    }
    
    // Migration: Add user_code column for multi-user support
    const userCodeCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'recipes' AND column_name = 'user_code'
    `);
    
    if (userCodeCheck.rows.length === 0) {
      console.log('Running migration: adding user support...');
      await client.query(`ALTER TABLE recipes ADD COLUMN user_code TEXT DEFAULT 'default'`);
      console.log('Migration complete: user support added');
    }
    
    // Migration: Add share_id column for public sharing
    const shareIdCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'recipes' AND column_name = 'share_id'
    `);
    
    if (shareIdCheck.rows.length === 0) {
      console.log('Running migration: adding share support...');
      await client.query(`ALTER TABLE recipes ADD COLUMN share_id TEXT UNIQUE`);
      console.log('Migration complete: share support added');
    }
    
    // Migration: Add is_published column for discover page visibility
    const publishedCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'recipes' AND column_name = 'is_published'
    `);
    
    if (publishedCheck.rows.length === 0) {
      console.log('Running migration: adding publish support...');
      await client.query(`ALTER TABLE recipes ADD COLUMN is_published BOOLEAN DEFAULT FALSE`);
      console.log('Migration complete: publish support added');
    }
    
    // Migration: Add translation column to recipe_variations
    const translationCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'recipe_variations' AND column_name = 'translation'
    `);

    if (translationCheck.rows.length === 0) {
      console.log('Running migration: adding translation support...');
      await client.query(`ALTER TABLE recipe_variations ADD COLUMN IF NOT EXISTS translation TEXT`);
      console.log('Migration complete: translation support added');
    }

    // Migration: Add nutrition column to recipe_variations
    const nutritionCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'recipe_variations' AND column_name = 'nutrition'
    `);

    if (nutritionCheck.rows.length === 0) {
      console.log('Running migration: adding nutrition support...');
      await client.query(`ALTER TABLE recipe_variations ADD COLUMN IF NOT EXISTS nutrition TEXT`);
      console.log('Migration complete: nutrition support added');
    }

    // Seed users table with default users if empty
    const usersCount = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(usersCount.rows[0].count) === 0) {
      console.log('Seeding users table with default users...');
      for (const code of DEFAULT_USERS) {
        await client.query(
          'INSERT INTO users (code) VALUES ($1) ON CONFLICT (code) DO NOTHING',
          [code.toLowerCase()]
        );
      }
      console.log('Users table seeded with', DEFAULT_USERS.length, 'users');
    }

    // Create indexes for better query performance
    console.log('Creating indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_recipes_user_code ON recipes(LOWER(user_code))`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_recipes_share_id ON recipes(share_id)`);
    // Sessions table for token-based auth
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_code TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migration: Google sign-in fields on users
    const googleCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'google_sub'
    `);
    if (googleCheck.rows.length === 0) {
      console.log('Running migration: adding Google sign-in support...');
      await client.query(`ALTER TABLE users ADD COLUMN google_sub TEXT`);
      await client.query(`ALTER TABLE users ADD COLUMN email TEXT`);
      await client.query(`ALTER TABLE users ADD COLUMN display_name TEXT`);
      await client.query(`ALTER TABLE users ADD COLUMN avatar_url TEXT`);
      console.log('Migration complete: Google sign-in support added');
    }
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL`);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_recipes_is_published ON recipes(is_published)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_recipe_variations_recipe_id ON recipe_variations(recipe_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ingredients_variation_id ON ingredients(variation_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cooking_steps_variation_id ON cooking_steps(variation_id)`);
    console.log('Indexes created');

    console.log('Database tables initialized');
  } finally {
    client.release();
  }
}

// Helper to format time ago
function timeAgo(date) {
  if (!date) return 'Just now';
  const now = new Date();
  const seconds = Math.floor((now - new Date(date)) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 172800) return 'Yesterday';
  return `${Math.floor(seconds / 86400)} days ago`;
}

// Helper to save custom tags
async function saveCustomTags(tags) {
  if (!tags || !Array.isArray(tags)) return;
  
  for (const tag of tags) {
    if (!DEFAULT_TAGS.includes(tag)) {
      try {
        await pool.query(
          'INSERT INTO custom_tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
          [tag]
        );
      } catch (e) {
        console.error(`Failed to save custom tag "${tag}":`, e.message);
      }
    }
  }
}

// Middleware - CORS configured to allow all origins including local files
app.use(cors({
  origin: true, // Allow all origins
  credentials: true
}));
app.use(express.json({ limit: '5mb' })); // Reduced from 50mb to prevent memory crashes
app.use('/uploads', express.static(uploadsDir));

// ---------------------------------------------------------------------------
// Auth: token sessions + ownership checks
// ---------------------------------------------------------------------------

const SESSION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

async function createSession(userCode) {
  const token = crypto.randomBytes(24).toString('hex');
  await pool.query(
    'INSERT INTO sessions (token, user_code, created_at) VALUES ($1, $2, $3)',
    [token, userCode, new Date()]
  );
  return token;
}

function bearerToken(req) {
  return (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
}

// Attaches req.userCode from a valid session token, else 401
async function requireAuth(req, res, next) {
  try {
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const result = await pool.query('SELECT user_code, created_at FROM sessions WHERE token = $1', [token]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    const session = result.rows[0];
    if (Date.now() - new Date(session.created_at).getTime() > SESSION_MAX_AGE_MS) {
      await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    req.userCode = session.user_code.toLowerCase();
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Auth check failed' });
  }
}

// After requireAuth: the recipe in :id must belong to the session's user
async function requireRecipeOwner(req, res, next) {
  try {
    const result = await pool.query('SELECT user_code FROM recipes WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    if ((result.rows[0].user_code || '').toLowerCase() !== req.userCode) {
      return res.status(403).json({ error: 'Not your recipe' });
    }
    next();
  } catch (error) {
    console.error('Ownership check error:', error);
    res.status(500).json({ error: 'Ownership check failed' });
  }
}

// Admin endpoints need the ADMIN_SECRET env var; without it they are disabled
function requireAdmin(req, res, next) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return res.status(503).json({ error: 'Admin API disabled (ADMIN_SECRET not set)' });
  }
  const provided = req.headers['x-admin-secret'] || bearerToken(req);
  const a = Buffer.from(String(provided || ''));
  const b = Buffer.from(secret);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Invalid admin secret' });
  }
  next();
}

// Every /api/admin/* route (they are all defined below) requires the secret
app.use('/api/admin', requireAdmin);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', uptime: process.uptime() });
  } catch (error) {
    res.status(503).json({ status: 'error', error: 'Database unreachable' });
  }
});

// Validate user code (checks database)
app.post('/api/auth/validate', async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ valid: false, error: 'Code is required' });
  }
  
  try {
    const normalizedCode = code.trim().toLowerCase();
    const result = await pool.query(
      'SELECT code FROM users WHERE LOWER(code) = $1',
      [normalizedCode]
    );
    
    if (result.rows.length > 0) {
      const token = await createSession(normalizedCode);
      res.json({ valid: true, code: normalizedCode, token });
    } else {
      res.status(401).json({ valid: false, error: 'Invalid access code' });
    }
  } catch (error) {
    console.error('Error validating user code:', error);
    res.status(500).json({ valid: false, error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// Google sign-in (Google Identity Services ID tokens)
// ---------------------------------------------------------------------------

const googleAuthClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;
if (!googleAuthClient) {
  console.warn('⚠️ GOOGLE_CLIENT_ID not set — Google sign-in disabled (access codes still work)');
}

// Verifies a GIS credential (ID token) and returns Google's payload
async function verifyGoogleCredential(credential) {
  const ticket = await googleAuthClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  return ticket.getPayload(); // { sub, email, name, picture, ... }
}

const USERNAME_RE = /^[a-z0-9_-]{3,20}$/;

async function usernameTaken(username) {
  const r = await pool.query('SELECT 1 FROM users WHERE LOWER(code) = $1', [username]);
  return r.rows.length > 0;
}

// Suggest a free username from the Google profile (email prefix / name)
async function suggestUsername(payload) {
  let base = (payload.email || '').split('@')[0] || payload.name || 'chef';
  base = base.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 16) || 'chef';
  if (base.length < 3) base = `chef-${base}`;
  if (!(await usernameTaken(base))) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}${i}`;
    if (!(await usernameTaken(candidate))) return candidate;
  }
  return `chef-${crypto.randomBytes(3).toString('hex')}`;
}

// Tells the frontend whether Google sign-in is available (and with which client id)
app.get('/api/auth/config', (req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null });
});

// Sign in with a Google credential. Known account -> session token.
// Unknown account -> needsUsername (the client asks the user to pick a chef
// name and calls /api/auth/google/register with the same credential).
app.post('/api/auth/google', async (req, res) => {
  if (!googleAuthClient) {
    return res.status(503).json({ error: 'Google sign-in is not configured' });
  }
  try {
    const payload = await verifyGoogleCredential(req.body.credential);
    const existing = await pool.query('SELECT code FROM users WHERE google_sub = $1', [payload.sub]);
    if (existing.rows.length > 0) {
      const code = existing.rows[0].code.toLowerCase();
      const token = await createSession(code);
      return res.json({ valid: true, code, token });
    }
    res.json({
      valid: false,
      needsUsername: true,
      suggestion: await suggestUsername(payload),
      email: payload.email || null
    });
  } catch (error) {
    console.error('Google sign-in error:', error.message);
    res.status(401).json({ error: 'Google sign-in failed' });
  }
});

// Complete first-time Google sign-up with a chosen username
app.post('/api/auth/google/register', async (req, res) => {
  if (!googleAuthClient) {
    return res.status(503).json({ error: 'Google sign-in is not configured' });
  }
  try {
    const payload = await verifyGoogleCredential(req.body.credential);

    // Already registered (e.g. double submit): just log in
    const existing = await pool.query('SELECT code FROM users WHERE google_sub = $1', [payload.sub]);
    if (existing.rows.length > 0) {
      const code = existing.rows[0].code.toLowerCase();
      const token = await createSession(code);
      return res.json({ valid: true, code, token });
    }

    const username = String(req.body.username || '').trim().toLowerCase();
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-20 characters: letters, numbers, - or _' });
    }
    if (await usernameTaken(username)) {
      return res.status(409).json({ error: 'That name is taken' });
    }

    await pool.query(
      `INSERT INTO users (code, google_sub, email, display_name, avatar_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [username, payload.sub, payload.email || null, payload.name || null, payload.picture || null, new Date()]
    );
    const token = await createSession(username);
    res.json({ valid: true, code: username, token });
  } catch (error) {
    console.error('Google registration error:', error.message);
    res.status(401).json({ error: 'Google sign-up failed' });
  }
});

// Live username availability check for the sign-up form
app.get('/api/auth/username-check', async (req, res) => {
  try {
    const username = String(req.query.u || '').trim().toLowerCase();
    if (!USERNAME_RE.test(username)) {
      return res.json({ valid: false, available: false });
    }
    res.json({ valid: true, available: !(await usernameTaken(username)) });
  } catch (error) {
    res.status(500).json({ error: 'Check failed' });
  }
});

// Log out: invalidate the session token
app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = bearerToken(req);
    if (token) await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    res.json({ ok: true });
  } catch (error) {
    res.json({ ok: true }); // logout never fails from the client's perspective
  }
});

// Get all recipes (filtered by user_code, case-insensitive)
// Optimized: uses batch queries instead of N+1 pattern
app.get('/api/recipes', requireAuth, async (req, res) => {
  try {
    const userCode = req.userCode; // from the session, never from the query
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    // Query 1: Get all recipes for user with pagination
    const recipesResult = await pool.query(
      'SELECT * FROM recipes WHERE LOWER(user_code) = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3',
      [userCode, limit, offset]
    );

    if (recipesResult.rows.length === 0) {
      return res.json([]);
    }

    const recipeIds = recipesResult.rows.map(r => r.id);

    // Query 2: Get all variations for these recipes in one query
    const variationsResult = await pool.query(
      `SELECT * FROM recipe_variations WHERE recipe_id = ANY($1) ORDER BY recipe_id, sort_order`,
      [recipeIds]
    );

    const variationIds = variationsResult.rows.map(v => v.id);

    // Query 3 & 4: Get all ingredients and steps in parallel
    const [ingredientsResult, stepsResult] = await Promise.all([
      variationIds.length > 0
        ? pool.query('SELECT * FROM ingredients WHERE variation_id = ANY($1) ORDER BY variation_id, sort_order', [variationIds])
        : { rows: [] },
      variationIds.length > 0
        ? pool.query('SELECT * FROM cooking_steps WHERE variation_id = ANY($1) ORDER BY variation_id, sort_order', [variationIds])
        : { rows: [] }
    ]);

    // Build lookup maps for O(1) access
    const ingredientsByVariation = {};
    for (const ing of ingredientsResult.rows) {
      if (!ingredientsByVariation[ing.variation_id]) ingredientsByVariation[ing.variation_id] = [];
      ingredientsByVariation[ing.variation_id].push({
        id: ing.id,
        name: ing.name,
        amount: ing.amount || '',
        unit: ing.unit || 'g',
        image: ing.image
      });
    }

    const stepsByVariation = {};
    for (const step of stepsResult.rows) {
      if (!stepsByVariation[step.variation_id]) stepsByVariation[step.variation_id] = [];
      stepsByVariation[step.variation_id].push({
        id: step.id,
        text: step.step_text,
        image: step.image
      });
    }

    const variationsByRecipe = {};
    for (const v of variationsResult.rows) {
      if (!variationsByRecipe[v.recipe_id]) variationsByRecipe[v.recipe_id] = [];
      variationsByRecipe[v.recipe_id].push({
        id: v.id,
        name: v.name,
        description: v.description || '',
        servings: v.servings,
        tags: safeParse(v.tags, []),
        bannerImage: v.banner_image,
        translation: safeParse(v.translation, null),
        nutrition: safeParse(v.nutrition, null),
        ingredients: ingredientsByVariation[v.id] || [],
        stages: stepsByVariation[v.id] || []
      });
    }

    // Assemble final response
    const recipes = recipesResult.rows.map(recipe => {
      const variations = variationsByRecipe[recipe.id] || [];
      const firstVariation = variations[0] || {};

      return {
        id: recipe.id,
        name: recipe.name,
        description: firstVariation.description || recipe.description || '',
        servings: firstVariation.servings || recipe.servings,
        tags: firstVariation.tags || (safeParse(recipe.tags, [])),
        bannerImage: firstVariation.bannerImage || recipe.banner_image,
        updated: timeAgo(recipe.updated_at),
        updatedAt: new Date(recipe.updated_at).toISOString(),
        variations: variations,
        ingredients: firstVariation.ingredients || [],
        stages: firstVariation.stages || [],
        isPublished: recipe.is_published || false
      };
    });

    res.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Get lightweight recipe list for dashboard (10x smaller payload)
// Returns only: id, name, updated_at, tags, banner_image, variation_count
app.get('/api/recipes/summary', requireAuth, async (req, res) => {
  try {
    const userCode = req.userCode;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(`
      SELECT
        r.id, r.name, r.updated_at, r.is_published,
        (SELECT banner_image FROM recipe_variations WHERE recipe_id = r.id ORDER BY sort_order LIMIT 1) as banner_image,
        (SELECT tags FROM recipe_variations WHERE recipe_id = r.id ORDER BY sort_order LIMIT 1) as tags,
        (SELECT COUNT(*) FROM recipe_variations WHERE recipe_id = r.id) as variation_count
      FROM recipes r
      WHERE LOWER(r.user_code) = $1
      ORDER BY r.updated_at DESC
      LIMIT $2 OFFSET $3
    `, [userCode, limit, offset]);

    const recipes = result.rows.map(recipe => ({
      id: recipe.id,
      name: recipe.name,
      updated: timeAgo(recipe.updated_at),
      tags: safeParse(recipe.tags, []),
      bannerImage: recipe.banner_image,
      variationCount: parseInt(recipe.variation_count),
      isPublished: recipe.is_published || false
    }));

    res.json(recipes);
  } catch (error) {
    console.error('Error fetching recipe summaries:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Fetch a recipe with all variations/ingredients/steps assembled (or null)
// Optimized: uses batch queries instead of N+1 pattern
async function fetchFullRecipe(id) {
    const recipeResult = await pool.query(
      'SELECT * FROM recipes WHERE id = $1',
      [id]
    );

    if (recipeResult.rows.length === 0) {
      return null;
    }

    const recipe = recipeResult.rows[0];

    // Get all variations for this recipe
    const variationsResult = await pool.query(
      'SELECT * FROM recipe_variations WHERE recipe_id = $1 ORDER BY sort_order',
      [recipe.id]
    );

    const variationIds = variationsResult.rows.map(v => v.id);

    // Get all ingredients and steps in parallel
    const [ingredientsResult, stepsResult] = await Promise.all([
      variationIds.length > 0
        ? pool.query('SELECT * FROM ingredients WHERE variation_id = ANY($1) ORDER BY variation_id, sort_order', [variationIds])
        : { rows: [] },
      variationIds.length > 0
        ? pool.query('SELECT * FROM cooking_steps WHERE variation_id = ANY($1) ORDER BY variation_id, sort_order', [variationIds])
        : { rows: [] }
    ]);

    // Build lookup maps
    const ingredientsByVariation = {};
    for (const ing of ingredientsResult.rows) {
      if (!ingredientsByVariation[ing.variation_id]) ingredientsByVariation[ing.variation_id] = [];
      ingredientsByVariation[ing.variation_id].push({
        id: ing.id,
        name: ing.name,
        amount: ing.amount || '',
        unit: ing.unit || 'g',
        image: ing.image
      });
    }

    const stepsByVariation = {};
    for (const step of stepsResult.rows) {
      if (!stepsByVariation[step.variation_id]) stepsByVariation[step.variation_id] = [];
      stepsByVariation[step.variation_id].push({
        id: step.id,
        text: step.step_text,
        image: step.image
      });
    }

    // Assemble variations
    const variations = variationsResult.rows.map(v => ({
      id: v.id,
      name: v.name,
      description: v.description || '',
      servings: v.servings,
      tags: safeParse(v.tags, []),
      bannerImage: v.banner_image,
      translation: safeParse(v.translation, null),
      nutrition: safeParse(v.nutrition, null),
      ingredients: ingredientsByVariation[v.id] || [],
      stages: stepsByVariation[v.id] || []
    }));

    const firstVariation = variations[0] || {};

    return {
      id: recipe.id,
      name: recipe.name,
      description: firstVariation.description || recipe.description || '',
      servings: firstVariation.servings || recipe.servings,
      tags: firstVariation.tags || (safeParse(recipe.tags, [])),
      bannerImage: firstVariation.bannerImage || recipe.banner_image,
      updated: timeAgo(recipe.updated_at),
      updatedAt: new Date(recipe.updated_at).toISOString(),
      variations: variations,
      ingredients: firstVariation.ingredients || [],
      stages: firstVariation.stages || []
    };
}

// Get single recipe
app.get('/api/recipes/:id', async (req, res) => {
  try {
    const recipe = await fetchFullRecipe(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

// Export a recipe as a standalone bilingual cookbook page (A4 print format)
app.get('/api/recipes/:id/export', async (req, res) => {
  try {
    const recipe = await fetchFullRecipe(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    const vIndex = Math.max(0, Math.min(parseInt(req.query.variation) || 0, recipe.variations.length - 1));
    const html = renderRecipePage(recipe, vIndex, {
      backHref: req.query.back === 'app' ? '/' : 'index.html'
    });
    res.type('html').send(html);
  } catch (error) {
    console.error('Error exporting recipe:', error);
    res.status(500).json({ error: 'Failed to export recipe' });
  }
});

// Create recipe
app.post('/api/recipes', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { name, description, servings, tags, bannerImage, ingredients, stages } = req.body;
    const recipeId = uuidv4();
    const variationId = uuidv4();
    const now = new Date();
    const normalizedUserCode = req.userCode; // owner comes from the session
    
    // Save any custom tags
    await saveCustomTags(tags);
    
    // Create the recipe container with user_code (normalized to lowercase)
    await client.query(
      `INSERT INTO recipes (id, name, user_code, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [recipeId, name, normalizedUserCode, now, now]
    );
    
    // Create the first variation (Original)
    await client.query(
      `INSERT INTO recipe_variations (id, recipe_id, name, description, servings, tags, banner_image, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [variationId, recipeId, 'Original', description || '', servings || 4, JSON.stringify(tags || []), bannerImage || null, 0, now, now]
    );
    
    // Insert ingredients and steps in PARALLEL
    const ingredientPromises = (ingredients || [])
      .filter(ing => ing.name && ing.name.trim())
      .map((ing, i) => client.query(
        `INSERT INTO ingredients (id, recipe_id, variation_id, name, amount, unit, image, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [uuidv4(), recipeId, variationId, ing.name, ing.amount || '', ing.unit || 'g', ing.image || null, i]
      ));
    
    const stepPromises = (stages || [])
      .filter(step => step.text && step.text.trim())
      .map((step, i) => client.query(
        `INSERT INTO cooking_steps (id, recipe_id, variation_id, step_text, image, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), recipeId, variationId, step.text, step.image || null, i]
      ));
    
    await Promise.all([...ingredientPromises, ...stepPromises]);
    
    await client.query('COMMIT');
    res.status(201).json({ id: recipeId, message: 'Recipe created successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating recipe:', error);
    res.status(500).json({ error: 'Failed to create recipe' });
  } finally {
    client.release();
  }
});

// Update recipe (and its variations)
app.put('/api/recipes/:id', requireAuth, requireRecipeOwner, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { name, variations, expectedUpdatedAt } = req.body;
    const { id } = req.params;

    // Check if recipe exists
    const existing = await client.query('SELECT id, updated_at FROM recipes WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Optimistic concurrency: reject stale saves so one device can't silently
    // overwrite another's newer edits. Client sends the updated_at it last saw.
    const currentUpdatedAt = new Date(existing.rows[0].updated_at).toISOString();
    if (expectedUpdatedAt && new Date(expectedUpdatedAt).toISOString() !== currentUpdatedAt) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Recipe was modified elsewhere',
        currentUpdatedAt
      });
    }

    const now = new Date();
    
    // Update recipe name and timestamp (owner transfers are admin-only,
    // via POST /api/admin/recipes/:id/transfer)
    await client.query(
      `UPDATE recipes SET name = $1, updated_at = $2 WHERE id = $3`,
      [name, now, id]
    );
    
    // Collect the final server-side ID of each variation (in payload order) so
    // the client can sync its state - otherwise new variations churn on every save.
    const savedVariationIds = [];

    // Handle variations
    if (variations && variations.length > 0) {
      // Get existing variation IDs
      const existingVars = await client.query(
        'SELECT id FROM recipe_variations WHERE recipe_id = $1',
        [id]
      );
      const existingVarIds = existingVars.rows.map(v => v.id);
      const newVarIds = variations.map(v => v.id).filter(Boolean);
      
      // Delete variations that are no longer present
      for (const existingId of existingVarIds) {
        if (!newVarIds.includes(existingId)) {
          await client.query('DELETE FROM ingredients WHERE variation_id = $1', [existingId]);
          await client.query('DELETE FROM cooking_steps WHERE variation_id = $1', [existingId]);
          await client.query('DELETE FROM recipe_variations WHERE id = $1', [existingId]);
        }
      }
      
      // Update or create each variation
      for (let vIndex = 0; vIndex < variations.length; vIndex++) {
        const variation = variations[vIndex];
        let variationId = variation.id;
        
        // Save any custom tags (don't await, but log errors)
        saveCustomTags(variation.tags).catch(e => console.error('Failed to save custom tags:', e.message));
        
        if (variationId && existingVarIds.includes(variationId)) {
          // Update existing variation
          await client.query(
            `UPDATE recipe_variations
             SET name = $1, description = $2, servings = $3, tags = $4, banner_image = $5, sort_order = $6, translation = $7, nutrition = $8, updated_at = $9
             WHERE id = $10`,
            [variation.name, variation.description || '', variation.servings || 4, JSON.stringify(variation.tags || []), variation.bannerImage || null, vIndex, variation.translation ? JSON.stringify(variation.translation) : null, variation.nutrition ? JSON.stringify(variation.nutrition) : null, now, variationId]
          );
          
          // Delete ingredients/steps in parallel
          await Promise.all([
            client.query('DELETE FROM ingredients WHERE variation_id = $1', [variationId]),
            client.query('DELETE FROM cooking_steps WHERE variation_id = $1', [variationId])
          ]);
        } else {
          // Create new variation
          variationId = uuidv4();
          await client.query(
            `INSERT INTO recipe_variations (id, recipe_id, name, description, servings, tags, banner_image, sort_order, translation, nutrition, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [variationId, id, variation.name, variation.description || '', variation.servings || 4, JSON.stringify(variation.tags || []), variation.bannerImage || null, vIndex, variation.translation ? JSON.stringify(variation.translation) : null, variation.nutrition ? JSON.stringify(variation.nutrition) : null, now, now]
          );
        }
        
        // Insert ingredients and steps in PARALLEL using Promise.all
        const ingredients = variation.ingredients || [];
        const stages = variation.stages || [];
        
        const ingredientPromises = ingredients
          .filter(ing => ing.name && ing.name.trim())
          .map((ing, i) => client.query(
            `INSERT INTO ingredients (id, recipe_id, variation_id, name, amount, unit, image, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [uuidv4(), id, variationId, ing.name, ing.amount || '', ing.unit || 'g', ing.image || null, i]
          ));
        
        const stepPromises = stages
          .filter(step => step.text && step.text.trim())
          .map((step, i) => client.query(
            `INSERT INTO cooking_steps (id, recipe_id, variation_id, step_text, image, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [uuidv4(), id, variationId, step.text, step.image || null, i]
          ));
        
        // Run all inserts in parallel
        await Promise.all([...ingredientPromises, ...stepPromises]);

        savedVariationIds.push(variationId);
      }
    }

    await client.query('COMMIT');
    res.json({
      id,
      updatedAt: now.toISOString(),
      variationIds: savedVariationIds,
      message: 'Recipe updated successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating recipe:', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  } finally {
    client.release();
  }
});

// Delete recipe
app.delete('/api/recipes/:id', requireAuth, requireRecipeOwner, async (req, res) => {
  try {
    const { id } = req.params;

    // Delete children explicitly (no FK cascade is defined in the schema)
    await pool.query('DELETE FROM ingredients WHERE recipe_id = $1', [id]);
    await pool.query('DELETE FROM cooking_steps WHERE recipe_id = $1', [id]);
    await pool.query('DELETE FROM recipe_variations WHERE recipe_id = $1', [id]);
    const result = await pool.query('DELETE FROM recipes WHERE id = $1', [id]);

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

// Add variation to recipe (copies from an existing variation)
app.post('/api/recipes/:id/variations', requireAuth, requireRecipeOwner, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { name, sourceVariationId } = req.body;
    
    // Check recipe exists
    const recipeResult = await client.query('SELECT * FROM recipes WHERE id = $1', [id]);
    if (recipeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    // Get the source variation to copy from
    const sourceResult = await client.query(
      'SELECT * FROM recipe_variations WHERE id = $1 AND recipe_id = $2',
      [sourceVariationId, id]
    );
    
    if (sourceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Source variation not found' });
    }
    
    const source = sourceResult.rows[0];
    const newVariationId = uuidv4();
    const now = new Date();
    
    // Get the next sort order
    const countResult = await client.query(
      'SELECT COUNT(*) FROM recipe_variations WHERE recipe_id = $1',
      [id]
    );
    const sortOrder = parseInt(countResult.rows[0].count);
    
    // Create the new variation
    await client.query(
      `INSERT INTO recipe_variations (id, recipe_id, name, description, servings, tags, banner_image, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [newVariationId, id, name, source.description, source.servings, source.tags, source.banner_image, sortOrder, now, now]
    );
    
    // Copy ingredients from source variation
    const ingredientsResult = await client.query(
      'SELECT * FROM ingredients WHERE variation_id = $1 ORDER BY sort_order',
      [sourceVariationId]
    );
    
    for (const ing of ingredientsResult.rows) {
      await client.query(
        `INSERT INTO ingredients (id, recipe_id, variation_id, name, amount, unit, image, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [uuidv4(), id, newVariationId, ing.name, ing.amount, ing.unit, ing.image, ing.sort_order]
      );
    }
    
    // Copy steps from source variation
    const stepsResult = await client.query(
      'SELECT * FROM cooking_steps WHERE variation_id = $1 ORDER BY sort_order',
      [sourceVariationId]
    );
    
    for (const step of stepsResult.rows) {
      await client.query(
        `INSERT INTO cooking_steps (id, recipe_id, variation_id, step_text, image, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), id, newVariationId, step.step_text, step.image, step.sort_order]
      );
    }
    
    // Update recipe's updated_at
    await client.query('UPDATE recipes SET updated_at = $1 WHERE id = $2', [now, id]);
    
    await client.query('COMMIT');
    res.status(201).json({ id: newVariationId, message: 'Variation added successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding variation:', error);
    res.status(500).json({ error: 'Failed to add variation' });
  } finally {
    client.release();
  }
});

// Returns the recipe's share id, creating one if needed (null if no recipe)
async function getOrCreateShareId(id) {
  const recipeResult = await pool.query('SELECT id, share_id FROM recipes WHERE id = $1', [id]);
  if (recipeResult.rows.length === 0) return null;
  let shareId = recipeResult.rows[0].share_id;
  if (!shareId) {
    // Generate a short, URL-friendly ID (8 characters)
    shareId = uuidv4().replace(/-/g, '').substring(0, 8);
    await pool.query('UPDATE recipes SET share_id = $1 WHERE id = $2', [shareId, id]);
  }
  return shareId;
}

// Generate or get share link for a recipe
app.post('/api/recipes/:id/share', requireAuth, requireRecipeOwner, async (req, res) => {
  try {
    const shareId = await getOrCreateShareId(req.params.id);
    if (!shareId) return res.status(404).json({ error: 'Recipe not found' });
    res.json({ shareId });
  } catch (error) {
    console.error('Error generating share link:', error);
    res.status(500).json({ error: 'Failed to generate share link' });
  }
});

// Admin: share link for any recipe (the admin tool's preview)
app.post('/api/admin/recipes/:id/share', async (req, res) => {
  try {
    const shareId = await getOrCreateShareId(req.params.id);
    if (!shareId) return res.status(404).json({ error: 'Recipe not found' });
    res.json({ shareId });
  } catch (error) {
    console.error('Error generating share link:', error);
    res.status(500).json({ error: 'Failed to generate share link' });
  }
});

// Admin: rename any recipe (inline edit in the admin tool)
app.post('/api/admin/recipes/:id/rename', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    const result = await pool.query(
      'UPDATE recipes SET name = $1, updated_at = $2 WHERE id = $3',
      [name.trim(), new Date(), req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Recipe not found' });
    res.json({ ok: true });
  } catch (error) {
    console.error('Error renaming recipe:', error);
    res.status(500).json({ error: 'Failed to rename recipe' });
  }
});

// Publish/unpublish a recipe (toggle visibility on discover page)
app.post('/api/recipes/:id/publish', requireAuth, requireRecipeOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const { published } = req.body;
    
    const result = await pool.query(
      'UPDATE recipes SET is_published = $1 WHERE id = $2 RETURNING is_published',
      [published, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    res.json({ isPublished: result.rows[0].is_published });
  } catch (error) {
    console.error('Error updating publish status:', error);
    res.status(500).json({ error: 'Failed to update publish status' });
  }
});

// Generate nutrition data for a variation using Claude Haiku
app.post('/api/recipes/:id/variations/:variationId/nutrition', requireAuth, requireRecipeOwner, async (req, res) => {
  try {
    if (!anthropic) {
      return res.status(503).json({ error: 'AI nutrition estimation is not configured (missing CHEFFINATOR_API)' });
    }

    const { id, variationId } = req.params;

    // Fetch the variation's ingredients and servings
    const variationResult = await pool.query(
      'SELECT servings FROM recipe_variations WHERE id = $1 AND recipe_id = $2',
      [variationId, id]
    );
    if (variationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Variation not found' });
    }
    const servingsCount = variationResult.rows[0].servings || 4;

    const ingredientsResult = await pool.query(
      'SELECT name, amount, unit FROM ingredients WHERE variation_id = $1 ORDER BY sort_order',
      [variationId]
    );

    const ingredients = ingredientsResult.rows.filter(i => i.name && i.name.trim());
    if (ingredients.length === 0) {
      return res.status(400).json({ error: 'No ingredients to analyze' });
    }

    const ingredientList = ingredients
      .map(i => `${i.amount || ''} ${i.unit || ''} ${i.name}`.trim())
      .join('\n');

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Estimate the nutritional values for this recipe (${servingsCount} servings total). Return values both PER 100g and PER SERVING.

Ingredients:
${ingredientList}

Return ONLY valid JSON, no other text:
{"per100g":{"calories":number,"protein":number,"carbs":number,"fat":number,"fiber":number,"sugar":number,"sodium":number},"perServing":{"calories":number,"protein":number,"carbs":number,"fat":number,"fiber":number,"sugar":number,"sodium":number}}

Use grams for protein/carbs/fat/fiber/sugar. Use mg for sodium. Round to whole numbers.`
      }]
    });

    let responseText = message.content[0].text.trim();
    // Strip markdown code fences if present
    responseText = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const nutrition = JSON.parse(responseText);

    // Validate the shape (new format with per100g and perServing)
    const requiredKeys = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'];
    const per100g = nutrition.per100g;
    const perServing = nutrition.perServing;
    if (!per100g || !perServing) {
      return res.status(500).json({ error: 'Invalid nutrition data from AI' });
    }
    for (const key of requiredKeys) {
      if (typeof per100g[key] !== 'number' || typeof perServing[key] !== 'number') {
        return res.status(500).json({ error: 'Invalid nutrition data from AI' });
      }
    }

    // Save to DB
    const nutritionData = { per100g, perServing, servings: servingsCount };
    await pool.query(
      'UPDATE recipe_variations SET nutrition = $1 WHERE id = $2',
      [JSON.stringify(nutritionData), variationId]
    );

    res.json(nutritionData);
  } catch (error) {
    console.error('Error generating nutrition:', error);
    res.status(500).json({ error: 'Failed to generate nutrition data' });
  }
});

// Get shared recipe by share ID (PUBLIC - no auth required)
app.get('/api/public/recipes/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;
    
    // Find recipe by share_id
    const recipeResult = await pool.query(
      'SELECT id, name, share_id, created_at, updated_at FROM recipes WHERE share_id = $1',
      [shareId]
    );
    
    if (recipeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    const recipe = recipeResult.rows[0];
    
    // Get all variations for this recipe
    const variationsResult = await pool.query(
      'SELECT * FROM recipe_variations WHERE recipe_id = $1 ORDER BY sort_order',
      [recipe.id]
    );
    
    const variations = [];
    
    for (const variation of variationsResult.rows) {
      // Get ingredients for this variation
      const ingredientsResult = await pool.query(
        'SELECT * FROM ingredients WHERE variation_id = $1 ORDER BY sort_order',
        [variation.id]
      );
      
      // Get cooking steps for this variation
      const stepsResult = await pool.query(
        'SELECT * FROM cooking_steps WHERE variation_id = $1 ORDER BY sort_order',
        [variation.id]
      );
      
      variations.push({
        id: variation.id,
        name: variation.name,
        description: variation.description,
        servings: variation.servings,
        tags: variation.tags ? JSON.parse(variation.tags) : [],
        bannerImage: variation.banner_image,
        translation: variation.translation ? JSON.parse(variation.translation) : null,
        nutrition: variation.nutrition ? JSON.parse(variation.nutrition) : null,
        ingredients: ingredientsResult.rows.map(ing => ({
          id: ing.id,
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
          image: ing.image
        })),
        stages: stepsResult.rows.map(step => ({
          id: step.id,
          text: step.step_text,
          image: step.image
        }))
      });
    }
    
    res.json({
      id: recipe.id,
      name: recipe.name,
      shareId: recipe.share_id,
      variations,
      createdAt: recipe.created_at,
      updatedAt: recipe.updated_at
    });
  } catch (error) {
    console.error('Error fetching shared recipe:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

// Get public profile - all recipes for a user (PUBLIC - no auth required)
app.get('/api/public/users/:userCode', async (req, res) => {
  try {
    const userCode = req.params.userCode.toLowerCase();
    
    // Check if this is a valid user (using users table)
    const userCheck = await pool.query(
      'SELECT code FROM users WHERE LOWER(code) = $1',
      [userCode]
    );
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get all recipes for this user with first variation in a single query
    const recipesResult = await pool.query(`
      SELECT r.id, r.name, r.updated_at,
             (SELECT banner_image FROM recipe_variations WHERE recipe_id = r.id ORDER BY sort_order LIMIT 1) as banner_image,
             (SELECT description FROM recipe_variations WHERE recipe_id = r.id ORDER BY sort_order LIMIT 1) as description,
             (SELECT tags FROM recipe_variations WHERE recipe_id = r.id ORDER BY sort_order LIMIT 1) as tags
      FROM recipes r
      WHERE LOWER(r.user_code) = $1
      ORDER BY r.updated_at DESC
    `, [userCode]);

    const recipes = recipesResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      bannerImage: row.banner_image || '',
      description: row.description || '',
      tags: safeParse(row.tags, []),
      updatedAt: row.updated_at
    }));

    res.json({
      userCode,
      recipeCount: recipes.length,
      recipes
    });
  } catch (error) {
    console.error('Error fetching public profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get random recipes for homepage discovery (PUBLIC - no auth required)
app.get('/api/public/discover', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const offset = parseInt(req.query.offset) || 0;

    // Get random PUBLISHED recipes with their first variation details
    const recipesResult = await pool.query(`
      SELECT r.id, r.name, r.share_id, r.updated_at,
             (SELECT banner_image FROM recipe_variations WHERE recipe_id = r.id ORDER BY sort_order LIMIT 1) as banner_image,
             (SELECT description FROM recipe_variations WHERE recipe_id = r.id ORDER BY sort_order LIMIT 1) as description,
             (SELECT tags FROM recipe_variations WHERE recipe_id = r.id ORDER BY sort_order LIMIT 1) as tags,
             r.user_code
      FROM recipes r
      WHERE r.is_published = TRUE
      ORDER BY RANDOM()
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const recipes = recipesResult.rows.map(recipe => ({
      id: recipe.id,
      name: recipe.name,
      shareId: recipe.share_id,
      bannerImage: recipe.banner_image,
      description: recipe.description || '',
      tags: safeParse(recipe.tags, []),
      userCode: recipe.user_code,
      updatedAt: recipe.updated_at
    }));

    res.json(recipes);
  } catch (error) {
    console.error('Error fetching discover recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Admin endpoint: Get ALL recipes from all users
app.get('/api/admin/recipes', async (req, res) => {
  try {
    const recipesResult = await pool.query(`
      SELECT r.id, r.name, r.user_code, r.share_id, r.updated_at,
             (SELECT banner_image FROM recipe_variations WHERE recipe_id = r.id ORDER BY sort_order LIMIT 1) as banner_image,
             (SELECT description FROM recipe_variations WHERE recipe_id = r.id ORDER BY sort_order LIMIT 1) as description,
             (SELECT tags FROM recipe_variations WHERE recipe_id = r.id ORDER BY sort_order LIMIT 1) as tags
      FROM recipes r
      ORDER BY r.updated_at DESC
    `);
    
    const recipes = recipesResult.rows.map(recipe => ({
      id: recipe.id,
      name: recipe.name,
      user_code: recipe.user_code,
      shareId: recipe.share_id,
      bannerImage: recipe.banner_image,
      description: recipe.description || '',
      tags: safeParse(recipe.tags, []),
      updated: timeAgo(recipe.updated_at)
    }));
    
    res.json(recipes);
  } catch (error) {
    console.error('Error fetching admin recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Admin endpoint: Get all users
// Optimized: uses single aggregation query instead of N+1 pattern
app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.code, u.created_at, COUNT(r.id) as recipe_count
      FROM users u
      LEFT JOIN recipes r ON LOWER(r.user_code) = LOWER(u.code)
      GROUP BY u.id, u.code, u.created_at
      ORDER BY u.created_at DESC
    `);

    const users = result.rows.map(user => ({
      id: user.id,
      code: user.code,
      recipeCount: parseInt(user.recipe_count),
      createdAt: user.created_at
    }));

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin endpoint: Create new user
app.post('/api/admin/users', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'User code is required' });
    }
    
    const normalizedCode = code.trim().toLowerCase();
    
    // Check if user already exists
    const existing = await pool.query(
      'SELECT code FROM users WHERE LOWER(code) = $1',
      [normalizedCode]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'User code already exists' });
    }
    
    const result = await pool.query(
      'INSERT INTO users (code) VALUES ($1) RETURNING id, code, created_at',
      [normalizedCode]
    );
    
    res.status(201).json({
      id: result.rows[0].id,
      code: result.rows[0].code,
      recipeCount: 0,
      createdAt: result.rows[0].created_at
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Admin endpoint: Update user (rename)
app.put('/api/admin/users/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { newCode } = req.body;
    
    if (!newCode || !newCode.trim()) {
      return res.status(400).json({ error: 'New user code is required' });
    }
    
    const oldCode = code.toLowerCase();
    const normalizedNewCode = newCode.trim().toLowerCase();
    
    // Check if old user exists
    const existing = await pool.query(
      'SELECT code FROM users WHERE LOWER(code) = $1',
      [oldCode]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if new code already exists (and it's not the same user)
    if (oldCode !== normalizedNewCode) {
      const newExists = await pool.query(
        'SELECT code FROM users WHERE LOWER(code) = $1',
        [normalizedNewCode]
      );
      
      if (newExists.rows.length > 0) {
        return res.status(409).json({ error: 'User code already exists' });
      }
    }
    
    // Update user code
    await pool.query(
      'UPDATE users SET code = $1 WHERE LOWER(code) = $2',
      [normalizedNewCode, oldCode]
    );
    
    // Update all recipes owned by this user
    await pool.query(
      'UPDATE recipes SET user_code = $1 WHERE LOWER(user_code) = $2',
      [normalizedNewCode, oldCode]
    );
    
    res.json({ 
      success: true, 
      oldCode: oldCode, 
      newCode: normalizedNewCode 
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Admin endpoint: Delete user
app.delete('/api/admin/users/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const normalizedCode = code.toLowerCase();
    
    // Check if user exists
    const existing = await pool.query(
      'SELECT code FROM users WHERE LOWER(code) = $1',
      [normalizedCode]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete user (recipes remain but user can't log in anymore)
    await pool.query(
      'DELETE FROM users WHERE LOWER(code) = $1',
      [normalizedCode]
    );
    
    res.json({ deleted: true, code: normalizedCode });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Upload image endpoint
app.post('/api/upload', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const originalSize = req.file.buffer.length;

    // Compress and optimize the image
    let optimizedBuffer;
    try {
      optimizedBuffer = await sharp(req.file.buffer)
        .resize(1600, 1600, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 80 })
        .toBuffer();
    } catch (sharpError) {
      console.error('Sharp processing error:', sharpError);
      // Fall back to original if sharp fails (e.g., unsupported format)
      optimizedBuffer = req.file.buffer;
    }

    const optimizedSize = optimizedBuffer.length;
    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
    console.log(`📸 Image optimized: ${(originalSize / 1024).toFixed(0)}KB → ${(optimizedSize / 1024).toFixed(0)}KB (${savings}% smaller)`);

    // Use Supabase Storage if available
    if (supabase) {
      const filename = `${uuidv4()}.webp`;

      const { data, error } = await supabase.storage
        .from('images')
        .upload(filename, optimizedBuffer, {
          contentType: 'image/webp',
          cacheControl: '31536000' // 1 year cache
        });

      if (error) {
        console.error('Supabase upload error:', error);
        return res.status(500).json({ error: 'Failed to upload to storage' });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filename);

      res.json({ url: urlData.publicUrl });
    } else {
      // Fallback to local storage (dev mode)
      const filename = `${uuidv4()}.webp`;
      const localPath = path.join(uploadsDir, filename);
      fs.writeFileSync(localPath, optimizedBuffer);
      res.json({ url: `/uploads/${filename}` });
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get custom tags
app.get('/api/tags', async (req, res) => {
  try {
    const result = await pool.query('SELECT name FROM custom_tags ORDER BY name');
    res.json(result.rows.map(row => row.name));
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Admin: Export entire database as JSON backup
app.get('/api/admin/backup', async (req, res) => {
  try {
    // Get all tables data
    const users = await pool.query('SELECT * FROM users ORDER BY id');
    const recipes = await pool.query('SELECT * FROM recipes ORDER BY id');
    const variations = await pool.query('SELECT * FROM recipe_variations ORDER BY recipe_id, sort_order');
    const ingredients = await pool.query('SELECT * FROM ingredients ORDER BY variation_id, sort_order');
    const steps = await pool.query('SELECT * FROM cooking_steps ORDER BY variation_id, sort_order');
    const tags = await pool.query('SELECT * FROM custom_tags ORDER BY id');
    
    const backup = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: {
        users: users.rows,
        recipes: recipes.rows,
        recipe_variations: variations.rows,
        ingredients: ingredients.rows,
        cooking_steps: steps.rows,
        custom_tags: tags.rows
      }
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=cheffinator-backup-${new Date().toISOString().split('T')[0]}.json`);
    res.json(backup);
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Admin: Import database from JSON backup
app.post('/api/admin/import', async (req, res) => {
  const client = await pool.connect();
  try {
    const { data, clearExisting } = req.body;
    
    if (!data) {
      return res.status(400).json({ error: 'No backup data provided' });
    }
    
    await client.query('BEGIN');
    
    // If clearExisting is true, delete all data first
    if (clearExisting) {
      await client.query('DELETE FROM cooking_steps');
      await client.query('DELETE FROM ingredients');
      await client.query('DELETE FROM recipe_variations');
      await client.query('DELETE FROM recipes');
      await client.query('DELETE FROM users');
      await client.query('DELETE FROM custom_tags');
    }
    
    let imported = { users: 0, recipes: 0, variations: 0, ingredients: 0, steps: 0, tags: 0 };
    
    // Import users
    if (data.users) {
      for (const user of data.users) {
        await client.query(
          'INSERT INTO users (id, code, created_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET code = $2',
          [user.id, user.code, user.created_at]
        );
        imported.users++;
      }
    }
    
    // Import custom tags
    if (data.custom_tags) {
      for (const tag of data.custom_tags) {
        await client.query(
          'INSERT INTO custom_tags (id, name, created_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = $2',
          [tag.id, tag.name, tag.created_at]
        );
        imported.tags++;
      }
    }
    
    // Import recipes
    if (data.recipes) {
      for (const recipe of data.recipes) {
        await client.query(
          `INSERT INTO recipes (id, name, description, servings, tags, banner_image, user_code, share_id, is_published, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
           ON CONFLICT (id) DO UPDATE SET name = $2, description = $3, servings = $4, tags = $5, banner_image = $6, user_code = $7, share_id = $8, is_published = $9, updated_at = $11`,
          [recipe.id, recipe.name, recipe.description, recipe.servings, recipe.tags, recipe.banner_image, recipe.user_code, recipe.share_id, recipe.is_published, recipe.created_at, recipe.updated_at]
        );
        imported.recipes++;
      }
    }
    
    // Import variations
    if (data.recipe_variations) {
      for (const v of data.recipe_variations) {
        await client.query(
          `INSERT INTO recipe_variations (id, recipe_id, name, description, servings, tags, banner_image, sort_order, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
           ON CONFLICT (id) DO UPDATE SET name = $3, description = $4, servings = $5, tags = $6, banner_image = $7, sort_order = $8, updated_at = $10`,
          [v.id, v.recipe_id, v.name, v.description, v.servings, v.tags, v.banner_image, v.sort_order, v.created_at, v.updated_at]
        );
        imported.variations++;
      }
    }
    
    // Import ingredients
    if (data.ingredients) {
      for (const ing of data.ingredients) {
        await client.query(
          `INSERT INTO ingredients (id, recipe_id, variation_id, name, amount, unit, image, sort_order) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
           ON CONFLICT (id) DO UPDATE SET name = $4, amount = $5, unit = $6, image = $7, sort_order = $8`,
          [ing.id, ing.recipe_id, ing.variation_id, ing.name, ing.amount, ing.unit, ing.image, ing.sort_order]
        );
        imported.ingredients++;
      }
    }
    
    // Import cooking steps
    if (data.cooking_steps) {
      for (const step of data.cooking_steps) {
        await client.query(
          `INSERT INTO cooking_steps (id, recipe_id, variation_id, step_text, image, sort_order) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           ON CONFLICT (id) DO UPDATE SET step_text = $4, image = $5, sort_order = $6`,
          [step.id, step.recipe_id, step.variation_id, step.step_text, step.image, step.sort_order]
        );
        imported.steps++;
      }
    }
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      message: 'Import completed successfully',
      imported 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing backup:', error);
    res.status(500).json({ error: 'Failed to import backup: ' + error.message });
  } finally {
    client.release();
  }
});

// Admin: Get all tags with full details
app.get('/api/admin/tags', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, created_at FROM custom_tags ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Admin: Add a new tag
app.post('/api/admin/tags', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const result = await pool.query(
      'INSERT INTO custom_tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id, name, created_at',
      [name.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Tag already exists' });
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// Admin: Update a tag
app.put('/api/admin/tags/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    // Get old tag name first
    const oldTag = await pool.query('SELECT name FROM custom_tags WHERE id = $1', [id]);
    if (oldTag.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    const oldName = oldTag.rows[0].name;
    const newName = name.trim();

    // Update the tag
    const result = await pool.query(
      'UPDATE custom_tags SET name = $1 WHERE id = $2 RETURNING id, name, created_at',
      [newName, id]
    );

    // Update all recipes/variations that use this tag
    // Tags are stored as JSON arrays, so we need to update them
    await pool.query(`
      UPDATE recipe_variations
      SET tags = REPLACE(tags, $1, $2)
      WHERE tags LIKE $3
    `, [JSON.stringify(oldName), JSON.stringify(newName), `%${oldName}%`]);

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Tag name already exists' });
    }
    console.error('Error updating tag:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

// Admin: Delete a tag
app.delete('/api/admin/tags/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get tag name first
    const tag = await pool.query('SELECT name FROM custom_tags WHERE id = $1', [id]);
    if (tag.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    await pool.query('DELETE FROM custom_tags WHERE id = $1', [id]);
    res.json({ deleted: true, name: tag.rows[0].name });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// Admin: Bulk delete recipes
app.post('/api/admin/recipes/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Recipe IDs array is required' });
    }

    const result = await pool.query(
      'DELETE FROM recipes WHERE id = ANY($1) RETURNING id',
      [ids]
    );

    res.json({ deleted: result.rowCount, ids: result.rows.map(r => r.id) });
  } catch (error) {
    console.error('Error bulk deleting recipes:', error);
    res.status(500).json({ error: 'Failed to delete recipes' });
  }
});

// Admin: Bulk transfer recipes to new user
app.post('/api/admin/recipes/bulk-transfer', async (req, res) => {
  try {
    const { ids, newUserCode } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Recipe IDs array is required' });
    }
    if (!newUserCode) {
      return res.status(400).json({ error: 'New user code is required' });
    }

    const result = await pool.query(
      'UPDATE recipes SET user_code = $1 WHERE id = ANY($2) RETURNING id',
      [newUserCode.toLowerCase(), ids]
    );

    res.json({ transferred: result.rowCount, ids: result.rows.map(r => r.id) });
  } catch (error) {
    console.error('Error bulk transferring recipes:', error);
    res.status(500).json({ error: 'Failed to transfer recipes' });
  }
});

// Admin: Get storage stats and list images
app.get('/api/admin/storage', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase storage not configured' });
    }

    // List all files in the images bucket
    const { data: rawFiles, error } = await supabase.storage
      .from('images')
      .list('', { limit: 1000 });

    if (error) {
      console.error('Supabase storage error:', error);
      return res.status(500).json({ error: 'Failed to list storage files', details: error });
    }

    // Filter out placeholder files but keep all real files
    const files = (rawFiles || []).filter(f => f.name && !f.name.startsWith('.'));

    // Calculate total size
    const totalSize = files.reduce((sum, f) => sum + (f.metadata?.size || 0), 0);

    // Get all image URLs used in recipes
    const usedImages = new Set();

    // Check recipe_variations for banner images
    const variations = await pool.query('SELECT banner_image FROM recipe_variations WHERE banner_image IS NOT NULL');
    variations.rows.forEach(r => {
      if (r.banner_image) usedImages.add(r.banner_image);
    });

    // Check ingredients for images
    const ingredients = await pool.query('SELECT image FROM ingredients WHERE image IS NOT NULL');
    ingredients.rows.forEach(r => {
      if (r.image) usedImages.add(r.image);
    });

    // Check cooking_steps for images
    const steps = await pool.query('SELECT image FROM cooking_steps WHERE image IS NOT NULL');
    steps.rows.forEach(r => {
      if (r.image) usedImages.add(r.image);
    });

    // Mark files as used or orphaned
    const filesWithStatus = files.map(f => {
      const publicUrl = supabase.storage.from('images').getPublicUrl(f.name).data.publicUrl;
      const isUsed = usedImages.has(publicUrl);
      return {
        name: f.name,
        size: f.metadata?.size || 0,
        created_at: f.created_at,
        url: publicUrl,
        isUsed
      };
    });

    const orphanedCount = filesWithStatus.filter(f => !f.isUsed).length;
    const orphanedSize = filesWithStatus.filter(f => !f.isUsed).reduce((sum, f) => sum + f.size, 0);

    res.json({
      totalFiles: files.length,
      totalSize,
      orphanedCount,
      orphanedSize,
      files: filesWithStatus
    });
  } catch (error) {
    console.error('Error fetching storage stats:', error);
    res.status(500).json({ error: 'Failed to fetch storage stats' });
  }
});

// Admin: Delete a storage file
app.delete('/api/admin/storage/:filename', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase storage not configured' });
    }

    const { filename } = req.params;

    const { error } = await supabase.storage
      .from('images')
      .remove([filename]);

    if (error) {
      console.error('Supabase delete error:', error);
      return res.status(500).json({ error: 'Failed to delete file' });
    }

    res.json({ deleted: true, filename });
  } catch (error) {
    console.error('Error deleting storage file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Admin: Bulk delete storage files
app.post('/api/admin/storage/bulk-delete', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase storage not configured' });
    }

    const { filenames } = req.body;
    if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
      return res.status(400).json({ error: 'Filenames array is required' });
    }

    const { error } = await supabase.storage
      .from('images')
      .remove(filenames);

    if (error) {
      console.error('Supabase bulk delete error:', error);
      return res.status(500).json({ error: 'Failed to delete files' });
    }

    res.json({ deleted: filenames.length, filenames });
  } catch (error) {
    console.error('Error bulk deleting storage files:', error);
    res.status(500).json({ error: 'Failed to delete files' });
  }
});

// Serve frontend in production
if (isProduction) {
  const frontendPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendPath));
  
  // Handle client-side routing - serve index.html for non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    } else {
      // Unknown API/uploads route: answer instead of hanging the request
      res.status(404).json({ error: 'Not found' });
    }
  });
}

// Initialize database and start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🍳 Cheffinator API running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
