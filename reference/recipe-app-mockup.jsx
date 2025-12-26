import React, { useState, useEffect } from 'react';

const UNITS = ['g', 'kg', 'ml', 'L', 'cup', 'tbsp', 'tsp', 'oz', 'lb', 'piece', 'pinch', 'to taste'];
const ALL_TAGS = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Quick', 'Easy', 'Dessert', 'Breakfast', 'Lunch', 'Dinner', 'Israeli', 'Italian', 'Asian', 'Mexican', 'Healthy', 'Kid-Friendly', 'Spicy'];

const initialRecipes = [
  { id: 1, name: 'Tomato Pasta Sauce', updated: 'Just now', tags: ['Italian', 'Vegetarian'], servings: 4, description: '', ingredients: [{ id: 1, name: 'Tomatoes', amount: '400', unit: 'g', image: null }], stages: [{ id: 1, text: 'Cook the tomatoes', image: null }] },
  { id: 2, name: 'Chocolate Cookies', updated: 'Yesterday', tags: ['Dessert', 'Kid-Friendly'], servings: 12, description: '', ingredients: [], stages: [] },
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
  };
  return icons[type] || null;
};

export default function RecipeApp() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [recipes, setRecipes] = useState(initialRecipes);
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
  const [deleteModal, setDeleteModal] = useState(null); // recipe to delete
  const [duplicateModal, setDuplicateModal] = useState(null); // recipe to duplicate
  const [dupName, setDupName] = useState('');
  const [dupDesc, setDupDesc] = useState('');

  const filteredIngredients = ingredients.filter(i => i.name.trim());
  const filteredStages = stages.filter(s => s.text.trim());
  const totalSlides = 2 + filteredStages.length;

  const suggestions = tagInput ? ALL_TAGS.filter(t => t.toLowerCase().startsWith(tagInput.toLowerCase()) && !tags.includes(t)) : [];

  useEffect(() => {
    if (currentView !== 'cooking') return;
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); setCookingSlide(s => Math.min(totalSlides - 1, s + 1)); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setCookingSlide(s => Math.max(0, s - 1)); }
      if (e.key === 'Escape') setCurrentView('view');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentView, totalSlides]);

  const resetForm = () => {
    setRecipeName(''); setDescription(''); setServings('4'); setTags([]); setTagInput('');
    setIngredients([{ id: 1, name: '', amount: '', unit: 'g', image: null }]);
    setStages([{ id: 1, text: '', image: null }]);
    setBannerImage(null); setEditingId(null);
  };

  const openNew = () => { resetForm(); setCurrentView('edit'); };
  
  const openExisting = (r) => {
    setEditingId(r.id); setRecipeName(r.name); setDescription(r.description || '');
    setServings(String(r.servings || 4)); setTags(r.tags || []);
    setIngredients(r.ingredients?.length ? r.ingredients : [{ id: 1, name: '', amount: '', unit: 'g', image: null }]);
    setStages(r.stages?.length ? r.stages : [{ id: 1, text: '', image: null }]);
    setBannerImage(r.bannerImage || null); setCurrentView('view');
  };

  const saveRecipe = () => {
    if (!recipeName.trim()) { setSaveMessage('Please enter a name'); setTimeout(() => setSaveMessage(''), 2000); return; }
    const data = { id: editingId || Date.now(), name: recipeName.trim(), description: description.trim(), servings: parseInt(servings) || 4, tags, ingredients: filteredIngredients, stages: filteredStages, bannerImage, updated: 'Just now' };
    if (editingId) setRecipes(recipes.map(r => r.id === editingId ? data : r));
    else { setRecipes([data, ...recipes]); setEditingId(data.id); }
    setSaveMessage('Saved!'); setTimeout(() => { setSaveMessage(''); setCurrentView('view'); }, 800);
  };

  const addTag = (t) => { if (t.trim() && !tags.includes(t.trim())) setTags([...tags, t.trim()]); setTagInput(''); setShowSuggestions(false); };
  const removeTag = (t) => setTags(tags.filter(x => x !== t));

  const duplicateRecipe = (r) => {
    setDupName(`${r.name} (copy)`);
    setDupDesc(r.description || '');
    setDuplicateModal(r);
  };

  const confirmDuplicate = () => {
    if (!duplicateModal) return;
    const newRecipe = { 
      ...duplicateModal, 
      id: Date.now(), 
      name: dupName.trim() || `${duplicateModal.name} (copy)`,
      description: dupDesc.trim(),
      updated: 'Just now' 
    };
    setRecipes([newRecipe, ...recipes]);
    setDuplicateModal(null);
    setDupName('');
    setDupDesc('');
  };

  const deleteRecipe = (r) => {
    setDeleteModal(r);
  };

  const confirmDelete = () => {
    if (deleteModal) {
      setRecipes(recipes.filter(x => x.id !== deleteModal.id));
      setDeleteModal(null);
    }
  };

  const filteredRecipes = recipes.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.tags.some(t => t.toLowerCase().includes(q));
  });

  const s = {
    page: { minHeight: '100vh', background: '#0D0D0D', color: '#F5F5F5', fontFamily: 'Georgia, serif' },
    header: { padding: '20px 24px', borderBottom: '1px solid #2A2A2A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    main: { maxWidth: 800, margin: '0 auto', padding: '40px 24px' },
    btn: { padding: '10px 16px', background: 'transparent', border: '1px solid #2A2A2A', borderRadius: 8, color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'system-ui', fontSize: 14 },
    btnPrimary: { padding: '10px 20px', background: 'linear-gradient(135deg, #22C55E, #4ADE80)', border: 'none', borderRadius: 8, color: '#0D0D0D', fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui', fontSize: 14 },
    card: { padding: '18px 20px', background: '#1A1A1A', borderRadius: 12, marginBottom: 10, cursor: 'pointer', border: '1px solid #2A2A2A', display: 'flex', gap: 16, alignItems: 'center' },
    tag: { display: 'inline-block', padding: '4px 10px', background: 'rgba(74,222,128,0.15)', borderRadius: 20, fontSize: 12, color: '#4ADE80', marginRight: 6, fontFamily: 'system-ui' },
    input: { width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#F5F5F5', fontFamily: 'Georgia, serif' },
    surface: { background: '#1A1A1A', borderRadius: 12, border: '1px solid #2A2A2A', padding: '14px 16px' },
  };

  // DASHBOARD
  if (currentView === 'dashboard') {
    return (
      <div style={s.page}>
        <header style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #22C55E, #4ADE80)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🍳</div>
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Recipe Manager</h1>
          </div>
        </header>
        <main style={s.main}>
          <button onClick={openNew} style={{ ...s.btnPrimary, width: '100%', padding: 24, fontSize: 18, marginBottom: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <Icon type="plus" /> Create New Recipe
          </button>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16, fontFamily: 'system-ui' }}>Recent Recipes</h2>
          <div style={{ ...s.surface, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px' }}>
            <Icon type="search" />
            <input 
              style={{ ...s.input, fontSize: 15, fontFamily: 'system-ui' }} 
              placeholder="Search recipes by name or tag..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
            />
            {searchQuery && (
              <button style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: 4 }} onClick={() => setSearchQuery('')}>
                <Icon type="x" />
              </button>
            )}
          </div>
          {filteredRecipes.length === 0 ? (
            <div style={{ ...s.surface, textAlign: 'center', padding: 40, color: '#666' }}>
              {recipes.length === 0 ? "No recipes yet. Create your first one!" : "No recipes match your search."}
            </div>
          ) : (
            filteredRecipes.map(r => (
              <div key={r.id} style={s.card} onClick={() => openExisting(r)}>
                <div style={{ width: 56, height: 56, borderRadius: 10, background: r.bannerImage ? `url(${r.bannerImage}) center/cover` : '#242424', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{!r.bannerImage && '🍽️'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                  <div>{r.tags.map(t => <span key={t} style={s.tag}>{t}</span>)}<span style={{ fontSize: 12, color: '#666', fontFamily: 'system-ui' }}>{r.updated}</span></div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button 
                    style={{ background: 'transparent', border: 'none', color: '#888', opacity: 0.6, cursor: 'pointer', padding: 8, borderRadius: 6 }} 
                    onClick={(e) => { e.stopPropagation(); duplicateRecipe(r); }}
                    title="Duplicate"
                  ><Icon type="copy" /></button>
                  <button 
                    style={{ background: 'transparent', border: 'none', color: '#EF4444', opacity: 0.6, cursor: 'pointer', padding: 8, borderRadius: 6 }} 
                    onClick={(e) => { e.stopPropagation(); deleteRecipe(r); }}
                    title="Delete"
                  ><Icon type="trash" /></button>
                </div>
              </div>
            ))
          )}
          <div style={{ ...s.surface, marginTop: 40, textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: '#4ADE80' }}>{searchQuery ? `${filteredRecipes.length} / ${recipes.length}` : recipes.length}</div>
            <div style={{ fontSize: 12, color: '#888', fontFamily: 'system-ui' }}>{searchQuery ? 'Matching Recipes' : 'Total Recipes'}</div>
          </div>
        </main>

        {/* Delete Confirmation Modal */}
        {deleteModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setDeleteModal(null)}>
            <div style={{ background: '#1A1A1A', borderRadius: 16, padding: 32, maxWidth: 400, width: '90%', border: '1px solid #2A2A2A' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 600 }}>Delete Recipe?</h3>
              <p style={{ margin: '0 0 24px', color: '#888', fontSize: 15, lineHeight: 1.5 }}>
                Are you sure you want to delete "<strong style={{ color: '#F5F5F5' }}>{deleteModal.name}</strong>"? This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button style={s.btn} onClick={() => setDeleteModal(null)}>Cancel</button>
                <button style={{ ...s.btnPrimary, background: '#EF4444' }} onClick={confirmDelete}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Modal */}
        {duplicateModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setDuplicateModal(null)}>
            <div style={{ background: '#1A1A1A', borderRadius: 16, padding: 32, maxWidth: 480, width: '90%', border: '1px solid #2A2A2A' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 600 }}>Duplicate Recipe</h3>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontFamily: 'system-ui' }}>Recipe Name</label>
                <input 
                  style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 12, width: '100%', fontSize: 16, padding: '12px 16px', boxSizing: 'border-box', color: '#F5F5F5', outline: 'none', fontFamily: 'Georgia, serif' }} 
                  value={dupName} 
                  onChange={e => setDupName(e.target.value)} 
                  placeholder="Enter recipe name..."
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontFamily: 'system-ui' }}>Description (optional)</label>
                <textarea 
                  style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 12, width: '100%', fontSize: 15, padding: '12px 16px', boxSizing: 'border-box', color: '#F5F5F5', outline: 'none', fontFamily: 'Georgia, serif', resize: 'none', minHeight: 80, lineHeight: 1.5 }} 
                  value={dupDesc} 
                  onChange={e => setDupDesc(e.target.value)} 
                  placeholder="A short description..."
                />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button style={s.btn} onClick={() => setDuplicateModal(null)}>Cancel</button>
                <button style={s.btnPrimary} onClick={confirmDuplicate}>Create Duplicate</button>
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
      <div style={{ position: 'fixed', inset: 0, background: '#0A0A0A', color: '#F5F5F5', fontFamily: 'Georgia, serif', display: 'flex', flexDirection: 'column', zIndex: 1000 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: 'rgba(0,0,0,0.5)' }}>
          <span style={{ fontSize: 14, color: '#666', fontFamily: 'system-ui' }}>{cookingSlide + 1} / {totalSlides}</span>
          <button onClick={() => setCurrentView('view')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#888', display: 'flex' }}><Icon type="close" /></button>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 80px' }}>
          {cookingSlide === 0 && (
            <div style={{ textAlign: 'center', maxWidth: 800 }}>
              {bannerImage && <div style={{ width: 200, height: 200, borderRadius: '50%', background: `url(${bannerImage}) center/cover`, margin: '0 auto 40px' }} />}
              <h1 style={{ fontSize: 'clamp(36px, 8vw, 72px)', fontWeight: 600, margin: '0 0 20px' }}>{recipeName}</h1>
              {description && <p style={{ fontSize: 'clamp(18px, 3vw, 24px)', color: '#888', margin: '0 0 40px' }}>{description}</p>}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 32, fontSize: 'clamp(16px, 2.5vw, 20px)', color: '#666', fontFamily: 'system-ui' }}>
                <span><strong style={{ color: '#4ADE80' }}>{servings}</strong> servings</span>
                <span><strong style={{ color: '#4ADE80' }}>{filteredIngredients.length}</strong> ingredients</span>
                <span><strong style={{ color: '#4ADE80' }}>{filteredStages.length}</strong> steps</span>
              </div>
            </div>
          )}
          {cookingSlide === 1 && (
            <div style={{ maxWidth: 900, width: '100%', padding: '0 20px' }}>
              <h2 style={{ fontSize: 'clamp(14px, 2vw, 18px)', fontWeight: 600, color: '#4ADE80', textTransform: 'uppercase', letterSpacing: 4, marginBottom: 50, textAlign: 'center', fontFamily: 'system-ui' }}>Ingredients</h2>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: `repeat(auto-fit, minmax(${filteredIngredients.some(i => i.image) ? '200px' : '280px'}, 1fr))`,
                gap: 20,
                justifyContent: 'center'
              }}>
                {filteredIngredients.map((ing) => (
                  <div key={ing.id} style={{ 
                    background: 'linear-gradient(145deg, #1A1A1A 0%, #141414 100%)',
                    borderRadius: 16,
                    padding: ing.image ? 0 : '24px',
                    overflow: 'hidden',
                    border: '1px solid #2A2A2A',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {ing.image && (
                      <div style={{ 
                        width: '100%', 
                        aspectRatio: '4/3',
                        background: `url(${ing.image}) center/cover`,
                        borderBottom: '1px solid #2A2A2A'
                      }} />
                    )}
                    <div style={{ padding: ing.image ? '16px 20px 20px' : '0', textAlign: 'center' }}>
                      <div style={{ 
                        fontSize: 'clamp(16px, 2.5vw, 22px)', 
                        fontWeight: 500,
                        marginBottom: 8,
                        color: '#F5F5F5'
                      }}>{ing.name}</div>
                      <div style={{ 
                        fontSize: 'clamp(14px, 2vw, 18px)',
                        color: '#4ADE80',
                        fontFamily: 'system-ui',
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
              <div style={{ width: 'clamp(60px, 12vw, 100px)', height: 'clamp(60px, 12vw, 100px)', borderRadius: '50%', background: 'linear-gradient(135deg, #22C55E, #4ADE80)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#0A0A0A', fontSize: 'clamp(24px, 5vw, 42px)', fontWeight: 700, marginBottom: 40, fontFamily: 'system-ui' }}>{cookingSlide - 1}</div>
              <p style={{ fontSize: 'clamp(22px, 5vw, 36px)', lineHeight: 1.6, margin: 0, color: '#EEE' }}>{filteredStages[cookingSlide - 2].text}</p>
              {filteredStages[cookingSlide - 2].image && <img src={filteredStages[cookingSlide - 2].image} alt="" style={{ marginTop: 40, maxWidth: '100%', maxHeight: '40vh', borderRadius: 16, objectFit: 'contain' }} />}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 40px', background: 'rgba(0,0,0,0.5)' }}>
          <button onClick={() => setCookingSlide(Math.max(0, cookingSlide - 1))} disabled={cookingSlide === 0} style={{ ...s.btn, padding: '16px 28px', opacity: cookingSlide === 0 ? 0.3 : 1 }}><Icon type="back" /> Previous</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button key={i} onClick={() => setCookingSlide(i)} style={{ width: i === cookingSlide ? 24 : 10, height: 10, borderRadius: 5, background: i === cookingSlide ? '#4ADE80' : '#333', border: 'none', cursor: 'pointer' }} />
            ))}
          </div>
          <button onClick={() => setCookingSlide(Math.min(totalSlides - 1, cookingSlide + 1))} disabled={cookingSlide === totalSlides - 1} style={{ ...s.btnPrimary, padding: '16px 28px', opacity: cookingSlide === totalSlides - 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>Next <Icon type="chevronRight" /></button>
        </div>
      </div>
    );
  }

  // VIEW MODE
  if (currentView === 'view') {
    return (
      <div style={s.page}>
        <header style={{ ...s.header, position: 'sticky', top: 0, background: 'rgba(13,13,13,0.95)', backdropFilter: 'blur(10px)', zIndex: 100 }}>
          <button style={s.btn} onClick={() => { resetForm(); setCurrentView('dashboard'); }}><Icon type="back" /> Back</button>
          <div style={{ display: 'flex', gap: 10 }}>
            {(filteredIngredients.length > 0 || filteredStages.length > 0) && (
              <button style={{ ...s.btn, color: '#4ADE80', borderColor: '#4ADE80' }} onClick={() => { setCookingSlide(0); setCurrentView('cooking'); }}><Icon type="play" /> Cook</button>
            )}
            <button style={{ ...s.btnPrimary, display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setCurrentView('edit')}><Icon type="edit" /> Edit</button>
          </div>
        </header>
        <main style={{ maxWidth: 680, margin: '0 auto', padding: '0 24px 80px' }}>
          <div style={{ width: 'calc(100% + 48px)', marginLeft: -24, height: bannerImage ? 280 : 180, background: bannerImage ? `linear-gradient(to top, rgba(13,13,13,1) 0%, rgba(13,13,13,0.4) 50%, rgba(13,13,13,0.1) 100%), url(${bannerImage}) center/cover` : 'linear-gradient(to bottom, #1A1A1A 0%, #0D0D0D 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '40px 24px 32px' }}>
            <h1 style={{ fontSize: 36, fontWeight: 600, margin: 0, marginBottom: description ? 12 : 0 }}>{recipeName || 'Untitled'}</h1>
            {description && <p style={{ fontSize: 16, color: '#999', margin: 0, whiteSpace: 'pre-wrap' }}>{description}</p>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '24px 0 32px', borderBottom: '1px solid #1A1A1A', flexWrap: 'wrap' }}>
            <span style={{ color: '#888', fontSize: 14, fontFamily: 'system-ui' }}><span style={{ color: '#4ADE80', fontWeight: 600 }}>{servings}</span> servings</span>
            {tags.map(t => <span key={t} style={{ padding: '6px 14px', background: 'rgba(74,222,128,0.1)', borderRadius: 20, fontSize: 13, color: '#4ADE80', fontFamily: 'system-ui' }}>{t}</span>)}
          </div>
          {filteredIngredients.length > 0 && (
            <section style={{ padding: '32px 0', borderBottom: '1px solid #1A1A1A' }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: '#4ADE80', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 20, fontFamily: 'system-ui' }}>Ingredients</h2>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {filteredIngredients.map((ing, i) => (
                  <li key={ing.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < filteredIngredients.length - 1 ? '1px solid #1A1A1A' : 'none', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {ing.image && <img src={ing.image} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />}
                      <span style={{ fontSize: 16 }}>{ing.name}</span>
                    </div>
                    <span style={{ fontSize: 15, color: '#888', fontFamily: 'system-ui', whiteSpace: 'nowrap' }}>{ing.amount} {ing.unit}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {filteredStages.length > 0 && (
            <section style={{ paddingTop: 32 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: '#4ADE80', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 24, fontFamily: 'system-ui' }}>Instructions</h2>
              <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {filteredStages.map((stage, i) => (
                  <li key={stage.id} style={{ marginBottom: 28 }}>
                    <div style={{ display: 'flex', gap: 20 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1A1A1A', border: '2px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ADE80', fontSize: 14, fontWeight: 600, fontFamily: 'system-ui', flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: '#CCC' }}>{stage.text}</p>
                        {stage.image && <img src={stage.image} alt="" style={{ marginTop: 16, maxWidth: '100%', borderRadius: 12, maxHeight: 300, objectFit: 'cover' }} />}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {filteredIngredients.length === 0 && filteredStages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
              <p style={{ margin: '0 0 16px' }}>This recipe is empty</p>
              <button style={{ ...s.btnPrimary, display: 'inline-flex', alignItems: 'center', gap: 8 }} onClick={() => setCurrentView('edit')}><Icon type="edit" /> Add content</button>
            </div>
          )}
        </main>
      </div>
    );
  }

  // EDIT MODE
  return (
    <div style={s.page}>
      <header style={{ ...s.header, position: 'sticky', top: 0, background: 'rgba(13,13,13,0.95)', backdropFilter: 'blur(10px)', zIndex: 100 }}>
        <button style={s.btn} onClick={() => editingId ? setCurrentView('view') : (resetForm(), setCurrentView('dashboard'))}><Icon type="back" /> {editingId ? 'Cancel' : 'Back'}</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saveMessage && <span style={{ padding: '8px 14px', background: saveMessage.includes('Please') ? 'rgba(239,68,68,0.2)' : 'rgba(74,222,128,0.2)', borderRadius: 8, fontSize: 13, color: saveMessage.includes('Please') ? '#EF4444' : '#4ADE80', fontFamily: 'system-ui' }}>{saveMessage}</span>}
          <button style={s.btnPrimary} onClick={saveRecipe}>{editingId ? 'Save Changes' : 'Save Recipe'}</button>
        </div>
      </header>
      <main style={{ ...s.main, maxWidth: 680 }}>
        <div style={{ position: 'relative', minHeight: 200, background: bannerImage ? `linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%), url(${bannerImage}) center/cover` : '#1A1A1A', borderRadius: 16, marginBottom: 24, border: bannerImage ? 'none' : '1px dashed #333', overflow: 'hidden' }}>
          <button style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 10, background: bannerImage ? 'rgba(0,0,0,0.5)' : '#242424', border: '1px solid #444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', zIndex: 10 }} onClick={() => document.getElementById('banner-upload').click()}>{bannerImage ? <Icon type="camera" /> : <Icon type="plus" />}</button>
          {bannerImage && <button style={{ position: 'absolute', top: 12, right: 56, width: 36, height: 36, borderRadius: 10, background: 'rgba(0,0,0,0.5)', border: '1px solid #444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', zIndex: 10 }} onClick={() => setBannerImage(null)}><Icon type="trash" /></button>}
          <div style={{ padding: '60px 24px 24px', minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            {!bannerImage && !recipeName && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#555', fontSize: 13, fontFamily: 'system-ui' }}>Click + to add banner</div>}
            <input style={{ ...s.input, fontSize: 32, fontWeight: 600, marginBottom: 8, textShadow: bannerImage ? '0 2px 8px rgba(0,0,0,0.5)' : 'none' }} placeholder="Recipe name..." value={recipeName} onChange={e => setRecipeName(e.target.value)} />
            <textarea style={{ ...s.input, fontSize: 15, lineHeight: 1.5, resize: 'none', height: 48, overflow: 'hidden', color: bannerImage ? '#ccc' : '#888', textShadow: bannerImage ? '0 1px 4px rgba(0,0,0,0.5)' : 'none' }} placeholder="A short description..." value={description} onChange={e => { const t = e.target.value; if ((t.match(/\n/g) || []).length <= 1) setDescription(t); }} onKeyDown={e => { if (e.key === 'Enter' && (description.match(/\n/g) || []).length >= 1) e.preventDefault(); }} />
          </div>
          <input id="banner-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = ev => setBannerImage(ev.target.result); r.readAsDataURL(f); } }} />
        </div>

        <div style={{ display: 'flex', gap: 14, marginBottom: 40, flexWrap: 'wrap' }}>
          <div style={{ ...s.surface, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
            <span style={{ fontSize: 14, color: '#888', fontFamily: 'system-ui' }}>Serves</span>
            <input type="number" min="1" value={servings} onChange={e => setServings(e.target.value)} style={{ width: 50, border: 'none', outline: 'none', fontSize: 16, fontWeight: 600, textAlign: 'center', background: '#242424', padding: 6, borderRadius: 8, color: '#4ADE80', fontFamily: 'system-ui' }} />
          </div>
          <div style={{ ...s.surface, flex: 1, minWidth: 250, position: 'relative', padding: '8px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {tags.map(t => <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'rgba(74,222,128,0.15)', borderRadius: 20, fontSize: 13, color: '#4ADE80', fontFamily: 'system-ui' }}>{t}<button style={{ width: 16, height: 16, background: 'rgba(74,222,128,0.3)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} onClick={() => removeTag(t)}><Icon type="x" /></button></span>)}
              <input style={{ ...s.input, flex: 1, minWidth: 100, padding: '6px 0', fontSize: 14, fontFamily: 'system-ui' }} placeholder={tags.length ? '' : 'Add tags...'} value={tagInput} onChange={e => { setTagInput(e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} onKeyDown={e => { if (e.key === 'Enter' && tagInput.trim()) { e.preventDefault(); addTag(tagInput); } else if (e.key === 'Backspace' && !tagInput && tags.length) removeTag(tags[tags.length - 1]); }} />
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 8, background: '#1A1A1A', borderRadius: 10, border: '1px solid #333', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 50 }}>
                {suggestions.slice(0, 6).map(sg => <button key={sg} style={{ padding: '10px 14px', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', color: '#F5F5F5', fontSize: 14, cursor: 'pointer', fontFamily: 'system-ui' }} onMouseDown={() => addTag(sg)} onMouseEnter={e => e.currentTarget.style.background = '#242424'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{sg}</button>)}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 2, margin: 0, fontFamily: 'system-ui' }}>Ingredients</h2>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(74,222,128,0.15)', border: 'none', borderRadius: 8, color: '#4ADE80', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui' }} onClick={() => setIngredients([...ingredients, { id: Date.now(), name: '', amount: '', unit: 'g', image: null }])}><Icon type="plus" /> Add</button>
        </div>
        {ingredients.map(ing => (
          <div key={ing.id} style={{ ...s.surface, marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input style={{ ...s.input, flex: 2, fontSize: 15 }} placeholder="Ingredient" value={ing.name} onChange={e => setIngredients(ingredients.map(x => x.id === ing.id ? { ...x, name: e.target.value } : x))} />
              <input style={{ background: '#242424', border: 'none', borderRadius: 8, padding: '8px 12px', color: '#F5F5F5', outline: 'none', fontFamily: 'system-ui', fontSize: 14, width: 65, textAlign: 'center' }} placeholder="Amt" value={ing.amount} onChange={e => setIngredients(ingredients.map(x => x.id === ing.id ? { ...x, amount: e.target.value } : x))} />
              <select style={{ background: '#242424', border: 'none', borderRadius: 8, padding: '8px 10px', color: '#4ADE80', outline: 'none', fontFamily: 'system-ui', fontSize: 14, cursor: 'pointer' }} value={ing.unit} onChange={e => setIngredients(ingredients.map(x => x.id === ing.id ? { ...x, unit: e.target.value } : x))}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select>
              <button style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: ingredients.length === 1 ? 'not-allowed' : 'pointer', opacity: ingredients.length === 1 ? 0.3 : 0.6, padding: 8 }} disabled={ingredients.length === 1} onClick={() => ingredients.length > 1 && setIngredients(ingredients.filter(x => x.id !== ing.id))}><Icon type="trash" /></button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
              {ing.image ? (
                <div style={{ position: 'relative' }}>
                  <img src={ing.image} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }} />
                  <button style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#EF4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} onClick={() => setIngredients(ingredients.map(x => x.id === ing.id ? { ...x, image: null } : x))}><Icon type="x" /></button>
                </div>
              ) : (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#242424', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#888', fontFamily: 'system-ui' }}>
                  <Icon type="camera" /> Add image
                  <input type="file" accept="image/*,image/gif" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = ev => setIngredients(ingredients.map(x => x.id === ing.id ? { ...x, image: ev.target.result } : x)); r.readAsDataURL(f); } }} />
                </label>
              )}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 16 }}>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 2, margin: 0, fontFamily: 'system-ui' }}>Cooking Steps</h2>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(74,222,128,0.15)', border: 'none', borderRadius: 8, color: '#4ADE80', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui' }} onClick={() => setStages([...stages, { id: Date.now(), text: '', image: null }])}><Icon type="plus" /> Add Step</button>
        </div>
        {stages.map((stage, i) => (
          <div key={stage.id} style={{ ...s.surface, marginBottom: 14, padding: 18 }}>
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #22C55E, #4ADE80)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0D0D0D', fontWeight: 700, fontSize: 15, fontFamily: 'system-ui', flexShrink: 0 }}>{i + 1}</div>
              <textarea style={{ ...s.input, flex: 1, fontSize: 15, lineHeight: 1.6, resize: 'none', minHeight: 70 }} placeholder="Describe this step..." value={stage.text} onChange={e => setStages(stages.map(x => x.id === stage.id ? { ...x, text: e.target.value } : x))} />
              <button style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: stages.length === 1 ? 'not-allowed' : 'pointer', opacity: stages.length === 1 ? 0.3 : 0.6, padding: 8, alignSelf: 'flex-start' }} disabled={stages.length === 1} onClick={() => stages.length > 1 && setStages(stages.filter(x => x.id !== stage.id))}><Icon type="trash" /></button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, marginLeft: 50 }}>
              {stage.image ? (
                <div style={{ position: 'relative' }}>
                  <img src={stage.image} alt="" style={{ width: 120, height: 80, borderRadius: 8, objectFit: 'cover' }} />
                  <button style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#EF4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} onClick={() => setStages(stages.map(x => x.id === stage.id ? { ...x, image: null } : x))}><Icon type="x" /></button>
                </div>
              ) : (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#242424', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#888', fontFamily: 'system-ui', border: '1px dashed #444' }}>
                  <Icon type="camera" /> Add image or GIF
                  <input type="file" accept="image/*,image/gif" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = ev => setStages(stages.map(x => x.id === stage.id ? { ...x, image: ev.target.result } : x)); r.readAsDataURL(f); } }} />
                </label>
              )}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
