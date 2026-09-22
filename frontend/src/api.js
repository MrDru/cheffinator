// In production, API is served from the same origin
// In development, Vite proxies /api to localhost:3001
const API_BASE = '/api';

// Get user code from localStorage
export function getUserCode() {
  return localStorage.getItem('cheffinator_user_code');
}

// --- Session token ---
export function getToken() {
  return localStorage.getItem('cheffinator_token');
}
export function setToken(token) {
  localStorage.setItem('cheffinator_token', token);
}
export function clearToken() {
  localStorage.removeItem('cheffinator_token');
}

// Fetch with the session token attached. A 401 means the session is gone:
// clear credentials and send the user back to the login screen.
async function authFetch(url, options = {}) {
  const token = getToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  if (response.status === 401) {
    clearToken();
    clearUserCode();
    window.location.reload();
    throw new Error('Session expired');
  }
  return response;
}

// Set user code in localStorage
export function setUserCode(code) {
  localStorage.setItem('cheffinator_user_code', code);
}

// Clear user code (logout)
export function clearUserCode() {
  localStorage.removeItem('cheffinator_user_code');
}

// Get last used username (remembered even after logout)
export function getRememberedUsername() {
  return localStorage.getItem('cheffinator_remembered_user') || '';
}

// Save last used username
export function setRememberedUsername(username) {
  localStorage.setItem('cheffinator_remembered_user', username);
}

// Validate user code with the server; stores the returned session token
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
  if (data.token) setToken(data.token);
  return data;
}

// Invalidate the session server-side and clear local credentials
export async function logout() {
  try {
    await authFetch(`${API_BASE}/auth/logout`, { method: 'POST' });
  } catch (e) { /* logging out always succeeds locally */ }
  clearToken();
  clearUserCode();
}

export async function fetchRecipes(userCode, options = {}) {
  const code = userCode || getUserCode() || 'default';
  const { limit = 50, offset = 0 } = options;
  const params = new URLSearchParams({
    user: code,
    limit: String(limit),
    offset: String(offset)
  });
  const response = await authFetch(`${API_BASE}/recipes?${params}`);
  if (!response.ok) throw new Error('Failed to fetch recipes');
  return response.json();
}

// Fetch lightweight recipe summaries for dashboard (10x smaller payload)
export async function fetchRecipesSummary(userCode, options = {}) {
  const code = userCode || getUserCode() || 'default';
  const { limit = 50, offset = 0 } = options;
  const params = new URLSearchParams({
    user: code,
    limit: String(limit),
    offset: String(offset)
  });
  const response = await authFetch(`${API_BASE}/recipes/summary?${params}`);
  if (!response.ok) throw new Error('Failed to fetch recipe summaries');
  return response.json();
}

export async function fetchRecipe(id) {
  const response = await fetch(`${API_BASE}/recipes/${id}`);
  if (!response.ok) throw new Error('Failed to fetch recipe');
  return response.json();
}

export async function createRecipe(recipe, userCode) {
  const code = userCode || getUserCode() || 'default';
  const response = await authFetch(`${API_BASE}/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...recipe, userCode: code })
  });
  if (!response.ok) throw new Error('Failed to create recipe');
  return response.json();
}

export async function updateRecipe(id, recipe) {
  const response = await authFetch(`${API_BASE}/recipes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipe)
  });
  if (!response.ok) {
    const err = new Error('Failed to update recipe');
    err.status = response.status;
    throw err;
  }
  return response.json();
}

export async function deleteRecipe(id) {
  const response = await authFetch(`${API_BASE}/recipes/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete recipe');
  return response.json();
}

export async function addVariation(recipeId, name, sourceVariationId) {
  const response = await authFetch(`${API_BASE}/recipes/${recipeId}/variations`, {
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
  const response = await authFetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  });
  if (!response.ok) throw new Error('Failed to upload image');
  return response.json();
}

// Check if string is a base64 image
export function isBase64Image(str) {
  return str && typeof str === 'string' && str.startsWith('data:image/');
}

// Upload base64 image and return URL
export async function uploadBase64Image(base64String) {
  // Convert base64 to Blob
  const response = await fetch(base64String);
  const blob = await response.blob();
  
  // Create a File from the Blob
  const extension = base64String.includes('image/gif') ? 'gif' : 
                    base64String.includes('image/png') ? 'png' : 'jpg';
  const file = new File([blob], `image.${extension}`, { type: blob.type });
  
  // Upload and return URL
  const result = await uploadImage(file);
  return result.url;
}

export async function fetchCustomTags() {
  const response = await fetch(`${API_BASE}/tags`);
  if (!response.ok) throw new Error('Failed to fetch tags');
  return response.json();
}

// Generate or get share link for a recipe
export async function generateShareLink(recipeId) {
  const response = await authFetch(`${API_BASE}/recipes/${recipeId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error('Failed to generate share link');
  return response.json();
}

// Publish or unpublish a recipe (toggle visibility on discover page)
export async function publishRecipe(recipeId, published) {
  const response = await authFetch(`${API_BASE}/recipes/${recipeId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ published })
  });
  if (!response.ok) throw new Error('Failed to update publish status');
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

// Generate nutrition data for a variation using AI
export async function generateNutrition(recipeId, variationId) {
  const response = await authFetch(`${API_BASE}/recipes/${recipeId}/variations/${variationId}/nutrition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to generate nutrition');
  }
  return response.json();
}

// Fetch random recipes for homepage discovery
export async function fetchDiscoverRecipes(limit = 5, offset = 0) {
  const response = await fetch(`${API_BASE}/public/discover?limit=${limit}&offset=${offset}`);
  if (!response.ok) throw new Error('Failed to fetch recipes');
  return response.json();
}
