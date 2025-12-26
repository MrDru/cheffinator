const express = require('express');
const cors = require('cors');
const path = require('path');
const initSqlJs = require('sql.js');
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

// Database reference
let db;
const dbPath = path.join(__dirname, 'cheffinator.db');

// Initialize database
async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  
  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      servings INTEGER DEFAULT 4,
      tags TEXT,
      banner_image TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id TEXT PRIMARY KEY,
      recipe_id TEXT NOT NULL,
      name TEXT NOT NULL,
      amount TEXT,
      unit TEXT DEFAULT 'g',
      image TEXT,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS cooking_steps (
      id TEXT PRIMARY KEY,
      recipe_id TEXT NOT NULL,
      step_text TEXT NOT NULL,
      image TEXT,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS custom_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  saveDatabase();
  console.log('Database initialized');
}

// Save database to file
function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

// Helper to format time ago
function timeAgo(dateString) {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 172800) return 'Yesterday';
  return `${Math.floor(seconds / 86400)} days ago`;
}

// Helper to save custom tags
function saveCustomTags(tags) {
  if (!tags || !Array.isArray(tags)) return;
  
  tags.forEach(tag => {
    if (!DEFAULT_TAGS.includes(tag)) {
      try {
        db.run('INSERT OR IGNORE INTO custom_tags (name) VALUES (?)', [tag]);
      } catch (e) {
        // Ignore duplicates
      }
    }
  });
  saveDatabase();
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(uploadsDir));

