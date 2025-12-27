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
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id TEXT PRIMARY KEY,
        recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        amount TEXT,
        unit TEXT DEFAULT 'g',
        image TEXT,
        sort_order INTEGER DEFAULT 0
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS cooking_steps (
        id TEXT PRIMARY KEY,
        recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
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
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(uploadsDir));

// Get all recipes
app.get('/api/recipes', async (req, res) => {
  try {
    const recipesResult = await pool.query(
      'SELECT * FROM recipes ORDER BY updated_at DESC'
    );
    
    const recipes = await Promise.all(recipesResult.rows.map(async (recipe) => {
      const ingredientsResult = await pool.query(
        'SELECT * FROM ingredients WHERE recipe_id = $1 ORDER BY sort_order',
        [recipe.id]
      );
      
      const stepsResult = await pool.query(
        'SELECT * FROM cooking_steps WHERE recipe_id = $1 ORDER BY sort_order',
        [recipe.id]
      );
      
      return {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description || '',
        servings: recipe.servings,
        tags: recipe.tags ? JSON.parse(recipe.tags) : [],
        bannerImage: recipe.banner_image,
        updated: timeAgo(recipe.updated_at),
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
    
    const ingredientsResult = await pool.query(
      'SELECT * FROM ingredients WHERE recipe_id = $1 ORDER BY sort_order',
      [recipe.id]
    );
    
    const stepsResult = await pool.query(
      'SELECT * FROM cooking_steps WHERE recipe_id = $1 ORDER BY sort_order',
      [recipe.id]
    );
    
    res.json({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description || '',
      servings: recipe.servings,
      tags: recipe.tags ? JSON.parse(recipe.tags) : [],
      bannerImage: recipe.banner_image,
      updated: timeAgo(recipe.updated_at),
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
    
    const { name, description, servings, tags, bannerImage, ingredients, stages } = req.body;
    const id = uuidv4();
    const now = new Date();
    
    // Save any custom tags
    await saveCustomTags(tags);
    
    await client.query(
      `INSERT INTO recipes (id, name, description, servings, tags, banner_image, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, name, description || '', servings || 4, JSON.stringify(tags || []), bannerImage || null, now, now]
    );
    
    // Insert ingredients
    if (ingredients && ingredients.length > 0) {
      for (let i = 0; i < ingredients.length; i++) {
        const ing = ingredients[i];
        if (ing.name && ing.name.trim()) {
          await client.query(
            `INSERT INTO ingredients (id, recipe_id, name, amount, unit, image, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [uuidv4(), id, ing.name, ing.amount || '', ing.unit || 'g', ing.image || null, i]
          );
        }
      }
    }
    
    // Insert cooking steps
    if (stages && stages.length > 0) {
      for (let i = 0; i < stages.length; i++) {
        const step = stages[i];
        if (step.text && step.text.trim()) {
          await client.query(
            `INSERT INTO cooking_steps (id, recipe_id, step_text, image, sort_order)
             VALUES ($1, $2, $3, $4, $5)`,
            [uuidv4(), id, step.text, step.image || null, i]
          );
        }
      }
    }
    
    await client.query('COMMIT');
    res.status(201).json({ id, message: 'Recipe created successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating recipe:', error);
    res.status(500).json({ error: 'Failed to create recipe' });
  } finally {
    client.release();
  }
});

// Update recipe
app.put('/api/recipes/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { name, description, servings, tags, bannerImage, ingredients, stages } = req.body;
    const { id } = req.params;
    
    // Check if recipe exists
    const existing = await client.query('SELECT id FROM recipes WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    // Save any custom tags
    await saveCustomTags(tags);
    
    const now = new Date();
    
    // Update recipe
    await client.query(
      `UPDATE recipes 
       SET name = $1, description = $2, servings = $3, tags = $4, banner_image = $5, updated_at = $6
       WHERE id = $7`,
      [name, description || '', servings || 4, JSON.stringify(tags || []), bannerImage || null, now, id]
    );
    
    // Delete existing ingredients and steps
    await client.query('DELETE FROM ingredients WHERE recipe_id = $1', [id]);
    await client.query('DELETE FROM cooking_steps WHERE recipe_id = $1', [id]);
    
    // Insert new ingredients
    if (ingredients && ingredients.length > 0) {
      for (let i = 0; i < ingredients.length; i++) {
        const ing = ingredients[i];
        if (ing.name && ing.name.trim()) {
          await client.query(
            `INSERT INTO ingredients (id, recipe_id, name, amount, unit, image, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [uuidv4(), id, ing.name, ing.amount || '', ing.unit || 'g', ing.image || null, i]
          );
        }
      }
    }
    
    // Insert new cooking steps
    if (stages && stages.length > 0) {
      for (let i = 0; i < stages.length; i++) {
        const step = stages[i];
        if (step.text && step.text.trim()) {
          await client.query(
            `INSERT INTO cooking_steps (id, recipe_id, step_text, image, sort_order)
             VALUES ($1, $2, $3, $4, $5)`,
            [uuidv4(), id, step.text, step.image || null, i]
          );
        }
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

// Duplicate recipe
app.post('/api/recipes/:id/duplicate', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { name, description } = req.body;
    
    const originalResult = await client.query('SELECT * FROM recipes WHERE id = $1', [id]);
    if (originalResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    const original = originalResult.rows[0];
    const newId = uuidv4();
    const now = new Date();
    
    await client.query(
      `INSERT INTO recipes (id, name, description, servings, tags, banner_image, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        newId,
        name || `${original.name} (copy)`,
        description !== undefined ? description : original.description,
        original.servings,
        original.tags,
        original.banner_image,
        now,
        now
      ]
    );
    
    // Copy ingredients
    const ingredientsResult = await client.query(
      'SELECT * FROM ingredients WHERE recipe_id = $1 ORDER BY sort_order',
      [id]
    );
    
    for (const ing of ingredientsResult.rows) {
      await client.query(
        `INSERT INTO ingredients (id, recipe_id, name, amount, unit, image, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [uuidv4(), newId, ing.name, ing.amount, ing.unit, ing.image, ing.sort_order]
      );
    }
    
    // Copy steps
    const stepsResult = await client.query(
      'SELECT * FROM cooking_steps WHERE recipe_id = $1 ORDER BY sort_order',
      [id]
    );
    
    for (const step of stepsResult.rows) {
      await client.query(
        `INSERT INTO cooking_steps (id, recipe_id, step_text, image, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), newId, step.step_text, step.image, step.sort_order]
      );
    }
    
    await client.query('COMMIT');
    res.status(201).json({ id: newId, message: 'Recipe duplicated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error duplicating recipe:', error);
    res.status(500).json({ error: 'Failed to duplicate recipe' });
  } finally {
    client.release();
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
