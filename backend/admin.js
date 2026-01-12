#!/usr/bin/env node
const { Pool } = require('pg');
const readline = require('readline');

// Connect to Render PostgreSQL - set DATABASE_URL environment variable
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.log('❌ DATABASE_URL not set!');
  console.log('Set it in the .bat file or as an environment variable.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (q) => new Promise(resolve => rl.question(q, resolve));

async function listRecipes() {
  const result = await pool.query(`
    SELECT r.id, r.name, r.user_code, r.share_id, r.updated_at
    FROM recipes r
    ORDER BY r.user_code, r.updated_at DESC
  `);
  
  console.log('\n📋 ALL RECIPES:\n');
  console.log('─'.repeat(80));
  
  let currentUser = null;
  for (const r of result.rows) {
    if (r.user_code !== currentUser) {
      currentUser = r.user_code;
      console.log(`\n👤 ${currentUser.toUpperCase()}`);
    }
    const date = new Date(r.updated_at).toLocaleDateString();
    console.log(`   [${r.id.slice(0,8)}] ${r.name} (${date})`);
  }
  console.log('\n');
}

async function transferRecipe() {
  await listRecipes();
  
  const recipeId = await ask('Enter recipe ID (first 8 chars or full): ');
  
  // Find recipe
  const result = await pool.query(
    'SELECT id, name, user_code FROM recipes WHERE id LIKE $1',
    [recipeId + '%']
  );
  
  if (result.rows.length === 0) {
    console.log('❌ Recipe not found');
    return;
  }
  
  const recipe = result.rows[0];
  console.log(`\n📖 Found: "${recipe.name}" (owner: ${recipe.user_code})`);
  
  const newOwner = await ask('Transfer to which user? ');
  
  const confirm = await ask(`Transfer "${recipe.name}" from ${recipe.user_code} to ${newOwner}? (y/n) `);
  
  if (confirm.toLowerCase() === 'y') {
    await pool.query(
      'UPDATE recipes SET user_code = $1 WHERE id = $2',
      [newOwner.toLowerCase(), recipe.id]
    );
    console.log('✅ Recipe transferred!');
  } else {
    console.log('Cancelled.');
  }
}

async function deleteRecipe() {
  await listRecipes();
  
  const recipeId = await ask('Enter recipe ID to DELETE (first 8 chars or full): ');
  
  const result = await pool.query(
    'SELECT id, name, user_code FROM recipes WHERE id LIKE $1',
    [recipeId + '%']
  );
  
  if (result.rows.length === 0) {
    console.log('❌ Recipe not found');
    return;
  }
  
  const recipe = result.rows[0];
  console.log(`\n⚠️  About to DELETE: "${recipe.name}" (owner: ${recipe.user_code})`);
  
  const confirm = await ask('Are you SURE? Type recipe name to confirm: ');
  
  if (confirm === recipe.name) {
    await pool.query('DELETE FROM recipes WHERE id = $1', [recipe.id]);
    console.log('🗑️  Recipe deleted!');
  } else {
    console.log('Cancelled - name did not match.');
  }
}

async function listUsers() {
  const result = await pool.query(`
    SELECT user_code, COUNT(*) as count 
    FROM recipes 
    GROUP BY user_code 
    ORDER BY count DESC
  `);
  
  console.log('\n👥 USERS:\n');
  for (const row of result.rows) {
    console.log(`   ${row.user_code}: ${row.count} recipes`);
  }
  console.log('\n');
}

async function renameRecipe() {
  await listRecipes();
  
  const recipeId = await ask('Enter recipe ID (first 8 chars or full): ');
  
  const result = await pool.query(
    'SELECT id, name FROM recipes WHERE id LIKE $1',
    [recipeId + '%']
  );
  
  if (result.rows.length === 0) {
    console.log('❌ Recipe not found');
    return;
  }
  
  const recipe = result.rows[0];
  console.log(`\n📖 Current name: "${recipe.name}"`);
  
  const newName = await ask('New name: ');
  
  if (newName.trim()) {
    await pool.query(
      'UPDATE recipes SET name = $1, updated_at = NOW() WHERE id = $2',
      [newName.trim(), recipe.id]
    );
    console.log('✅ Recipe renamed!');
  }
}

async function duplicateRecipe() {
  await listRecipes();
  
  const recipeId = await ask('Enter recipe ID to DUPLICATE (first 8 chars or full): ');
  
  const result = await pool.query(
    'SELECT * FROM recipes WHERE id LIKE $1',
    [recipeId + '%']
  );
  
  if (result.rows.length === 0) {
    console.log('❌ Recipe not found');
    return;
  }
  
  const recipe = result.rows[0];
  console.log(`\n📖 Found: "${recipe.name}" (owner: ${recipe.user_code})`);
  
  const targetUser = await ask('Duplicate to which user? ');
  const newName = await ask(`New name (or press Enter for "${recipe.name} (Copy)"): `);
  
  const finalName = newName.trim() || `${recipe.name} (Copy)`;
  
  const confirm = await ask(`Create "${finalName}" for ${targetUser}? (y/n) `);
  
  if (confirm.toLowerCase() === 'y') {
    const { v4: uuidv4 } = require('uuid');
    const newRecipeId = uuidv4();
    const now = new Date();
    
    // Create new recipe
    await pool.query(
      `INSERT INTO recipes (id, name, user_code, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [newRecipeId, finalName, targetUser.toLowerCase(), now, now]
    );
    
    // Copy variations
    const variations = await pool.query(
      'SELECT * FROM recipe_variations WHERE recipe_id = $1 ORDER BY sort_order',
      [recipe.id]
    );
    
    for (const v of variations.rows) {
      const newVarId = uuidv4();
      
      await pool.query(
        `INSERT INTO recipe_variations (id, recipe_id, name, description, servings, tags, banner_image, sort_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [newVarId, newRecipeId, v.name, v.description, v.servings, v.tags, v.banner_image, v.sort_order, now, now]
      );
      
      // Copy ingredients
      const ingredients = await pool.query(
        'SELECT * FROM ingredients WHERE variation_id = $1',
        [v.id]
      );
      
      for (const ing of ingredients.rows) {
        await pool.query(
          `INSERT INTO ingredients (id, recipe_id, variation_id, name, amount, unit, image, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [uuidv4(), newRecipeId, newVarId, ing.name, ing.amount, ing.unit, ing.image, ing.sort_order]
        );
      }
      
      // Copy steps
      const steps = await pool.query(
        'SELECT * FROM cooking_steps WHERE variation_id = $1',
        [v.id]
      );
      
      for (const step of steps.rows) {
        await pool.query(
          `INSERT INTO cooking_steps (id, recipe_id, variation_id, step_text, image, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [uuidv4(), newRecipeId, newVarId, step.step_text, step.image, step.sort_order]
        );
      }
    }
    
    console.log('✅ Recipe duplicated!');
  } else {
    console.log('Cancelled.');
  }
}

async function main() {
  console.log('\n🍳 CHEFFINATOR ADMIN\n');
  
  try {
    await pool.query('SELECT 1'); // Test connection
    console.log('✅ Connected to database\n');
  } catch (e) {
    console.log('❌ Failed to connect. Check DATABASE_URL');
    console.log(e.message);
    process.exit(1);
  }
  
  while (true) {
    console.log('─'.repeat(40));
    console.log('1. List all recipes');
    console.log('2. Transfer recipe to another user');
    console.log('3. Delete a recipe');
    console.log('4. Rename a recipe');
    console.log('5. Duplicate recipe to user');
    console.log('6. List users');
    console.log('0. Exit');
    console.log('─'.repeat(40));
    
    const choice = await ask('\nChoice: ');
    
    switch (choice) {
      case '1': await listRecipes(); break;
      case '2': await transferRecipe(); break;
      case '3': await deleteRecipe(); break;
      case '4': await renameRecipe(); break;
      case '5': await duplicateRecipe(); break;
      case '6': await listUsers(); break;
      case '0': 
        console.log('Bye! 👋');
        rl.close();
        await pool.end();
        process.exit(0);
      default:
        console.log('Invalid choice');
    }
  }
}

main().catch(console.error);
