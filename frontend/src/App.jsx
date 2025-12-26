import React, { useState, useEffect, useCallback } from 'react';
import * as api from './api';

const UNITS = ['g', 'kg', 'ml', 'L', 'cup', 'tbsp', 'tsp', 'oz', 'lb', 'piece', 'pinch', 'to taste'];
const DEFAULT_TAGS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Quick', 'Easy', 
  'Dessert', 'Breakfast', 'Lunch', 'Dinner', 'Snack',
  'Israeli', 'Italian', 'Asian', 'Mexican', 
  'Healthy', 'Comfort Food', 'Kid-Friendly', 'Spicy',
  'Soup', 'Salad', 'Pasta', 'Meat', 'Fish', 'Chicken',
  'Baking', 'Holiday', 'Shabbat', 'Passover'
];

const Icon = ({ type }) => {
  const icons = {
    plus: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    trash: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/></svg>,
    back: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>,
    edit: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    play: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>,
    close: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    camera: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    chevronRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9,18 15,12 9,6"/></svg>,
    x: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    copy: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
    search: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    chef: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6V13.87Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>,
  };
  return icons[type] || null;
};

const styles = {
  page: { 
    minHeight: '100vh', 
    background: 'var(--bg-primary)', 
    color: 'var(--text-primary)', 
    fontFamily: 'var(--font-display)' 
  },
  header: { 
    padding: '20px 24px', 
    borderBottom: '1px solid var(--border-color)', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  main: { 
    maxWidth: 800, 
    margin: '0 auto', 
    padding: '40px 24px' 
  },
  btn: { 
    padding: '10px 16px', 
    background: 'transparent', 
    border: '1px solid var(--border-color)', 
    borderRadius: 8, 
    color: 'var(--text-secondary)', 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    gap: 6, 
    fontFamily: 'var(--font-sans)', 
    fontSize: 14,
    transition: 'all 0.2s ease'
  },
  btnPrimary: { 
    padding: '10px 20px', 
    background: 'linear-gradient(135deg, var(--accent-green-dark), var(--accent-green))', 
    border: 'none', 
    borderRadius: 8, 
    color: 'var(--bg-primary)', 
    fontWeight: 600, 
    cursor: 'pointer', 
    fontFamily: 'var(--font-sans)', 
    fontSize: 14,
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 15px rgba(74, 222, 128, 0.2)'
  },
  card: { 
    padding: '18px 20px', 
    background: 'var(--bg-secondary)', 
    borderRadius: 12, 
    marginBottom: 10, 
    cursor: 'pointer', 
    border: '1px solid var(--border-color)', 
    display: 'flex', 
    gap: 16, 
    alignItems: 'center',
    transition: 'all 0.2s ease'
  },
  tag: { 
    display: 'inline-block', 
    padding: '4px 10px', 
    background: 'rgba(74,222,128,0.15)', 
    borderRadius: 20, 
    fontSize: 12, 
    color: 'var(--accent-green)', 
    marginRight: 6, 
    fontFamily: 'var(--font-sans)' 
  },
  input: { 
    width: '100%', 
    background: 'transparent', 
    border: 'none', 
    outline: 'none', 
    color: 'var(--text-primary)', 
    fontFamily: 'var(--font-display)' 
  },
  surface: { 
    background: 'var(--bg-secondary)', 
    borderRadius: 12, 
    border: '1px solid var(--border-color)', 
    padding: '14px 16px' 
  },
};

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [recipeName, setRecipeName] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState('4');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [ingredients, setIngredients] = useState([{ id: 1, name: '', amount: '', unit: 'g', image: null }]);
  const [stages, setStages] = useState([{ id: 1, text: '', image: null }]);
  const [bannerImage, setBannerImage] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [cookingSlide, setCookingSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModal, setDeleteModal] = useState(null);
  const [duplicateModal, setDuplicateModal] = useState(null);
  const [dupName, setDupName] = useState('');
  const [dupDesc, setDupDesc] = useState('');
  const [customTags, setCustomTags] = useState([]);

  const filteredIngredients = ingredients.filter(i => i.name.trim());
  const filteredStages = stages.filter(s => s.text.trim());
  const totalSlides = 2 + filteredStages.length;
  
  // Combine default tags with custom tags from database
  const allAvailableTags = [...new Set([...DEFAULT_TAGS, ...customTags])];
  const suggestions = tagInput ? allAvailableTags.filter(t => t.toLowerCase().startsWith(tagInput.toLowerCase()) && !tags.includes(t)) : [];

  // Load recipes and custom tags on mount
  useEffect(() => {
    loadRecipes();
    loadCustomTags();
  }, []);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const data = await api.fetchRecipes();
      setRecipes(data);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomTags = async () => {
    try {
      const data = await api.fetchCustomTags();
      setCustomTags(data);
    } catch (error) {
      console.error('Failed to load custom tags:', error);
    }
  };

  // Keyboard navigation for cooking mode
  useEffect(() => {
    if (currentView !== 'cooking') return;
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { 
        e.preventDefault(); 
        setCookingSlide(s => Math.min(totalSlides - 1, s + 1)); 
      }
      if (e.key === 'ArrowLeft') { 
        e.preventDefault(); 
        setCookingSlide(s => Math.max(0, s - 1)); 
      }
      if (e.key === 'Escape') setCurrentView('view');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentView, totalSlides]);

  const resetForm = () => {
    setRecipeName(''); 
    setDescription(''); 
    setServings('4'); 
    setTags([]); 
    setTagInput('');
    setIngredients([{ id: 1, name: '', amount: '', unit: 'g', image: null }]);
    setStages([{ id: 1, text: '', image: null }]);
    setBannerImage(null); 
    setEditingId(null);
  };

  const openNew = () => { 
    resetForm(); 
    setCurrentView('edit'); 
  };

  const openExisting = (r) => {
    setEditingId(r.id); 
    setRecipeName(r.name); 
    setDescription(r.description || '');
    setServings(String(r.servings || 4)); 
    setTags(r.tags || []);
    setIngredients(r.ingredients?.length ? r.ingredients.map((ing, i) => ({ ...ing, id: ing.id || i + 1 })) : [{ id: 1, name: '', amount: '', unit: 'g', image: null }]);
    setStages(r.stages?.length ? r.stages.map((st, i) => ({ ...st, id: st.id || i + 1 })) : [{ id: 1, text: '', image: null }]);
    setBannerImage(r.bannerImage || null); 
    setCurrentView('view');
  };

  const saveRecipe = async () => {
    if (!recipeName.trim()) { 
      setSaveMessage('Please enter a name'); 
      setTimeout(() => setSaveMessage(''), 2000); 
      return; 
    }
    
    const data = { 
      name: recipeName.trim(), 
      description: description.trim(), 
      servings: parseInt(servings) || 4, 
      tags, 
      ingredients: filteredIngredients, 
      stages: filteredStages, 
      bannerImage 
    };
    
    try {
      if (editingId) {
        await api.updateRecipe(editingId, data);
      } else {
        const result = await api.createRecipe(data);
        setEditingId(result.id);
      }
      await loadRecipes();
      await loadCustomTags(); // Reload tags in case new custom tags were added
      setSaveMessage('Saved!'); 
      setTimeout(() => { 
        setSaveMessage(''); 
        setCurrentView('view'); 
      }, 800);
    } catch (error) {
      console.error('Failed to save recipe:', error);
      setSaveMessage('Error saving');
      setTimeout(() => setSaveMessage(''), 2000);
    }
  };

  const addTag = (t) => { 
    if (t.trim() && !tags.includes(t.trim())) setTags([...tags, t.trim()]); 
    setTagInput(''); 
    setShowSuggestions(false); 
  };
  
  const removeTag = (t) => setTags(tags.filter(x => x !== t));

  const handleDuplicate = (r) => {
    setDupName(`${r.name} (copy)`);
    setDupDesc(r.description || '');
    setDuplicateModal(r);
  };

  const confirmDuplicate = async () => {
    if (!duplicateModal) return;
    try {
      await api.duplicateRecipe(duplicateModal.id, dupName.trim() || `${duplicateModal.name} (copy)`, dupDesc.trim());
      await loadRecipes();
      setDuplicateModal(null);
      setDupName('');
      setDupDesc('');
    } catch (error) {
      console.error('Failed to duplicate recipe:', error);
    }
  };

  const handleDelete = (r) => {
    setDeleteModal(r);
  };

  const confirmDelete = async () => {
    if (deleteModal) {
      try {
        await api.deleteRecipe(deleteModal.id);
        await loadRecipes();
        setDeleteModal(null);
      } catch (error) {
        console.error('Failed to delete recipe:', error);
      }
    }
  };

  const handleImageUpload = async (file, callback) => {
    try {
      // Upload to server for better performance
      const result = await api.uploadImage(file);
      callback(result.url);
    } catch (error) {
      console.error('Failed to upload image:', error);
      // Fallback to base64 if upload fails
      const reader = new FileReader();
      reader.onload = (ev) => callback(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const filteredRecipes = recipes.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.tags?.some(t => t.toLowerCase().includes(q));
  });

  // DASHBOARD VIEW
  if (currentView === 'dashboard') {
    return (
      <div style={styles.page}>
        <header style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              width: 44, 
              height: 44, 
              borderRadius: 12, 
              background: 'linear-gradient(135deg, var(--accent-green-dark), var(--accent-green))', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: 22,
              boxShadow: '0 4px 15px rgba(74, 222, 128, 0.3)'
            }}>🍳</div>
            <h1 style={{ fontSize: 26, fontWeight: 600, margin: 0, letterSpacing: '-0.5px' }}>Cheffinator</h1>
          </div>
        </header>
        
        <main style={styles.main}>
          <button 
            onClick={openNew} 
            style={{ 
              ...styles.btnPrimary, 
              width: '100%', 
              padding: 26, 
              fontSize: 18, 
              marginBottom: 48, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: 14,
              borderRadius: 16
            }}
          >
            <Icon type="plus" /> Create New Recipe
          </button>
          
          <h2 style={{ 
            fontSize: 12, 
            fontWeight: 600, 
            color: 'var(--text-secondary)', 
            textTransform: 'uppercase', 
            letterSpacing: 2, 
            marginBottom: 16, 
            fontFamily: 'var(--font-sans)' 
          }}>
            Your Recipes
          </h2>
          
          <div style={{ 
            ...styles.surface, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12, 
            marginBottom: 20, 
            padding: '12px 16px' 
          }}>
            <Icon type="search" />
            <input 
              style={{ ...styles.input, fontSize: 15, fontFamily: 'var(--font-sans)' }} 
              placeholder="Search recipes by name or tag..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
            />
            {searchQuery && (
              <button 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }} 
                onClick={() => setSearchQuery('')}
              >
                <Icon type="x" />
              </button>
            )}
          </div>
          
          {loading ? (
            <div style={{ ...styles.surface, textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>🍳</div>
              Loading recipes...
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div style={{ ...styles.surface, textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📖</div>
              {recipes.length === 0 ? "No recipes yet. Create your first one!" : "No recipes match your search."}
            </div>
          ) : (
            filteredRecipes.map(r => (
              <div 
                key={r.id} 
                style={styles.card} 
                onClick={() => openExisting(r)}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-green)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                <div style={{ 
                  width: 60, 
                  height: 60, 
                  borderRadius: 12, 
                  background: r.bannerImage ? `url(${r.bannerImage}) center/cover` : 'var(--bg-tertiary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: 26, 
                  flexShrink: 0 
                }}>
                  {!r.bannerImage && '🍽️'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.name}
                  </div>
                  <div>
                    {r.tags?.map(t => <span key={t} style={styles.tag}>{t}</span>)}
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>{r.updated}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button 
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', opacity: 0.6, cursor: 'pointer', padding: 8, borderRadius: 6 }} 
                    onClick={(e) => { e.stopPropagation(); handleDuplicate(r); }}
                    title="Duplicate"
                  >
                    <Icon type="copy" />
                  </button>
                  <button 
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', opacity: 0.6, cursor: 'pointer', padding: 8, borderRadius: 6 }} 
                    onClick={(e) => { e.stopPropagation(); handleDelete(r); }}
                    title="Delete"
                  >
                    <Icon type="trash" />
                  </button>
                </div>
              </div>
            ))
          )}
          
          <div style={{ ...styles.surface, marginTop: 40, textAlign: 'center', padding: 28 }}>
            <div style={{ fontSize: 32, fontWeight: 600, color: 'var(--accent-green)' }}>
              {searchQuery ? `${filteredRecipes.length} / ${recipes.length}` : recipes.length}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
              {searchQuery ? 'Matching Recipes' : 'Total Recipes'}
            </div>
          </div>
        </main>

        {/* Delete Modal */}
        {deleteModal && (
          <div 
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} 
            onClick={() => setDeleteModal(null)}
          >
            <div 
              style={{ background: 'var(--bg-secondary)', borderRadius: 20, padding: 32, maxWidth: 400, width: '90%', border: '1px solid var(--border-color)' }} 
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 600 }}>Delete Recipe?</h3>
              <p style={{ margin: '0 0 28px', color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6 }}>
                Are you sure you want to delete "<strong style={{ color: 'var(--text-primary)' }}>{deleteModal.name}</strong>"? This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button style={styles.btn} onClick={() => setDeleteModal(null)}>Cancel</button>
                <button style={{ ...styles.btnPrimary, background: 'var(--accent-red)' }} onClick={confirmDelete}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Modal */}
        {duplicateModal && (
          <div 
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} 
            onClick={() => setDuplicateModal(null)}
          >
            <div 
              style={{ background: 'var(--bg-secondary)', borderRadius: 20, padding: 32, maxWidth: 480, width: '90%', border: '1px solid var(--border-color)' }} 
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 28px', fontSize: 22, fontWeight: 600 }}>Duplicate Recipe</h3>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontFamily: 'var(--font-sans)' }}>
                  Recipe Name
                </label>
                <input 
                  style={{ 
                    background: 'var(--bg-secondary)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 12, 
                    width: '100%', 
                    fontSize: 16, 
                    padding: '14px 18px', 
                    boxSizing: 'border-box', 
                    color: 'var(--text-primary)', 
                    outline: 'none', 
                    fontFamily: 'var(--font-display)' 
                  }} 
                  value={dupName} 
                  onChange={e => setDupName(e.target.value)} 
                  placeholder="Enter recipe name..."
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontFamily: 'var(--font-sans)' }}>
                  Description (optional)
                </label>
                <textarea 
                  style={{ 
                    background: 'var(--bg-secondary)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 12, 
                    width: '100%', 
                    fontSize: 15, 
                    padding: '14px 18px', 
                    boxSizing: 'border-box', 
                    color: 'var(--text-primary)', 
                    outline: 'none', 
                    fontFamily: 'var(--font-display)', 
                    resize: 'none', 
                    minHeight: 90, 
                    lineHeight: 1.5 
                  }} 
                  value={dupDesc} 
                  onChange={e => setDupDesc(e.target.value)} 
                  placeholder="A short description..."
                />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button style={styles.btn} onClick={() => setDuplicateModal(null)}>Cancel</button>
                <button style={styles.btnPrimary} onClick={confirmDuplicate}>Create Duplicate</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // COOKING MODE
  if (currentView === 'cooking') {
    return (
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'linear-gradient(180deg, #0A0A0A 0%, #111111 100%)', 
        color: 'var(--text-primary)', 
        fontFamily: 'var(--font-display)', 
        display: 'flex', 
        flexDirection: 'column', 
        zIndex: 1000 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: 'rgba(0,0,0,0.5)' }}>
          <span style={{ fontSize: 14, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>{cookingSlide + 1} / {totalSlides}</span>
          <button 
            onClick={() => setCurrentView('view')} 
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}
          >
            <Icon type="close" />
          </button>
        </div>
        
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 80px', overflow: 'auto' }}>
          {cookingSlide === 0 && (
            <div style={{ textAlign: 'center', maxWidth: 800 }}>
              {bannerImage && (
                <div style={{ 
                  width: 220, 
                  height: 220, 
                  borderRadius: '50%', 
                  background: `url(${bannerImage}) center/cover`, 
                  margin: '0 auto 48px',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                }} />
              )}
              <h1 style={{ fontSize: 'clamp(40px, 8vw, 80px)', fontWeight: 600, margin: '0 0 24px', letterSpacing: '-1px' }}>{recipeName}</h1>
              {description && <p style={{ fontSize: 'clamp(18px, 3vw, 26px)', color: 'var(--text-secondary)', margin: '0 0 48px', lineHeight: 1.5 }}>{description}</p>}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 40, fontSize: 'clamp(16px, 2.5vw, 20px)', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
                <span><strong style={{ color: 'var(--accent-green)' }}>{servings}</strong> servings</span>
                <span><strong style={{ color: 'var(--accent-green)' }}>{filteredIngredients.length}</strong> ingredients</span>
                <span><strong style={{ color: 'var(--accent-green)' }}>{filteredStages.length}</strong> steps</span>
              </div>
            </div>
          )}
          
          {cookingSlide === 1 && (
            <div style={{ maxWidth: 900, width: '100%', padding: '0 20px' }}>
              <h2 style={{ 
                fontSize: 'clamp(14px, 2vw, 18px)', 
                fontWeight: 600, 
                color: 'var(--accent-green)', 
                textTransform: 'uppercase', 
                letterSpacing: 4, 
                marginBottom: 50, 
                textAlign: 'center', 
                fontFamily: 'var(--font-sans)' 
              }}>
                Ingredients
              </h2>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: `repeat(auto-fit, minmax(${filteredIngredients.some(i => i.image) ? '200px' : '280px'}, 1fr))`,
                gap: 20,
                justifyContent: 'center'
              }}>
                {filteredIngredients.map((ing) => (
                  <div key={ing.id} style={{ 
                    background: 'linear-gradient(145deg, var(--bg-secondary) 0%, #141414 100%)',
                    borderRadius: 16,
                    padding: ing.image ? 0 : '24px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {ing.image && (
                      <div style={{ 
                        width: '100%', 
                        aspectRatio: '4/3',
                        background: `url(${ing.image}) center/cover`,
                        borderBottom: '1px solid var(--border-color)'
                      }} />
                    )}
                    <div style={{ padding: ing.image ? '16px 20px 20px' : '0', textAlign: 'center' }}>
                      <div style={{ 
                        fontSize: 'clamp(16px, 2.5vw, 22px)', 
                        fontWeight: 500,
                        marginBottom: 8,
                        color: 'var(--text-primary)'
                      }}>{ing.name}</div>
                      <div style={{ 
                        fontSize: 'clamp(14px, 2vw, 18px)',
                        color: 'var(--accent-green)',
                        fontFamily: 'var(--font-sans)',
                        fontWeight: 600,
                        background: 'rgba(74,222,128,0.1)',
                        padding: '8px 16px',
                        borderRadius: 8,
                        display: 'inline-block'
                      }}>{ing.amount} {ing.unit}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {cookingSlide >= 2 && filteredStages[cookingSlide - 2] && (
            <div style={{ maxWidth: 800, textAlign: 'center' }}>
              <div style={{ 
                width: 'clamp(70px, 12vw, 110px)', 
                height: 'clamp(70px, 12vw, 110px)', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, var(--accent-green-dark), var(--accent-green))', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#0A0A0A', 
                fontSize: 'clamp(28px, 5vw, 48px)', 
                fontWeight: 700, 
                marginBottom: 48, 
                fontFamily: 'var(--font-sans)',
                boxShadow: '0 15px 50px rgba(74, 222, 128, 0.3)'
              }}>
                {cookingSlide - 1}
              </div>
              <p style={{ fontSize: 'clamp(24px, 5vw, 40px)', lineHeight: 1.6, margin: 0, color: '#EEE' }}>
                {filteredStages[cookingSlide - 2].text}
              </p>
              {filteredStages[cookingSlide - 2].image && (
                <img 
                  src={filteredStages[cookingSlide - 2].image} 
                  alt="" 
                  style={{ marginTop: 48, maxWidth: '100%', maxHeight: '40vh', borderRadius: 20, objectFit: 'contain', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} 
                />
              )}
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 40px', background: 'rgba(0,0,0,0.5)' }}>
          <button 
            onClick={() => setCookingSlide(Math.max(0, cookingSlide - 1))} 
            disabled={cookingSlide === 0} 
            style={{ ...styles.btn, padding: '16px 28px', opacity: cookingSlide === 0 ? 0.3 : 1 }}
          >
            <Icon type="back" /> Previous
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button 
                key={i} 
                onClick={() => setCookingSlide(i)} 
                style={{ 
                  width: i === cookingSlide ? 28 : 10, 
                  height: 10, 
                  borderRadius: 5, 
                  background: i === cookingSlide ? 'var(--accent-green)' : '#333', 
                  border: 'none', 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }} 
              />
            ))}
          </div>
          <button 
            onClick={() => setCookingSlide(Math.min(totalSlides - 1, cookingSlide + 1))} 
            disabled={cookingSlide === totalSlides - 1} 
            style={{ ...styles.btnPrimary, padding: '16px 28px', opacity: cookingSlide === totalSlides - 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            Next <Icon type="chevronRight" />
          </button>
        </div>
      </div>
    );
  }

  // VIEW MODE
  if (currentView === 'view') {
    return (
      <div style={styles.page}>
        <header style={{ 
          ...styles.header, 
          position: 'sticky', 
          top: 0, 
          background: 'rgba(13,13,13,0.95)', 
          backdropFilter: 'blur(12px)', 
          zIndex: 100 
        }}>
          <button style={styles.btn} onClick={() => { resetForm(); setCurrentView('dashboard'); }}>
            <Icon type="back" /> Back
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            {(filteredIngredients.length > 0 || filteredStages.length > 0) && (
              <button 
                style={{ ...styles.btn, color: 'var(--accent-green)', borderColor: 'var(--accent-green)' }} 
                onClick={() => { setCookingSlide(0); setCurrentView('cooking'); }}
              >
                <Icon type="play" /> Cook
              </button>
            )}
            <button style={{ ...styles.btnPrimary, display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setCurrentView('edit')}>
              <Icon type="edit" /> Edit
            </button>
          </div>
        </header>
        
        <main style={{ maxWidth: 680, margin: '0 auto', padding: '0 24px 80px' }}>
          <div style={{ 
            width: 'calc(100% + 48px)', 
            marginLeft: -24, 
            height: bannerImage ? 300 : 200, 
            background: bannerImage 
              ? `linear-gradient(to top, rgba(13,13,13,1) 0%, rgba(13,13,13,0.4) 50%, rgba(13,13,13,0.1) 100%), url(${bannerImage}) center/cover` 
              : 'linear-gradient(to bottom, var(--bg-secondary) 0%, var(--bg-primary) 100%)', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'flex-end', 
            padding: '48px 24px 36px' 
          }}>
            <h1 style={{ fontSize: 40, fontWeight: 600, margin: 0, marginBottom: description ? 14 : 0, letterSpacing: '-0.5px' }}>
              {recipeName || 'Untitled'}
            </h1>
            {description && <p style={{ fontSize: 17, color: '#999', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{description}</p>}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '28px 0 36px', borderBottom: '1px solid var(--bg-secondary)', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
              <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{servings}</span> servings
            </span>
            {tags.map(t => (
              <span key={t} style={{ padding: '7px 16px', background: 'rgba(74,222,128,0.1)', borderRadius: 20, fontSize: 13, color: 'var(--accent-green)', fontFamily: 'var(--font-sans)' }}>
                {t}
              </span>
            ))}
          </div>
          
          {filteredIngredients.length > 0 && (
            <section style={{ padding: '36px 0', borderBottom: '1px solid var(--bg-secondary)' }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 24, fontFamily: 'var(--font-sans)' }}>
                Ingredients
              </h2>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {filteredIngredients.map((ing, i) => (
                  <li key={ing.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '16px 0', 
                    borderBottom: i < filteredIngredients.length - 1 ? '1px solid var(--bg-secondary)' : 'none', 
                    gap: 16 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {ing.image && <img src={ing.image} alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover' }} />}
                      <span style={{ fontSize: 17 }}>{ing.name}</span>
                    </div>
                    <span style={{ fontSize: 15, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
                      {ing.amount} {ing.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          
          {filteredStages.length > 0 && (
            <section style={{ paddingTop: 36 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 28, fontFamily: 'var(--font-sans)' }}>
                Instructions
              </h2>
              <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {filteredStages.map((stage, i) => (
                  <li key={stage.id} style={{ marginBottom: 32 }}>
                    <div style={{ display: 'flex', gap: 20 }}>
                      <div style={{ 
                        width: 36, 
                        height: 36, 
                        borderRadius: '50%', 
                        background: 'var(--bg-secondary)', 
                        border: '2px solid #333', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: 'var(--accent-green)', 
                        fontSize: 15, 
                        fontWeight: 600, 
                        fontFamily: 'var(--font-sans)', 
                        flexShrink: 0 
                      }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 17, lineHeight: 1.8, color: '#CCC' }}>{stage.text}</p>
                        {stage.image && (
                          <img 
                            src={stage.image} 
                            alt="" 
                            style={{ marginTop: 18, maxWidth: '100%', borderRadius: 14, maxHeight: 320, objectFit: 'cover' }} 
                          />
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
          
          {filteredIngredients.length === 0 && filteredStages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '70px 20px', color: '#555' }}>
              <div style={{ fontSize: 48, marginBottom: 20 }}>📝</div>
              <p style={{ margin: '0 0 20px' }}>This recipe is empty</p>
              <button 
                style={{ ...styles.btnPrimary, display: 'inline-flex', alignItems: 'center', gap: 8 }} 
                onClick={() => setCurrentView('edit')}
              >
                <Icon type="edit" /> Add content
              </button>
            </div>
          )}
        </main>
      </div>
    );
  }

  // EDIT MODE
  return (
    <div style={styles.page}>
      <header style={{ 
        ...styles.header, 
        position: 'sticky', 
        top: 0, 
        background: 'rgba(13,13,13,0.95)', 
        backdropFilter: 'blur(12px)', 
        zIndex: 100 
      }}>
        <button 
          style={styles.btn} 
          onClick={() => editingId ? setCurrentView('view') : (resetForm(), setCurrentView('dashboard'))}
        >
          <Icon type="back" /> {editingId ? 'Cancel' : 'Back'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saveMessage && (
            <span style={{ 
              padding: '8px 16px', 
              background: saveMessage.includes('Please') ? 'rgba(239,68,68,0.2)' : 'rgba(74,222,128,0.2)', 
              borderRadius: 8, 
              fontSize: 13, 
              color: saveMessage.includes('Please') ? 'var(--accent-red)' : 'var(--accent-green)', 
              fontFamily: 'var(--font-sans)' 
            }}>
              {saveMessage}
            </span>
          )}
          <button style={styles.btnPrimary} onClick={saveRecipe}>
            {editingId ? 'Save Changes' : 'Save Recipe'}
          </button>
        </div>
      </header>
      
      <main style={{ ...styles.main, maxWidth: 680 }}>
        {/* Banner Image Section */}
        <div style={{ 
          position: 'relative', 
          minHeight: 220, 
          background: bannerImage 
            ? `linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%), url(${bannerImage}) center/cover` 
            : 'var(--bg-secondary)', 
          borderRadius: 20, 
          marginBottom: 28, 
          border: bannerImage ? 'none' : '1px dashed #333', 
          overflow: 'hidden' 
        }}>
          <button 
            style={{ 
              position: 'absolute', 
              top: 14, 
              right: 14, 
              width: 40, 
              height: 40, 
              borderRadius: 12, 
              background: bannerImage ? 'rgba(0,0,0,0.5)' : 'var(--bg-tertiary)', 
              border: '1px solid #444', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'var(--text-secondary)', 
              zIndex: 10 
            }} 
            onClick={() => document.getElementById('banner-upload').click()}
          >
            {bannerImage ? <Icon type="camera" /> : <Icon type="plus" />}
          </button>
          {bannerImage && (
            <button 
              style={{ 
                position: 'absolute', 
                top: 14, 
                right: 62, 
                width: 40, 
                height: 40, 
                borderRadius: 12, 
                background: 'rgba(0,0,0,0.5)', 
                border: '1px solid #444', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'var(--accent-red)', 
                zIndex: 10 
              }} 
              onClick={() => setBannerImage(null)}
            >
              <Icon type="trash" />
            </button>
          )}
          <div style={{ padding: '70px 24px 28px', minHeight: 220, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            {!bannerImage && !recipeName && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#555', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
                Click + to add banner
              </div>
            )}
            <input 
              style={{ ...styles.input, fontSize: 34, fontWeight: 600, marginBottom: 10, textShadow: bannerImage ? '0 2px 8px rgba(0,0,0,0.5)' : 'none' }} 
              placeholder="Recipe name..." 
              value={recipeName} 
              onChange={e => setRecipeName(e.target.value)} 
            />
            <textarea 
              style={{ 
                ...styles.input, 
                fontSize: 16, 
                lineHeight: 1.6, 
                resize: 'none', 
                height: 52, 
                overflow: 'hidden', 
                color: bannerImage ? '#ccc' : 'var(--text-secondary)', 
                textShadow: bannerImage ? '0 1px 4px rgba(0,0,0,0.5)' : 'none' 
              }} 
              placeholder="A short description..." 
              value={description} 
              onChange={e => { const t = e.target.value; if ((t.match(/\n/g) || []).length <= 1) setDescription(t); }} 
              onKeyDown={e => { if (e.key === 'Enter' && (description.match(/\n/g) || []).length >= 1) e.preventDefault(); }} 
            />
          </div>
          <input 
            id="banner-upload" 
            type="file" 
            accept="image/*" 
            style={{ display: 'none' }} 
            onChange={e => { const f = e.target.files[0]; if (f) handleImageUpload(f, setBannerImage); }} 
          />
        </div>

        {/* Servings and Tags */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 44, flexWrap: 'wrap' }}>
          <div style={{ ...styles.surface, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>Serves</span>
            <input 
              type="number" 
              min="1" 
              value={servings} 
              onChange={e => setServings(e.target.value)} 
              style={{ 
                width: 54, 
                border: 'none', 
                outline: 'none', 
                fontSize: 16, 
                fontWeight: 600, 
                textAlign: 'center', 
                background: 'var(--bg-tertiary)', 
                padding: 8, 
                borderRadius: 8, 
                color: 'var(--accent-green)', 
                fontFamily: 'var(--font-sans)' 
              }} 
            />
          </div>
          <div style={{ ...styles.surface, flex: 1, minWidth: 250, position: 'relative', padding: '8px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {tags.map(t => (
                <span key={t} style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: 6, 
                  padding: '6px 12px', 
                  background: 'rgba(74,222,128,0.15)', 
                  borderRadius: 20, 
                  fontSize: 13, 
                  color: 'var(--accent-green)', 
                  fontFamily: 'var(--font-sans)' 
                }}>
                  {t}
                  <button 
                    style={{ 
                      width: 18, 
                      height: 18, 
                      background: 'rgba(74,222,128,0.3)', 
                      border: 'none', 
                      borderRadius: '50%', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      padding: 0 
                    }} 
                    onClick={() => removeTag(t)}
                  >
                    <Icon type="x" />
                  </button>
                </span>
              ))}
              <input 
                style={{ ...styles.input, flex: 1, minWidth: 100, padding: '6px 0', fontSize: 14, fontFamily: 'var(--font-sans)' }} 
                placeholder={tags.length ? '' : 'Add tags...'} 
                value={tagInput} 
                onChange={e => { setTagInput(e.target.value); setShowSuggestions(true); }} 
                onFocus={() => setShowSuggestions(true)} 
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} 
                onKeyDown={e => { 
                  if (e.key === 'Enter' && tagInput.trim()) { e.preventDefault(); addTag(tagInput); } 
                  else if (e.key === 'Backspace' && !tagInput && tags.length) removeTag(tags[tags.length - 1]); 
                }} 
              />
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div style={{ 
                position: 'absolute', 
                top: '100%', 
                left: 0, 
                right: 0, 
                marginTop: 8, 
                background: 'var(--bg-secondary)', 
                borderRadius: 12, 
                border: '1px solid #333', 
                boxShadow: '0 12px 32px rgba(0,0,0,0.5)', 
                zIndex: 50,
                overflow: 'hidden'
              }}>
                {suggestions.slice(0, 6).map(sg => (
                  <button 
                    key={sg} 
                    style={{ padding: '12px 16px', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', color: 'var(--text-primary)', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-sans)' }} 
                    onMouseDown={() => addTag(sg)} 
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'} 
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {sg}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ingredients Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 2, margin: 0, fontFamily: 'var(--font-sans)' }}>
            Ingredients
          </h2>
          <button 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              padding: '8px 16px', 
              background: 'rgba(74,222,128,0.15)', 
              border: 'none', 
              borderRadius: 8, 
              color: 'var(--accent-green)', 
              fontSize: 13, 
              fontWeight: 600, 
              cursor: 'pointer', 
              fontFamily: 'var(--font-sans)' 
            }} 
            onClick={() => setIngredients([...ingredients, { id: Date.now(), name: '', amount: '', unit: 'g', image: null }])}
          >
            <Icon type="plus" /> Add
          </button>
        </div>
        
        {ingredients.map(ing => (
          <div key={ing.id} style={{ ...styles.surface, marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input 
                style={{ ...styles.input, flex: 2, fontSize: 15 }} 
                placeholder="Ingredient" 
                value={ing.name} 
                onChange={e => setIngredients(ingredients.map(x => x.id === ing.id ? { ...x, name: e.target.value } : x))} 
              />
              <input 
                style={{ 
                  background: 'var(--bg-tertiary)', 
                  border: 'none', 
                  borderRadius: 8, 
                  padding: '10px 12px', 
                  color: 'var(--text-primary)', 
                  outline: 'none', 
                  fontFamily: 'var(--font-sans)', 
                  fontSize: 14, 
                  width: 70, 
                  textAlign: 'center' 
                }} 
                placeholder="Amt" 
                value={ing.amount} 
                onChange={e => setIngredients(ingredients.map(x => x.id === ing.id ? { ...x, amount: e.target.value } : x))} 
              />
              <select 
                style={{ 
                  background: 'var(--bg-tertiary)', 
                  border: 'none', 
                  borderRadius: 8, 
                  padding: '10px 12px', 
                  color: 'var(--accent-green)', 
                  outline: 'none', 
                  fontFamily: 'var(--font-sans)', 
                  fontSize: 14, 
                  cursor: 'pointer' 
                }} 
                value={ing.unit} 
                onChange={e => setIngredients(ingredients.map(x => x.id === ing.id ? { ...x, unit: e.target.value } : x))}
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <button 
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'var(--accent-red)', 
                  cursor: ingredients.length === 1 ? 'not-allowed' : 'pointer', 
                  opacity: ingredients.length === 1 ? 0.3 : 0.6, 
                  padding: 8 
                }} 
                disabled={ingredients.length === 1} 
                onClick={() => ingredients.length > 1 && setIngredients(ingredients.filter(x => x.id !== ing.id))}
              >
                <Icon type="trash" />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              {ing.image ? (
                <div style={{ position: 'relative' }}>
                  <img src={ing.image} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover' }} />
                  <button 
                    style={{ 
                      position: 'absolute', 
                      top: -6, 
                      right: -6, 
                      width: 22, 
                      height: 22, 
                      borderRadius: '50%', 
                      background: 'var(--accent-red)', 
                      border: 'none', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      padding: 0 
                    }} 
                    onClick={() => setIngredients(ingredients.map(x => x.id === ing.id ? { ...x, image: null } : x))}
                  >
                    <Icon type="x" />
                  </button>
                </div>
              ) : (
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 6, 
                  padding: '8px 14px', 
                  background: 'var(--bg-tertiary)', 
                  borderRadius: 8, 
                  cursor: 'pointer', 
                  fontSize: 12, 
                  color: 'var(--text-secondary)', 
                  fontFamily: 'var(--font-sans)' 
                }}>
                  <Icon type="camera" /> Add image
                  <input 
                    type="file" 
                    accept="image/*,image/gif" 
                    style={{ display: 'none' }} 
                    onChange={e => { 
                      const f = e.target.files[0]; 
                      if (f) handleImageUpload(f, (img) => setIngredients(ingredients.map(x => x.id === ing.id ? { ...x, image: img } : x))); 
                    }} 
                  />
                </label>
              )}
            </div>
          </div>
        ))}

        {/* Cooking Steps Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 44, marginBottom: 18 }}>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 2, margin: 0, fontFamily: 'var(--font-sans)' }}>
            Cooking Steps
          </h2>
          <button 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              padding: '8px 16px', 
              background: 'rgba(74,222,128,0.15)', 
              border: 'none', 
              borderRadius: 8, 
              color: 'var(--accent-green)', 
              fontSize: 13, 
              fontWeight: 600, 
              cursor: 'pointer', 
              fontFamily: 'var(--font-sans)' 
            }} 
            onClick={() => setStages([...stages, { id: Date.now(), text: '', image: null }])}
          >
            <Icon type="plus" /> Add Step
          </button>
        </div>
        
        {stages.map((stage, i) => (
          <div key={stage.id} style={{ ...styles.surface, marginBottom: 16, padding: 20 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 12, 
                background: 'linear-gradient(135deg, var(--accent-green-dark), var(--accent-green))', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'var(--bg-primary)', 
                fontWeight: 700, 
                fontSize: 16, 
                fontFamily: 'var(--font-sans)', 
                flexShrink: 0 
              }}>
                {i + 1}
              </div>
              <textarea 
                style={{ ...styles.input, flex: 1, fontSize: 15, lineHeight: 1.7, resize: 'none', minHeight: 80 }} 
                placeholder="Describe this step..." 
                value={stage.text} 
                onChange={e => setStages(stages.map(x => x.id === stage.id ? { ...x, text: e.target.value } : x))} 
              />
              <button 
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'var(--accent-red)', 
                  cursor: stages.length === 1 ? 'not-allowed' : 'pointer', 
                  opacity: stages.length === 1 ? 0.3 : 0.6, 
                  padding: 8, 
                  alignSelf: 'flex-start' 
                }} 
                disabled={stages.length === 1} 
                onClick={() => stages.length > 1 && setStages(stages.filter(x => x.id !== stage.id))}
              >
                <Icon type="trash" />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, marginLeft: 56 }}>
              {stage.image ? (
                <div style={{ position: 'relative' }}>
                  <img src={stage.image} alt="" style={{ width: 130, height: 90, borderRadius: 10, objectFit: 'cover' }} />
                  <button 
                    style={{ 
                      position: 'absolute', 
                      top: -6, 
                      right: -6, 
                      width: 22, 
                      height: 22, 
                      borderRadius: '50%', 
                      background: 'var(--accent-red)', 
                      border: 'none', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      padding: 0 
                    }} 
                    onClick={() => setStages(stages.map(x => x.id === stage.id ? { ...x, image: null } : x))}
                  >
                    <Icon type="x" />
                  </button>
                </div>
              ) : (
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 6, 
                  padding: '10px 16px', 
                  background: 'var(--bg-tertiary)', 
                  borderRadius: 10, 
                  cursor: 'pointer', 
                  fontSize: 13, 
                  color: 'var(--text-secondary)', 
                  fontFamily: 'var(--font-sans)', 
                  border: '1px dashed #444' 
                }}>
                  <Icon type="camera" /> Add image or GIF
                  <input 
                    type="file" 
                    accept="image/*,image/gif" 
                    style={{ display: 'none' }} 
                    onChange={e => { 
                      const f = e.target.files[0]; 
                      if (f) handleImageUpload(f, (img) => setStages(stages.map(x => x.id === stage.id ? { ...x, image: img } : x))); 
                    }} 
                  />
                </label>
              )}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