// Get all recipes
app.get('/api/recipes', (req, res) => {
  try {
    const recipes = db.exec('SELECT * FROM recipes ORDER BY updated_at DESC');
    
    if (!recipes.length || !recipes[0].values.length) {
      return res.json([]);
    }
    
    const columns = recipes[0].columns;
    const result = recipes[0].values.map(row => {
      const recipe = {};
      columns.forEach((col, i) => recipe[col] = row[i]);
      
      // Get ingredients
      const ingredientsResult = db.exec(
        'SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY sort_order',
        [recipe.id]
      );
      
      let ingredients = [];
      if (ingredientsResult.length && ingredientsResult[0].values.length) {
        const ingCols = ingredientsResult[0].columns;
        ingredients = ingredientsResult[0].values.map(ingRow => {
          const ing = {};
          ingCols.forEach((col, i) => ing[col] = ingRow[i]);
          return {
            id: ing.id,
            name: ing.name,
            amount: ing.amount || '',
            unit: ing.unit || 'g',
            image: ing.image
          };
        });
      }
      
      // Get steps
      const stepsResult = db.exec(
        'SELECT * FROM cooking_steps WHERE recipe_id = ? ORDER BY sort_order',
        [recipe.id]
      );
      
      let stages = [];
      if (stepsResult.length && stepsResult[0].values.length) {
        const stepCols = stepsResult[0].columns;
        stages = stepsResult[0].values.map(stepRow => {
          const step = {};
          stepCols.forEach((col, i) => step[col] = stepRow[i]);
          return {
            id: step.id,
            text: step.step_text,
            image: step.image
          };
        });
      }
      
      return {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description || '',
        servings: recipe.servings,
        tags: recipe.tags ? JSON.parse(recipe.tags) : [],
        bannerImage: recipe.banner_image,
        updated: timeAgo(recipe.updated_at),
        ingredients,
        stages
      };
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Get single recipe
app.get('/api/recipes/:id', (req, res) => {
  try {
    const result = db.exec('SELECT * FROM recipes WHERE id = ?', [req.params.id]);
    
    if (!result.length || !result[0].values.length) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    const columns = result[0].columns;
    const row = result[0].values[0];
    const recipe = {};
    columns.forEach((col, i) => recipe[col] = row[i]);
    
    // Get ingredients
    const ingredientsResult = db.exec(
      'SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY sort_order',
      [recipe.id]
    );
    
    let ingredients = [];
    if (ingredientsResult.length && ingredientsResult[0].values.length) {
      const ingCols = ingredientsResult[0].columns;
      ingredients = ingredientsResult[0].values.map(ingRow => {
        const ing = {};
        ingCols.forEach((col, i) => ing[col] = ingRow[i]);
        return {
          id: ing.id,
          name: ing.name,
          amount: ing.amount || '',
          unit: ing.unit || 'g',
          image: ing.image
        };
      });
    }
    
    // Get steps
    const stepsResult = db.exec(
      'SELECT * FROM cooking_steps WHERE recipe_id = ? ORDER BY sort_order',
      [recipe.id]
    );
    
    let stages = [];
    if (stepsResult.length && stepsResult[0].values.length) {
      const stepCols = stepsResult[0].columns;
      stages = stepsResult[0].values.map(stepRow => {
        const step = {};
        stepCols.forEach((col, i) => step[col] = stepRow[i]);
        return {
          id: step.id,
          text: step.step_text,
          image: step.image
        };
      });
    }
    
    res.json({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description || '',
      servings: recipe.servings,
      tags: recipe.tags ? JSON.parse(recipe.tags) : [],
      bannerImage: recipe.banner_image,
      updated: timeAgo(recipe.updated_at),
      ingredients,
      stages
    });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

// Create recipe
app.post('/api/recipes', (req, res) => {
  try {
    const { name, description, servings, tags, bannerImage, ingredients, stages } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // Save any custom tags
    saveCustomTags(tags);
    
    db.run(
      `INSERT INTO recipes (id, name, description, servings, tags, banner_image, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description || '', servings || 4, JSON.stringify(tags || []), bannerImage || null, now, now]
    );
    
    // Insert ingredients
    if (ingredients && ingredients.length > 0) {
      ingredients.forEach((ing, index) => {
        if (ing.name && ing.name.trim()) {
          db.run(
            `INSERT INTO ingredients (id, recipe_id, name, amount, unit, image, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), id, ing.name, ing.amount || '', ing.unit || 'g', ing.image || null, index]
          );
        }
      });
    }
    
    // Insert cooking steps
    if (stages && stages.length > 0) {
      stages.forEach((step, index) => {
        if (step.text && step.text.trim()) {
          db.run(
            `INSERT INTO cooking_steps (id, recipe_id, step_text, image, sort_order)
             VALUES (?, ?, ?, ?, ?)`,
            [uuidv4(), id, step.text, step.image || null, index]
          );
        }
      });
    }
    
    saveDatabase();
    res.status(201).json({ id, message: 'Recipe created successfully' });
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

// Update recipe
app.put('/api/recipes/:id', (req, res) => {
  try {
    const { name, description, servings, tags, bannerImage, ingredients, stages } = req.body;
    const { id } = req.params;
    
    // Check if recipe exists
    const existing = db.exec('SELECT id FROM recipes WHERE id = ?', [id]);
    if (!existing.length || !existing[0].values.length) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    // Save any custom tags
    saveCustomTags(tags);
    
    const now = new Date().toISOString();
    
    // Update recipe
    db.run(
      `UPDATE recipes 
       SET name = ?, description = ?, servings = ?, tags = ?, banner_image = ?, updated_at = ?
       WHERE id = ?`,
      [name, description || '', servings || 4, JSON.stringify(tags || []), bannerImage || null, now, id]
    );
    
    // Delete existing ingredients and steps
    db.run('DELETE FROM ingredients WHERE recipe_id = ?', [id]);
    db.run('DELETE FROM cooking_steps WHERE recipe_id = ?', [id]);
    
    // Insert new ingredients
    if (ingredients && ingredients.length > 0) {
      ingredients.forEach((ing, index) => {
        if (ing.name && ing.name.trim()) {
          db.run(
            `INSERT INTO ingredients (id, recipe_id, name, amount, unit, image, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), id, ing.name, ing.amount || '', ing.unit || 'g', ing.image || null, index]
          );
        }
      });
    }
    
    // Insert new cooking steps
    if (stages && stages.length > 0) {
      stages.forEach((step, index) => {
        if (step.text && step.text.trim()) {
          db.run(
            `INSERT INTO cooking_steps (id, recipe_id, step_text, image, sort_order)
             VALUES (?, ?, ?, ?, ?)`,
            [uuidv4(), id, step.text, step.image || null, index]
          );
        }
      });
    }
    
    saveDatabase();
    res.json({ id, message: 'Recipe updated successfully' });
  } catch (error) {
    console.error('Error updating recipe:', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

// Delete recipe
app.delete('/api/recipes/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    db.run('DELETE FROM ingredients WHERE recipe_id = ?', [id]);
    db.run('DELETE FROM cooking_steps WHERE recipe_id = ?', [id]);
    db.run('DELETE FROM recipes WHERE id = ?', [id]);
    
    saveDatabase();
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

// Duplicate recipe
app.post('/api/recipes/:id/duplicate', (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const result = db.exec('SELECT * FROM recipes WHERE id = ?', [id]);
    if (!result.length || !result[0].values.length) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    const columns = result[0].columns;
    const row = result[0].values[0];
    const original = {};
    columns.forEach((col, i) => original[col] = row[i]);
    
    const newId = uuidv4();
    const now = new Date().toISOString();
    
    db.run(
      `INSERT INTO recipes (id, name, description, servings, tags, banner_image, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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
    const ingredientsResult = db.exec(
      'SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY sort_order',
      [id]
    );
    
    if (ingredientsResult.length && ingredientsResult[0].values.length) {
      const ingCols = ingredientsResult[0].columns;
      ingredientsResult[0].values.forEach(ingRow => {
        const ing = {};
        ingCols.forEach((col, i) => ing[col] = ingRow[i]);
        db.run(
          `INSERT INTO ingredients (id, recipe_id, name, amount, unit, image, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), newId, ing.name, ing.amount, ing.unit, ing.image, ing.sort_order]
        );
      });
    }
    
    // Copy steps
    const stepsResult = db.exec(
      'SELECT * FROM cooking_steps WHERE recipe_id = ? ORDER BY sort_order',
      [id]
    );
    
    if (stepsResult.length && stepsResult[0].values.length) {
      const stepCols = stepsResult[0].columns;
      stepsResult[0].values.forEach(stepRow => {
        const step = {};
        stepCols.forEach((col, i) => step[col] = stepRow[i]);
        db.run(
          `INSERT INTO cooking_steps (id, recipe_id, step_text, image, sort_order)
           VALUES (?, ?, ?, ?, ?)`,
          [uuidv4(), newId, step.step_text, step.image, step.sort_order]
        );
      });
    }
    
    saveDatabase();
    res.status(201).json({ id: newId, message: 'Recipe duplicated successfully' });
  } catch (error) {
    console.error('Error duplicating recipe:', error);
    res.status(500).json({ error: 'Failed to duplicate recipe' });
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
app.get('/api/tags', (req, res) => {
  try {
    const result = db.exec('SELECT name FROM custom_tags ORDER BY name');
    if (!result.length || !result[0].values.length) {
      return res.json([]);
    }
    res.json(result[0].values.map(row => row[0]));
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
