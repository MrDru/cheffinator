// In production, API is served from the same origin
// In development, Vite proxies /api to localhost:3001
const API_BASE = '/api';

// Get user code from localStorage
export function getUserCode() {
  return localStorage.getItem('cheffinator_user_code');
}

// Set user code in localStorage
export function setUserCode(code) {
  localStorage.setItem('cheffinator_user_code', code);
}

// Clear user code (logout)
export function clearUserCode() {
  localStorage.removeItem('cheffinator_user_code');
}

// Validate user code with the server
export async function validateCode(code) {
  const response = await fetch(`${API_BASE}/auth/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Invalid code');
  }
  return data;
}

export async function fetchRecipes(userCode) {
  const code = userCode || getUserCode() || 'default';
  const response = await fetch(`${API_BASE}/recipes?user=${encodeURIComponent(code)}`);
  if (!response.ok) throw new Error('Failed to fetch recipes');
  return response.json();
}

export async function fetchRecipe(id) {
  const response = await fetch(`${API_BASE}/recipes/${id}`);
  if (!response.ok) throw new Error('Failed to fetch recipe');
  return response.json();
}

export async function createRecipe(recipe, userCode) {
  const code = userCode || getUserCode() || 'default';
  const response = await fetch(`${API_BASE}/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...recipe, userCode: code })
  });
  if (!response.ok) throw new Error('Failed to create recipe');
  return response.json();
}

export async function updateRecipe(id, recipe) {
  const response = await fetch(`${API_BASE}/recipes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipe)
  });
  if (!response.ok) throw new Error('Failed to update recipe');
  return response.json();
}

export async function deleteRecipe(id) {
  const response = await fetch(`${API_BASE}/recipes/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete recipe');
  return response.json();
}

export async function addVariation(recipeId, name, sourceVariationId) {
  const response = await fetch(`${API_BASE}/recipes/${recipeId}/variations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, sourceVariationId })
  });
  if (!response.ok) throw new Error('Failed to add variation');
  return response.json();
}

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  });
  if (!response.ok) throw new Error('Failed to upload image');
  return response.json();
}

export async function fetchCustomTags() {
  const response = await fetch(`${API_BASE}/tags`);
  if (!response.ok) throw new Error('Failed to fetch tags');
  return response.json();
}

// Generate or get share link for a recipe
export async function generateShareLink(recipeId) {
  const response = await fetch(`${API_BASE}/recipes/${recipeId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error('Failed to generate share link');
  return response.json();
}

// Fetch a shared recipe by share ID (public, no auth)
export async function fetchSharedRecipe(shareId) {
  const response = await fetch(`${API_BASE}/public/recipes/${shareId}`);
  if (!response.ok) throw new Error('Recipe not found');
  return response.json();
}

// Fetch public profile - all recipes for a user (public, no auth)
export async function fetchPublicProfile(userCode) {
  const response = await fetch(`${API_BASE}/public/users/${encodeURIComponent(userCode)}`);
  if (!response.ok) throw new Error('User not found');
  return response.json();
}

