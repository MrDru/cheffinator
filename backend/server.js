const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage });

// Default tags from spec
const DEFAULT_TAGS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Quick', 'Easy', 
  'Dessert', 'Breakfast', 'Lunch', 'Dinner', 'Snack',
  'Israeli', 'Italian', 'Asian', 'Mexican', 
  'Healthy', 'Comfort Food', 'Kid-Friendly', 'Spicy',
  'Soup', 'Salad', 'Pasta', 'Meat', 'Fish', 'Chicken',
  'Baking', 'Holiday', 'Shabbat', 'Passover'
];

// Approved user codes for alpha testing (case-insensitive)
const VALID_CODES = [
  'cheffinator',
  'mrdru3000',
  'dante',
  'jono',
  'tester4'
];

// PostgreSQL connection
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('Please add DATABASE_URL to your environment variables.');
  if (isProduction) {
    process.exit(1);
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/cheffinator',
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

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
        // Ignore errors
      }
    }
  }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' })); // Reduced from 50mb to prevent memory crashes
app.use('/uploads', express.static(uploadsDir));

// Validate user code
app.post('/api/auth/validate', (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ valid: false, error: 'Code is required' });
  }
  
  const normalizedCode = code.trim().toLowerCase();
  const isValid = VALID_CODES.some(c => c.toLowerCase() === normalizedCode);
  
  if (isValid) {
    res.json({ valid: true, code: normalizedCode });
  } else {
    res.status(401).json({ valid: false, error: 'Invalid access code' });
  }
});

