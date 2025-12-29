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