// Get all recipes (filtered by user_code, case-insensitive)
app.get('/api/recipes', async (req, res) => {
  try {
    const userCode = (req.query.user || 'default').toLowerCase();
    const recipesResult = await pool.query(
      'SELECT * FROM recipes WHERE LOWER(user_code) = $1 ORDER BY updated_at DESC',
      [userCode]
    );
    
    const recipes = await Promise.all(recipesResult.rows.map(async (recipe) => {
      // Get all variations for this recipe
      const variationsResult = await pool.query(
        'SELECT * FROM recipe_variations WHERE recipe_id = $1 ORDER BY sort_order',
        [recipe.id]
      );
      
      const variations = await Promise.all(variationsResult.rows.map(async (variation) => {
        const ingredientsResult = await pool.query(
          'SELECT * FROM ingredients WHERE variation_id = $1 ORDER BY sort_order',
          [variation.id]
        );
        
        const stepsResult = await pool.query(
          'SELECT * FROM cooking_steps WHERE variation_id = $1 ORDER BY sort_order',
          [variation.id]
        );
        
        return {
          id: variation.id,
          name: variation.name,
          description: variation.description || '',
          servings: variation.servings,
          tags: variation.tags ? JSON.parse(variation.tags) : [],
          bannerImage: variation.banner_image,
          ingredients: ingredientsResult.rows.map(ing => ({
            id: ing.id,
            name: ing.name,
            amount: ing.amount || '',
            unit: ing.unit || 'g',
            image: ing.image
          })),
          stages: stepsResult.rows.map(step => ({
            id: step.id,
            text: step.step_text,
            image: step.image
          }))
        };
      }));
      
      // Use first variation's data for backward compatibility in list view
      const firstVariation = variations[0] || {};
      
      return {
        id: recipe.id,
        name: recipe.name,
        description: firstVariation.description || recipe.description || '',
        servings: firstVariation.servings || recipe.servings,
        tags: firstVariation.tags || (recipe.tags ? JSON.parse(recipe.tags) : []),
        bannerImage: firstVariation.bannerImage || recipe.banner_image,
        updated: timeAgo(recipe.updated_at),
        variations: variations,
        ingredients: firstVariation.ingredients || [],
        stages: firstVariation.stages || []
      };
    }));
    
    res.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Get single recipe
app.get('/api/recipes/:id', async (req, res) => {
  try {
    const recipeResult = await pool.query(
      'SELECT * FROM recipes WHERE id = $1',
      [req.params.id]
    );
    
    if (recipeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    const recipe = recipeResult.rows[0];
    
    // Get all variations
    const variationsResult = await pool.query(
      'SELECT * FROM recipe_variations WHERE recipe_id = $1 ORDER BY sort_order',
      [recipe.id]
    );
    
    const variations = await Promise.all(variationsResult.rows.map(async (variation) => {
      const ingredientsResult = await pool.query(
        'SELECT * FROM ingredients WHERE variation_id = $1 ORDER BY sort_order',
        [variation.id]
      );
      
      const stepsResult = await pool.query(
        'SELECT * FROM cooking_steps WHERE variation_id = $1 ORDER BY sort_order',
        [variation.id]
      );
      
      return {
        id: variation.id,
        name: variation.name,
        description: variation.description || '',
        servings: variation.servings,
        tags: variation.tags ? JSON.parse(variation.tags) : [],
        bannerImage: variation.banner_image,
        ingredients: ingredientsResult.rows.map(ing => ({
          id: ing.id,
          name: ing.name,
          amount: ing.amount || '',
          unit: ing.unit || 'g',
          image: ing.image
        })),
        stages: stepsResult.rows.map(step => ({
          id: step.id,
          text: step.step_text,
          image: step.image
        }))
      };
    }));
    
    const firstVariation = variations[0] || {};
    
    res.json({
      id: recipe.id,
      name: recipe.name,
      description: firstVariation.description || recipe.description || '',
      servings: firstVariation.servings || recipe.servings,
      tags: firstVariation.tags || (recipe.tags ? JSON.parse(recipe.tags) : []),
      bannerImage: firstVariation.bannerImage || recipe.banner_image,
      updated: timeAgo(recipe.updated_at),
      variations: variations,
      ingredients: firstVariation.ingredients || [],
      stages: firstVariation.stages || []
    });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

// Create recipe
app.post('/api/recipes', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { name, description, servings, tags, bannerImage, ingredients, stages, userCode } = req.body;
    const recipeId = uuidv4();
    const variationId = uuidv4();
    const now = new Date();
    const normalizedUserCode = (userCode || 'default').toLowerCase();
    
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
app.put('/api/recipes/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { name, variations, newUserCode } = req.body;
    const { id } = req.params;
    
    // Check if recipe exists
    const existing = await client.query('SELECT id FROM recipes WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    const now = new Date();
    
    // Update recipe name, timestamp, and optionally user_code (for admin transfers)
    if (newUserCode) {
      await client.query(
        `UPDATE recipes SET name = $1, user_code = $2, updated_at = $3 WHERE id = $4`,
        [name, newUserCode.toLowerCase(), now, id]
      );
    } else {
      await client.query(
        `UPDATE recipes SET name = $1, updated_at = $2 WHERE id = $3`,
        [name, now, id]
      );
    }
    
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
        
        // Save any custom tags (don't await - fire and forget)
        saveCustomTags(variation.tags);
        
        if (variationId && existingVarIds.includes(variationId)) {
          // Update existing variation
          await client.query(
            `UPDATE recipe_variations 
             SET name = $1, description = $2, servings = $3, tags = $4, banner_image = $5, sort_order = $6, updated_at = $7
             WHERE id = $8`,
            [variation.name, variation.description || '', variation.servings || 4, JSON.stringify(variation.tags || []), variation.bannerImage || null, vIndex, now, variationId]
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
            `INSERT INTO recipe_variations (id, recipe_id, name, description, servings, tags, banner_image, sort_order, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [variationId, id, variation.name, variation.description || '', variation.servings || 4, JSON.stringify(variation.tags || []), variation.bannerImage || null, vIndex, now, now]
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
      }
    }
    
    await client.query('COMMIT');
    res.json({ id, message: 'Recipe updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating recipe:', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  } finally {
    client.release();
  }
});

// Delete recipe
app.delete('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete recipe (cascade will handle ingredients and steps)
    await pool.query('DELETE FROM recipes WHERE id = $1', [id]);
    
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

// Add variation to recipe (copies from an existing variation)
app.post('/api/recipes/:id/variations', async (req, res) => {
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

// Generate or get share link for a recipe
app.post('/api/recipes/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if recipe exists
    const recipeResult = await pool.query('SELECT id, share_id FROM recipes WHERE id = $1', [id]);
    if (recipeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    let shareId = recipeResult.rows[0].share_id;
    
    // Generate share_id if it doesn't exist
    if (!shareId) {
      // Generate a short, URL-friendly ID (8 characters)
      shareId = uuidv4().replace(/-/g, '').substring(0, 8);
      await pool.query('UPDATE recipes SET share_id = $1 WHERE id = $2', [shareId, id]);
    }
    
    res.json({ shareId });
  } catch (error) {
    console.error('Error generating share link:', error);
    res.status(500).json({ error: 'Failed to generate share link' });
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
    
    // Check if this is a valid user
    const isValidUser = VALID_CODES.some(c => c.toLowerCase() === userCode);
    if (!isValidUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get all recipes for this user
    const recipesResult = await pool.query(
      'SELECT id, name, banner_image, updated_at FROM recipes WHERE LOWER(user_code) = $1 ORDER BY updated_at DESC',
      [userCode]
    );
    
    const recipes = await Promise.all(recipesResult.rows.map(async (recipe) => {
      // Get first variation for banner image and tags
      const variationResult = await pool.query(
        'SELECT banner_image, tags, description FROM recipe_variations WHERE recipe_id = $1 ORDER BY sort_order LIMIT 1',
        [recipe.id]
      );
      
      const firstVar = variationResult.rows[0] || {};
      
      return {
        id: recipe.id,
        name: recipe.name,
        bannerImage: firstVar.banner_image || recipe.banner_image,
        description: firstVar.description || '',
        tags: firstVar.tags ? JSON.parse(firstVar.tags) : [],
        updatedAt: recipe.updated_at
      };
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

// Admin endpoint: Get ALL recipes from all users
app.get('/api/admin/recipes', async (req, res) => {
  try {
    const recipesResult = await pool.query(`
      SELECT r.id, r.name, r.user_code, r.share_id, r.updated_at,
             rv.banner_image, rv.description, rv.tags
      FROM recipes r
      LEFT JOIN LATERAL (
        SELECT banner_image, description, tags 
        FROM recipe_variations 
        WHERE recipe_id = r.id 
        ORDER BY sort_order 
        LIMIT 1
      ) rv ON true
      ORDER BY r.updated_at DESC
    `);
    
    const recipes = recipesResult.rows.map(recipe => ({
      id: recipe.id,
      name: recipe.name,
      user_code: recipe.user_code,
      shareId: recipe.share_id,
      bannerImage: recipe.banner_image,
      description: recipe.description || '',
      tags: recipe.tags ? JSON.parse(recipe.tags) : [],
      updated: timeAgo(recipe.updated_at)
    }));
    
    res.json(recipes);
  } catch (error) {
    console.error('Error fetching admin recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Get random recipes from all users (PUBLIC - for homepage discovery)
app.get('/api/public/discover', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const offset = parseInt(req.query.offset) || 0;
    
    // Get random recipes with their first variation data (all recipes, not just shared)
    const recipesResult = await pool.query(`
      SELECT r.id, r.name, r.user_code, r.share_id, r.updated_at,
             rv.banner_image, rv.description, rv.tags
      FROM recipes r
      LEFT JOIN LATERAL (
        SELECT banner_image, description, tags 
        FROM recipe_variations 
        WHERE recipe_id = r.id 
        ORDER BY sort_order 
        LIMIT 1
      ) rv ON true
      ORDER BY RANDOM()
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    // Get total count of recipes
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM recipes'
    );
    
    // Generate share_id for recipes that don't have one
    const recipes = await Promise.all(recipesResult.rows.map(async (recipe) => {
      let shareId = recipe.share_id;
      
      // If no share_id, generate one
      if (!shareId) {
        shareId = Math.random().toString(36).substring(2, 10);
        await pool.query(
          'UPDATE recipes SET share_id = $1 WHERE id = $2',
          [shareId, recipe.id]
        );
      }
      
      return {
        id: recipe.id,
        name: recipe.name,
        userCode: recipe.user_code,
        shareId: shareId,
        bannerImage: recipe.banner_image,
        description: recipe.description || '',
        tags: recipe.tags ? JSON.parse(recipe.tags) : [],
        updatedAt: recipe.updated_at
      };
    }));
    
    res.json({
      recipes,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching discover recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Upload image endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
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

// Serve frontend in production
if (isProduction) {
  const frontendPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendPath));
  
  // Handle client-side routing - serve index.html for non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
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
