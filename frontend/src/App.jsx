import React, { useState, useEffect, useCallback } from 'react';
import * as api from './api';
import ImageCapture from './ImageCapture';
import { MOCK_RECIPES, MOCK_DISCOVER_RECIPES } from './data/mockRecipes';

// App version - update this single place when releasing new versions
const APP_VERSION = 'v0.0.24';
const APP_DATE = 'Mar 2, 2026';

const UNITS = ['g', 'kg', 'ml', 'L', 'cup', 'tbsp', 'tsp', 'piece', 'pinch', 'to taste'];

// Translations
const TRANSLATIONS = {
  en: {
    // App
    appName: 'Cheffinator',
    
    // Login
    whatsYourName: "What's your chef's name?",
    enterName: 'Enter your name...',
    checking: 'Checking...',
    continue: 'Continue',
    alphaAccess: 'Alpha Testing • Contact admin for access',
    loadingProfile: 'Loading profile...',
    loadingRecipe: 'Loading recipe...',
    
    // Dashboard
    yourRecipes: 'Your Recipes',
    searchPlaceholder: 'Search recipes by name or tag...',
    loadingRecipes: 'Loading your recipes...',
    addRecipe: 'Add Recipe',
    createNewRecipe: 'Create a new recipe',
    noRecipesMatch: 'No recipes match your search.',
    updated: 'Updated',
    loggedInAs: 'Logged in as',
    shareProfile: 'Share Profile',
    logOut: 'Log out',
    myRecipes: 'My Recipes',
    
    // Home/Discover
    randomRecipes: 'Random recipes',
    loadingDelicious: 'Loading delicious recipes...',
    noSharedRecipes: 'No shared recipes yet',
    beFirstToShare: 'Be the first to share!',
    by: 'by',
    
    // Recipe View
    untitled: 'Untitled',
    servings: 'servings',
    ingredients: 'Ingredients',
    instructions: 'Instructions',
    noContentYet: 'This recipe has no content yet',
    recipeEmpty: 'This recipe is empty',
    addContent: 'Add content',
    share: 'Share',
    sharing: 'Sharing...',
    publish: 'Publish',
    unpublish: 'Unpublish',
    publishing: 'Publishing...',
    published: 'Published',
    edit: 'Edit',
    back: 'Back',
    done: 'Done',
    add: 'Add',
    
    // Edit
    recipeName: 'Recipe name...',
    shortDescription: 'A short description...',
    untitledRecipe: 'Untitled Recipe',
    clickToAddBanner: 'Click + to add banner',
    serves: 'Serves',
    addTags: 'Add tags...',
    ingredient: 'Ingredient',
    describeStep: 'Describe this step...',
    addIngredient: '+ Add ingredient',
    addStep: '+ Add step',
    
    // Save status
    saving: 'Saving...',
    saved: '✓ Saved',
    unsavedChanges: 'Unsaved changes',
    pleaseEnterName: 'Please enter a name',
    
    // Variation
    newVariation: 'New Variation',
    variationName: 'Variation Name',
    startFrom: 'Start From',
    emptyVariation: 'Empty variation',
    copyCurrentVariation: 'Copy current variation',
    cancel: 'Cancel',
    create: 'Create',
    
    // Public Profile
    recipes: 'Recipes',
    recipe: 'recipe',
    noRecipesYet: 'No recipes yet',
    backToCheffinator: 'Back to Cheffinator',
    
    // Delete/Share modals
    deleteRecipe: 'Delete Recipe',
    deleteConfirm: 'Delete recipe and all variations?',
    delete: 'Delete',
    copyLink: 'Copy Link',
    linkCopied: 'Link copied!',
    shareRecipe: 'Share Recipe',
    shareRecipeDesc: 'Anyone with this link can view',
    
    // Tags
    tags: {
      'Vegetarian': 'Vegetarian', 'Vegan': 'Vegan', 'Gluten-Free': 'Gluten-Free',
      'Dairy-Free': 'Dairy-Free', 'Quick': 'Quick', 'Easy': 'Easy',
      'Dessert': 'Dessert', 'Breakfast': 'Breakfast', 'Lunch': 'Lunch',
      'Dinner': 'Dinner', 'Snack': 'Snack', 'Israeli': 'Israeli',
      'Italian': 'Italian', 'Asian': 'Asian', 'Mexican': 'Mexican',
      'Healthy': 'Healthy', 'Comfort Food': 'Comfort Food', 'Kid-Friendly': 'Kid-Friendly',
      'Spicy': 'Spicy', 'Soup': 'Soup', 'Salad': 'Salad', 'Pasta': 'Pasta',
      'Meat': 'Meat', 'Fish': 'Fish', 'Chicken': 'Chicken',
      'Baking': 'Baking', 'Holiday': 'Holiday', 'Shabbat': 'Shabbat', 'Passover': 'Passover'
    }
  },
  he: {
    // App
    appName: 'Cheffinator',
    
    // Login
    whatsYourName: 'מה שם השף שלך?',
    enterName: 'הכנס את שמך...',
    checking: 'בודק...',
    continue: 'המשך',
    alphaAccess: 'גרסת אלפא • צור קשר למנהל לגישה',
    loadingProfile: 'טוען פרופיל...',
    loadingRecipe: 'טוען מתכון...',
    
    // Dashboard
    yourRecipes: 'המתכונים שלך',
    searchPlaceholder: 'חפש מתכונים לפי שם או תגית...',
    loadingRecipes: 'טוען את המתכונים שלך...',
    addRecipe: 'הוסף מתכון',
    createNewRecipe: 'צור מתכון חדש',
    noRecipesMatch: 'לא נמצאו מתכונים תואמים.',
    updated: 'עודכן',
    loggedInAs: 'מחובר בתור',
    shareProfile: 'שתף פרופיל',
    logOut: 'התנתק',
    myRecipes: 'המתכונים שלי',
    
    // Home/Discover
    randomRecipes: 'מתכונים אקראיים',
    loadingDelicious: 'טוען מתכונים טעימים...',
    noSharedRecipes: 'אין עדיין מתכונים משותפים',
    beFirstToShare: 'היה הראשון לשתף!',
    by: 'מאת',
    
    // Recipe View
    untitled: 'ללא שם',
    servings: 'מנות',
    ingredients: 'מצרכים',
    instructions: 'הוראות הכנה',
    noContentYet: 'למתכון זה אין עדיין תוכן',
    recipeEmpty: 'המתכון ריק',
    addContent: 'הוסף תוכן',
    share: 'שתף',
    sharing: 'משתף...',
    publish: 'פרסם',
    unpublish: 'הסר פרסום',
    publishing: 'מפרסם...',
    published: 'פורסם',
    edit: 'ערוך',
    back: 'חזור',
    done: 'סיום',
    add: 'הוסף',
    
    // Edit
    recipeName: 'שם המתכון...',
    shortDescription: 'תיאור קצר...',
    untitledRecipe: 'מתכון ללא שם',
    clickToAddBanner: 'לחץ + להוספת תמונה',
    serves: 'מנות',
    addTags: 'הוסף תגיות...',
    ingredient: 'מצרך',
    describeStep: 'תאר את השלב הזה...',
    addIngredient: '+ הוסף מצרך',
    addStep: '+ הוסף שלב',
    
    // Save status
    saving: 'שומר...',
    saved: '✓ נשמר',
    unsavedChanges: 'שינויים לא נשמרו',
    pleaseEnterName: 'נא להזין שם',
    
    // Variation
    newVariation: 'וריאציה חדשה',
    variationName: 'שם הוריאציה',
    startFrom: 'התחל מ',
    emptyVariation: 'וריאציה ריקה',
    copyCurrentVariation: 'העתק וריאציה נוכחית',
    cancel: 'ביטול',
    create: 'צור',
    
    // Public Profile
    recipes: 'מתכונים',
    recipe: 'מתכון',
    noRecipesYet: 'אין עדיין מתכונים',
    backToCheffinator: 'חזרה לשפינטור',
    
    // Delete/Share modals
    deleteRecipe: 'מחק מתכון',
    deleteConfirm: 'למחוק את המתכון וכל הוריאציות?',
    delete: 'מחק',
    copyLink: 'העתק קישור',
    linkCopied: 'הקישור הועתק!',
    shareRecipe: 'שתף מתכון',
    shareRecipeDesc: 'כל מי שיש לו את הקישור יוכל לצפות',
    
    // Tags
    tags: {
      'Vegetarian': 'צמחוני', 'Vegan': 'טבעוני', 'Gluten-Free': 'ללא גלוטן',
      'Dairy-Free': 'ללא חלב', 'Quick': 'מהיר', 'Easy': 'קל',
      'Dessert': 'קינוח', 'Breakfast': 'ארוחת בוקר', 'Lunch': 'ארוחת צהריים',
      'Dinner': 'ארוחת ערב', 'Snack': 'חטיף', 'Israeli': 'ישראלי',
      'Italian': 'איטלקי', 'Asian': 'אסייתי', 'Mexican': 'מקסיקני',
      'Healthy': 'בריא', 'Comfort Food': 'אוכל נחמה', 'Kid-Friendly': 'לילדים',
      'Spicy': 'חריף', 'Soup': 'מרק', 'Salad': 'סלט', 'Pasta': 'פסטה',
      'Meat': 'בשר', 'Fish': 'דג', 'Chicken': 'עוף',
      'Baking': 'אפייה', 'Holiday': 'חג', 'Shabbat': 'שבת', 'Passover': 'פסח'
    }
  }
};

const DEFAULT_TAGS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Quick', 'Easy', 
  'Dessert', 'Breakfast', 'Lunch', 'Dinner', 'Snack',
  'Israeli', 'Italian', 'Asian', 'Mexican', 
  'Healthy', 'Comfort Food', 'Kid-Friendly', 'Spicy',
  'Soup', 'Salad', 'Pasta', 'Meat', 'Fish', 'Chicken',
  'Baking', 'Holiday', 'Shabbat', 'Passover'
];

// Icon definitions moved outside component to prevent recreation on every render
const ICONS = {
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
  fullscreen: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>,
  exitFullscreen: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>,
  more: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>,
  share: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  link: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
};

const Icon = ({ type }) => ICONS[type] || null;

const styles = {
  page: { 
    minHeight: '100vh', 
    background: 'var(--bg-primary)', 
    color: 'var(--text-primary)', 
    fontFamily: 'var(--font-display)' 
  },
  header: { 
    padding: 'clamp(12px, 3vw, 20px) clamp(12px, 3vw, 24px)', 
    borderBottom: '1px solid var(--border-color)', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    gap: 8
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

// Terminator-inspired food taglines
const SPLASH_TAGLINES = [
  "Come with me if you want to eat",
  "Pasta la vista, baby",
  "I'll be back... for dinner",
  "Get to the oven!",
  "I need your salt, your pepper, and your recipe",
  "Your leftovers. Give them to me.",
  "You're terminated... from the kitchen",
  "Talk to the pan",
  "There is no fate but what we bake",
  "I swear I will not cook anyone,"
];

export default function App() {
  // Language state - persisted in localStorage
  const [lang, setLang] = useState(() => localStorage.getItem('cheffinator_lang') || 'en');
  const isRTL = lang === 'he';
  
  // Translation helper
  const t = (key) => TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
  const tTag = (tag) => TRANSLATIONS[lang]?.tags?.[tag] ?? tag;
  
  // Toggle language
  const toggleLanguage = () => {
    const newLang = lang === 'en' ? 'he' : 'en';
    setLang(newLang);
    localStorage.setItem('cheffinator_lang', newLang);
  };
  
  // Detect if text contains Hebrew characters
  const isHebrewText = (text) => {
    if (!text) return false;
    // Hebrew Unicode range: \u0590-\u05FF
    const hebrewPattern = /[\u0590-\u05FF]/;
    return hebrewPattern.test(text);
  };
  
  // Detect if recipe content is primarily in Hebrew
  const isRecipeHebrew = () => {
    // Check recipe name, description, and first ingredient/stage
    const textsToCheck = [
      recipeName,
      description,
      ingredients[0]?.name,
      stages[0]?.text
    ].filter(Boolean);
    
    // If any text contains Hebrew, consider it Hebrew
    return textsToCheck.some(isHebrewText);
  };
  
  // Splash screen state - only show once per session
  const [showSplash, setShowSplash] = useState(() => {
    // Check if splash was already shown this session
    if (sessionStorage.getItem('cheffinator_splash_shown')) {
      return false;
    }
    return true;
  });
  const [splashFading, setSplashFading] = useState(false);
  const [appFadingIn, setAppFadingIn] = useState(false);
  const [loadingPercent, setLoadingPercent] = useState(0);
  
  // Random tagline for splash screen (generated once per load)
  const splashTagline = React.useRef(
    SPLASH_TAGLINES[Math.floor(Math.random() * SPLASH_TAGLINES.length)]
  );
  
  // Random stop points for loading bar (generated once per load)
  const loadingRandoms = React.useRef(() => {
    // Generate 2 random stop points
    const stop1 = 30 + Math.random() * 25;   // 30-55
    const stop2 = 70 + Math.random() * 20;   // 70-90
    
    return {
      stops: [stop1, stop2],
      slowSpeeds: [
        0.3 + Math.random() * 0.5,  // 0.3-0.8 (slow crawl speed)
        0.2 + Math.random() * 0.4,  // 0.2-0.6
      ]
    };
  });
  
  // User authentication state
  // In local dev, auto-login as 'designer' if no existing user code
  const [userCode, setUserCode] = useState(() => {
    const existingCode = api.getUserCode();
    if (existingCode) return existingCode;
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isDev) {
      api.setUserCode('designer');
      return 'designer';
    }
    return null;
  });
  const [loginInput, setLoginInput] = useState(() => api.getRememberedUsername());
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Default view is 'home' (discover page)
  const [currentView, setCurrentView] = useState('home');
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Discover/homepage state
  const [discoverRecipes, setDiscoverRecipes] = useState([]);
  const [discoverLoading, setDiscoverLoading] = useState(true); // Start with loading true
  
  // Public/shared recipe state
  const [isPublicView, setIsPublicView] = useState(false);
  const [publicRecipe, setPublicRecipe] = useState(null);
  const [publicProfile, setPublicProfile] = useState(null); // { userCode, recipes } for public profile view
  const [shareModal, setShareModal] = useState(null); // { recipeId, shareUrl } or null
  const [profileShareModal, setProfileShareModal] = useState(false); // for profile share link modal
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
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved'); // 'saved', 'unsaved', 'saving'
  const autoSaveTimeoutRef = React.useRef(null);
  const lastSavedDataRef = React.useRef(null);
  const [uploadProgress, setUploadProgress] = useState(null); // null = hidden, 0-100 = progress
  const [cookingSlide, setCookingSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModal, setDeleteModal] = useState(null);
  const [variationModal, setVariationModal] = useState(null);
  const [newVariationName, setNewVariationName] = useState('');
  const [customTags, setCustomTags] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  
  // Variations state
  const [variations, setVariations] = useState([]);
  const [currentVariationIndex, setCurrentVariationIndex] = useState(0);

  // Language translation state
  const [translations, setTranslations] = useState([]); // array of { langName, name, description, ingredients, stages }
  const [editingTranslationIndex, setEditingTranslationIndex] = useState(null); // null = not editing any language tab
  const [viewTranslationIndex, setViewTranslationIndex] = useState(null); // null = viewing original

  // Image capture state (for mobile camera/GIF feature)
  // captureTarget: { type: 'banner' } | { type: 'ingredient', index: number } | { type: 'stage', index: number } | null
  const [captureTarget, setCaptureTarget] = useState(null);

  const filteredIngredients = ingredients.filter(i => i.name.trim());
  const filteredStages = stages.filter(s => s.text.trim());
  const totalSlides = 2 + filteredStages.length;
  
  // Combine default tags with custom tags from database
  const allAvailableTags = [...new Set([...DEFAULT_TAGS, ...customTags])];
  const suggestions = tagInput ? allAvailableTags.filter(t => t.toLowerCase().startsWith(tagInput.toLowerCase()) && !tags.includes(t)) : [];

  // Splash screen timer - show for 4 seconds (2 animation loops), then cross-fade
  // Only runs if splash is being shown (not skipped via sessionStorage)
  useEffect(() => {
    if (!showSplash) return; // Skip if splash already hidden
    
    const fadeTimer = setTimeout(() => {
      setSplashFading(true);
      setAppFadingIn(true);
    }, 4000);
    const hideTimer = setTimeout(() => {
      setShowSplash(false);
      // Mark splash as shown for this session
      sessionStorage.setItem('cheffinator_splash_shown', 'true');
    }, 5000); // 4s display + 1s fade
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  // Animate loading percentage with randomized stop points
  useEffect(() => {
    if (!showSplash) return;
    const startTime = Date.now();
    const duration = 4000;
    const { stops, slowSpeeds } = loadingRandoms.current();
    let lastPercent = 0;
    
    // Build timeline with guaranteed forward progress
    // Each segment: { endTime (0-1), startPercent, endPercent }
    const s1 = stops[0];
    const s2 = stops[1];
    
    const timeline = [
      { endTime: 0.25, startPct: 0, endPct: s1 },                      // Fast to stop 1
      { endTime: 0.40, startPct: s1, endPct: s1 + 5 * slowSpeeds[0] }, // Slow crawl
      { endTime: 0.55, startPct: s1 + 5 * slowSpeeds[0], endPct: s2 }, // Fast to stop 2
      { endTime: 0.70, startPct: s2, endPct: s2 + 4 * slowSpeeds[1] }, // Slow crawl
      { endTime: 0.80, startPct: s2 + 4 * slowSpeeds[1], endPct: 100 }, // Fast to 100
      { endTime: 1.00, startPct: 100, endPct: 100 },                   // Hold at 100
    ];
    
    const getPercent = (elapsed) => {
      const t = elapsed / duration;
      let prevEndTime = 0;
      
      for (const seg of timeline) {
        if (t <= seg.endTime) {
          const segmentProgress = (t - prevEndTime) / (seg.endTime - prevEndTime);
          return seg.startPct + segmentProgress * (seg.endPct - seg.startPct);
        }
        prevEndTime = seg.endTime;
      }
      return 100;
    };
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rawPercent = getPercent(elapsed);
      // Never go backwards, cap at 100
      const newPercent = Math.min(Math.max(Math.round(rawPercent), lastPercent), 100);
      lastPercent = newPercent;
      setLoadingPercent(newPercent);
    }, 50);
    
    return () => clearInterval(interval);
  }, [showSplash]);

  // Check for shared recipe or profile URL on app load
  useEffect(() => {
    const path = window.location.pathname;
    
    // Check for shared recipe URL (/r/:shareId)
    const shareMatch = path.match(/^\/r\/([a-zA-Z0-9]+)$/);
    if (shareMatch) {
      const shareId = shareMatch[1];
      loadSharedRecipe(shareId, false); // Don't push history on initial load
      return;
    }
    
    // Check for public profile URL (/u/:userCode)
    const profileMatch = path.match(/^\/u\/([a-zA-Z0-9_-]+)$/i);
    if (profileMatch) {
      const profileUserCode = profileMatch[1];
      loadPublicProfile(profileUserCode);
    }
  }, []);

  // NOTE: popstate handling is consolidated in the effect below (around line 1216)

  // Load discover recipes for homepage
  const loadDiscoverRecipes = async () => {
    try {
      setDiscoverLoading(true);
      const data = await api.fetchDiscoverRecipes(5);
      setDiscoverRecipes(data);
    } catch (error) {
      console.error('Failed to load discover recipes:', error);
      // Use mock data for local development when backend is unavailable
      setDiscoverRecipes(MOCK_DISCOVER_RECIPES);
    } finally {
      setDiscoverLoading(false);
    }
  };

  // Load discover recipes when on home view
  useEffect(() => {
    if (currentView === 'home' && userCode && !showSplash) {
      loadDiscoverRecipes();
    }
  }, [currentView, userCode, showSplash]);

  // Load shared recipe by shareId
  const loadSharedRecipe = async (shareId, pushHistory = true) => {
    try {
      setLoading(true);
      const data = await api.fetchSharedRecipe(shareId);
      setPublicRecipe(data);
      setIsPublicView(true);
      setCurrentView('view');
      
      // Push to history if navigating from within app (not initial load)
      if (pushHistory) {
        window.history.pushState({ view: 'publicRecipe', shareId }, '', `/r/${shareId}`);
      }
      
      // Set up the view with first variation data
      if (data.variations && data.variations.length > 0) {
        setRecipeName(data.name);
        setVariations(data.variations);
        setCurrentVariationIndex(0);
        setViewTranslationIndex(null);
        loadVariationData(data.variations[0]);
      }
    } catch (error) {
      console.error('Failed to load shared recipe:', error);
      // Redirect to home if recipe not found
      window.history.pushState({}, '', '/');
      setIsPublicView(false);
    } finally {
      setLoading(false);
    }
  };

  // Load public profile by userCode
  const loadPublicProfile = async (profileUserCode) => {
    try {
      setLoading(true);
      const data = await api.fetchPublicProfile(profileUserCode);
      setPublicProfile(data);
      setIsPublicView(true);
      setCurrentView('profile');
    } catch (error) {
      console.error('Failed to load public profile:', error);
      window.history.pushState({}, '', '/');
      setIsPublicView(false);
      setPublicProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle clicking a recipe in public profile view
  const openPublicRecipe = async (recipe) => {
    try {
      setLoading(true);
      // Fetch the full recipe data
      const data = await api.fetchRecipe(recipe.id);
      setPublicRecipe(data);
      
      // Set up the view with first variation data
      if (data.variations && data.variations.length > 0) {
        setRecipeName(data.name);
        setVariations(data.variations);
        setCurrentVariationIndex(0);
        setViewTranslationIndex(null);
        loadVariationData(data.variations[0]);
      }

      // Push state for back button navigation
      window.history.pushState({ view: 'view', fromProfile: true }, '', window.location.pathname);
      setCurrentView('view');
    } catch (error) {
      console.error('Failed to load recipe:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load recipes and custom tags when userCode is set
  useEffect(() => {
    if (userCode && !isPublicView) {
      loadRecipes();
      loadCustomTags();
    }
  }, [userCode, isPublicView]);

  const loadRecipes = useCallback(async () => {
    if (!userCode) return;
    try {
      setLoading(true);
      const data = await api.fetchRecipes(userCode);
      // In development, always include mock recipes for demo purposes
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isDev) {
        setRecipes([...data, ...MOCK_RECIPES]);
      } else {
        setRecipes(data);
      }
    } catch (error) {
      console.error('Failed to load recipes:', error);
      // If API fails in dev, still show mock recipes
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isDev) {
        setRecipes(MOCK_RECIPES);
      }
    } finally {
      setLoading(false);
    }
  }, [userCode]);

  const loadCustomTags = async () => {
    try {
      const data = await api.fetchCustomTags();
      setCustomTags(data);
    } catch (error) {
      console.error('Failed to load custom tags:', error);
    }
  };

  // Login with access code (validates with server first)
  const handleLogin = async (code) => {
    if (!code.trim()) return;
    
    setLoginLoading(true);
    setLoginError('');
    
    // In local dev, allow any name without server validation
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    try {
      if (isDev) {
        // Skip server validation in local dev
        const normalizedCode = code.trim().toLowerCase().replace(/\s+/g, '');
        api.setUserCode(normalizedCode);
        api.setRememberedUsername(normalizedCode); // Remember for next time
        setUserCode(normalizedCode);
        setLoginInput('');
      } else {
        // Validate code with server in production
        const result = await api.validateCode(code.trim());
        api.setUserCode(result.code);
        api.setRememberedUsername(result.code); // Remember for next time
        setUserCode(result.code);
        setLoginInput('');
      }
    } catch (error) {
      setLoginError(error.message || 'Invalid access code');
    } finally {
      setLoginLoading(false);
    }
  };

  // Logout - clear both session and remembered username
  const handleLogout = () => {
    api.clearUserCode();
    localStorage.removeItem('cheffinator_remembered_user'); // Force re-type on next login
    setUserCode(null);
    setLoginInput(''); // Clear the input field too
    setRecipes([]);
    setShowUserMenu(false);
  };

  // Close user menu when clicking outside
  useEffect(() => {
    if (!showUserMenu) return;
    const handleClick = () => setShowUserMenu(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showUserMenu]);

  // Fullscreen helpers for cooking mode
  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    if (!openMenuId) return;
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  const startCookingMode = () => {
    setCookingSlide(0);
    window.history.pushState({ view: 'cooking' }, '', window.location.pathname);
    setCurrentView('cooking');
    enterFullscreen();
  };

  const exitCookingMode = () => {
    setCurrentView('view');
    if (document.fullscreenElement) {
      exitFullscreen();
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
      if (e.key === 'Escape') exitCookingMode();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentView, totalSlides]);

  // Browser back button support - push history state on view changes
  const navigateTo = useCallback((view, replace = false) => {
    const state = { view, editingId, recipeName };
    if (replace) {
      window.history.replaceState(state, '', window.location.pathname);
    } else {
      window.history.pushState(state, '', window.location.pathname);
    }
    setCurrentView(view);
  }, [editingId, recipeName]);

  // Handle browser back/forward buttons
  useEffect(() => {
    // Set initial state on first load
    if (!window.history.state?.view) {
      window.history.replaceState({ view: currentView }, '', window.location.pathname);
    }

    const handlePopState = (event) => {
      const targetView = event.state?.view;
      const path = window.location.pathname;
      
      // Handle URL-based navigation first (shared recipes, profiles)
      const shareMatch = path.match(/^\/r\/([a-zA-Z0-9]+)$/);
      if (shareMatch) {
        const shareId = shareMatch[1];
        loadSharedRecipe(shareId, false);
        return;
      }
      
      const profileMatch = path.match(/^\/u\/([a-zA-Z0-9_-]+)$/i);
      if (profileMatch) {
        const profileUserCode = profileMatch[1];
        loadPublicProfile(profileUserCode);
        return;
      }
      
      // Homepage URL
      if (path === '/') {
        setIsPublicView(false);
        setPublicRecipe(null);
        setPublicProfile(null);
      }
      
      // Exit cooking mode if going back from it
      if (currentView === 'cooking') {
        exitCookingMode();
        return;
      }
      
      // If we have a target view in state, navigate to it
      if (targetView) {
        // Clean up state when leaving certain views
        if (currentView === 'view' && targetView !== 'edit') {
          resetForm();
          setPublicRecipe(null);
          if (targetView === 'home' || targetView === 'dashboard') {
            setIsPublicView(false);
          }
        }
        if (currentView === 'profile' && targetView !== 'view') {
          setIsPublicView(false);
          setPublicProfile(null);
          resetForm();
        }
        setCurrentView(targetView);
      } else {
        // No state - user went back past app's history, push them forward and stay on home
        const defaultView = userCode ? 'home' : 'login';
        window.history.pushState({ view: defaultView }, '', '/');
        resetForm();
        setIsPublicView(false);
        setPublicProfile(null);
        setPublicRecipe(null);
        setCurrentView(defaultView);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentView, isPublicView, userCode]);

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
    setVariations([]);
    setCurrentVariationIndex(0);
    setIsPublished(false);
  };

  const openNew = async () => { 
    resetForm();
    
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // In dev mode, create a mock recipe locally without API
    if (isDev) {
      const mockId = `mock-new-${Date.now()}`;
      setEditingId(mockId);
      setRecipeName('Untitled Recipe');
      setVariations([{
        id: null,
        name: 'Original',
        description: '',
        servings: 4,
        tags: [],
        bannerImage: null,
        ingredients: [{ id: 1, name: '', amount: '', unit: 'g', image: null }],
        stages: [{ id: 1, text: '', image: null }]
      }]);
      setCurrentVariationIndex(0);
      setDescription('');
      setServings('4');
      setTags([]);
      setBannerImage(null);
      setIngredients([{ id: 1, name: '', amount: '', unit: 'g', image: null }]);
      setStages([{ id: 1, text: '', image: null }]);
      
      // Initialize lastSavedDataRef for auto-save
      lastSavedDataRef.current = JSON.stringify({
        name: 'Untitled Recipe',
        variations: [{
          name: 'Original',
          description: '',
          servings: 4,
          tags: [],
          bannerImage: null,
          ingredients: [{ id: 1, name: '', amount: '', unit: 'g', image: null }],
          stages: [{ id: 1, text: '', image: null }]
        }]
      });
      setAutoSaveStatus('saved');
      
      // Add to local state
      setRecipes(prev => [{
        id: mockId,
        name: 'Untitled Recipe',
        variations: [{
          id: `${mockId}-v1`,
          name: 'Original',
          description: '',
          servings: 4,
          tags: [],
          bannerImage: null,
          ingredients: [{ id: 1, name: '', amount: '', unit: 'g', image: null }],
          stages: [{ id: 1, text: '', image: null }]
        }],
        updated: 'just now',
        isMock: true
      }, ...prev]);
      
      window.history.pushState({ view: 'edit' }, '', window.location.pathname);
      setCurrentView('edit');
      return;
    }
    
    // Create a blank recipe immediately so auto-save works
    try {
      const result = await api.createRecipe({
        name: 'Untitled Recipe',
        description: '',
        servings: 4,
        tags: [],
        bannerImage: null,
        ingredients: [],
        stages: []
      }, userCode);
      
      setEditingId(result.id);
      setRecipeName('Untitled Recipe');
      setVariations([{
        id: null,
        name: 'Original',
        description: '',
        servings: 4,
        tags: [],
        bannerImage: null,
        ingredients: [{ id: 1, name: '', amount: '', unit: 'g', image: null }],
        stages: [{ id: 1, text: '', image: null }]
      }]);
      
      // Initialize lastSavedDataRef for auto-save
      lastSavedDataRef.current = JSON.stringify({
        name: 'Untitled Recipe',
        variations: [{
          name: 'Original',
          description: '',
          servings: 4,
          tags: [],
          bannerImage: null,
          ingredients: [{ id: 1, name: '', amount: '', unit: 'g', image: null }],
          stages: [{ id: 1, text: '', image: null }]
        }]
      });
      setAutoSaveStatus('saved');
      
      // Add to local state
      setRecipes(prev => [{
        id: result.id,
        name: 'Untitled Recipe',
        variations: [],
        updated: 'just now'
      }, ...prev]);
      
      window.history.pushState({ view: 'edit' }, '', window.location.pathname);
      setCurrentView('edit');
    } catch (error) {
      console.error('Failed to create recipe:', error);
    }
  };

  // Load a specific variation's data into the form fields
  const loadVariationData = (variation) => {
    setDescription(variation.description || '');
    setServings(String(variation.servings || 4));
    setTags(variation.tags || []);
    setIngredients(variation.ingredients?.length ? variation.ingredients.map((ing, i) => ({ ...ing, id: ing.id || i + 1 })) : [{ id: 1, name: '', amount: '', unit: 'g', image: null }]);
    setStages(variation.stages?.length ? variation.stages.map((st, i) => ({ ...st, id: st.id || i + 1 })) : [{ id: 1, text: '', image: null }]);
    setBannerImage(variation.bannerImage || null);
    const tr = variation.translation;
    if (Array.isArray(tr) && tr.length > 0) {
      setTranslations(tr);
    } else if (tr && tr.langName) {
      setTranslations([tr]); // backward compat: migrate old single-object format
    } else {
      setTranslations([]);
    }
    setEditingTranslationIndex(null);
  };

  const openExisting = (r, variationIndex = 0) => {
    setEditingId(r.id);
    setRecipeName(r.name);
    setIsPublished(r.isPublished || false);
    setViewTranslationIndex(null);

    // If this is a search result pointing to a specific variation
    const startIndex = r.openVariationIndex !== undefined ? r.openVariationIndex : variationIndex;
    
    // Set up variations
    if (r.variations && r.variations.length > 0) {
      setVariations(r.variations);
      setCurrentVariationIndex(startIndex);
      loadVariationData(r.variations[startIndex]);
    } else {
      // Legacy recipe without variations - create a default "Original" variation
      const defaultVariation = {
        id: null,
        name: 'Original',
        description: r.description || '',
        servings: r.servings || 4,
        tags: r.tags || [],
        bannerImage: r.bannerImage || null,
        ingredients: r.ingredients || [],
        stages: r.stages || []
      };
      setVariations([defaultVariation]);
      setCurrentVariationIndex(0);
      loadVariationData(defaultVariation);
    }
    
    window.history.pushState({ view: 'view', recipeId: r.id }, '', window.location.pathname);
    setCurrentView('view');
  };

  // Switch to a different variation
  const switchVariation = (index) => {
    // Save current variation data first (including translation)
    const updatedVariations = [...variations];
    updatedVariations[currentVariationIndex] = {
      ...updatedVariations[currentVariationIndex],
      description,
      servings: parseInt(servings) || 4,
      tags,
      bannerImage,
      ingredients: filteredIngredients.length > 0 ? filteredIngredients : ingredients,
      stages: filteredStages.length > 0 ? filteredStages : stages,
      translation: translations.length > 0 ? translations : null
    };
    setVariations(updatedVariations);
    setEditingTranslationIndex(null);
    setViewTranslationIndex(null);

    // Load new variation
    setCurrentVariationIndex(index);
    loadVariationData(updatedVariations[index]);
  };

  // Get current variation with updated form data
  const getCurrentVariationData = () => ({
    ...variations[currentVariationIndex],
    description,
    servings: parseInt(servings) || 4,
    tags,
    bannerImage,
    ingredients: filteredIngredients,
    stages: filteredStages,
    translation: translations.length > 0 ? translations : null
  });

  // Helper: Upload base64 images and return URL (or keep existing URL)
  const processImage = async (imageData) => {
    if (!imageData) return null;
    if (api.isBase64Image(imageData)) {
      try {
        return await api.uploadBase64Image(imageData);
      } catch (err) {
        console.error('Failed to upload image:', err);
        return null; // Don't keep base64 - it causes memory crashes
      }
    }
    return imageData; // Already a URL, keep it
  };

  // Helper: Process all images in a variation (upload base64, keep URLs)
  const processVariationImages = async (variation) => {
    const [processedBanner, processedIngs, processedStages] = await Promise.all([
      // Process banner image
      processImage(variation.bannerImage),
      // Process ingredient images in parallel
      Promise.all((variation.ingredients || []).map(async (ing) => ({
        ...ing,
        image: await processImage(ing.image)
      }))),
      // Process step images in parallel
      Promise.all((variation.stages || []).map(async (stage) => ({
        ...stage,
        image: await processImage(stage.image)
      })))
    ]);
    
    return {
      ...variation,
      bannerImage: processedBanner,
      ingredients: processedIngs,
      stages: processedStages
    };
  };

  const saveRecipe = async (isAutoSave = false) => {
    if (isSaving) return; // Prevent double-save
    if (!editingId) return; // Must have a recipe ID
    
    if (!recipeName.trim()) { 
      if (!isAutoSave) {
        setSaveMessage('Please enter a name'); 
        setTimeout(() => setSaveMessage(''), 2000); 
      }
      return; 
    }
    
    setIsSaving(true);
    setAutoSaveStatus('saving');
    
    // Update current variation with form data before saving
    const updatedVariations = [...variations];
    if (updatedVariations.length > 0) {
      updatedVariations[currentVariationIndex] = {
        ...updatedVariations[currentVariationIndex],
        description: description.trim(),
        servings: parseInt(servings) || 4,
        tags,
        bannerImage,
        ingredients: filteredIngredients,
        stages: filteredStages,
        translation: translations.length > 0 ? translations : null
      };
    }
    
    // For new recipes or recipes without variations, create default variation
    let variationsToSave = updatedVariations.length > 0 ? updatedVariations : [{
      id: null,
      name: 'Original',
      description: description.trim(),
      servings: parseInt(servings) || 4,
      tags,
      bannerImage,
      ingredients: filteredIngredients,
      stages: filteredStages
    }];
    
    try {
      // In dev mode with mock recipes, skip API call
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isMockRecipe = editingId && editingId.toString().startsWith('mock-');
      
      let processedVariations = variationsToSave;
      
      // Only process images when saving to real API (not mock)
      if (!isDev || !isMockRecipe) {
        // Upload any base64 images and replace with URLs before saving
        // This prevents huge payloads that cause memory crashes
        processedVariations = await Promise.all(
          variationsToSave.map(v => processVariationImages(v))
        );
      }
      
      const data = { 
        name: recipeName.trim(),
        variations: processedVariations
      };
      
      let recipeId = editingId;
      
      if (!isDev || !isMockRecipe) {
        // Save to database with processed (URL-only) images
        await api.updateRecipe(editingId, data);
      }
      
      // Update local state with processed variations (URLs instead of base64)
      setRecipes(prev => prev.map(r => 
        r.id === editingId 
          ? { ...r, name: recipeName.trim(), variations: processedVariations, updated: 'just now' }
          : r
      ));
      setVariations(processedVariations);
      
      // Reload custom tags in background (fire and forget - small payload)
      if (!isDev || !isMockRecipe) {
        loadCustomTags();
      }
      
      // Store last saved data for change detection (with processed URLs)
      lastSavedDataRef.current = JSON.stringify({
        name: recipeName.trim(),
        variations: processedVariations
      });
      
      setIsSaving(false);
      setAutoSaveStatus('saved');
      
      if (!isAutoSave) {
        setSaveMessage('Saved!'); 
        setTimeout(() => { 
          setSaveMessage(''); 
          setCurrentView('view'); 
        }, 800);
      }
    } catch (error) {
      console.error('Failed to save recipe:', error);
      setIsSaving(false);
      setAutoSaveStatus('unsaved');
      if (!isAutoSave) {
        setSaveMessage('Error saving');
        setTimeout(() => setSaveMessage(''), 2000);
      }
    }
  };

  // Auto-save effect: debounced save when data changes in edit mode
  React.useEffect(() => {
    // Only auto-save when editing an existing recipe
    if (currentView !== 'edit' || !editingId) return;
    
    // Build current data snapshot
    const currentData = JSON.stringify({
      name: recipeName.trim(),
      variations: variations.map((v, i) => i === currentVariationIndex ? {
        ...v,
        description: description.trim(),
        servings: parseInt(servings) || 4,
        tags,
        bannerImage,
        ingredients: filteredIngredients,
        stages: filteredStages,
        translation: translations.length > 0 ? translations : null
      } : v)
    });
    
    // Skip if no changes or no data yet
    if (!lastSavedDataRef.current || currentData === lastSavedDataRef.current) {
      return;
    }
    
    // Mark as unsaved
    setAutoSaveStatus('unsaved');
    
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set new debounced save (300ms after last change - nearly instant)
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveRecipe(true); // Auto-save
    }, 300);
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [recipeName, description, servings, tags, bannerImage, ingredients, stages, currentView, editingId, variations, currentVariationIndex, translations]);

  // Initialize lastSavedDataRef when entering edit mode
  React.useEffect(() => {
    if (currentView === 'edit' && editingId && variations.length > 0) {
      const currentVar = variations[currentVariationIndex];
      lastSavedDataRef.current = JSON.stringify({
        name: recipeName.trim(),
        variations: variations.map((v, i) => i === currentVariationIndex ? {
          ...v,
          description: description.trim(),
          servings: parseInt(servings) || 4,
          tags,
          bannerImage,
          ingredients: filteredIngredients,
          stages: filteredStages
        } : v)
      });
      setAutoSaveStatus('saved');
    }
  }, [currentView, editingId]);

  const addTag = (t) => { 
    if (t.trim() && !tags.includes(t.trim())) setTags([...tags, t.trim()]); 
    setTagInput(''); 
    setShowSuggestions(false); 
  };
  
  const removeTag = (t) => setTags(tags.filter(x => x !== t));

  // Handle image capture from camera/gallery/GIF - uploads with progress
  // Shared upload helper: uploads a File via XHR with progress tracking
  const uploadFileWithProgress = async (file) => {
    setUploadProgress(0);
    try {
      const url = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('image', file);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const result = JSON.parse(xhr.responseText);
            resolve(result.url);
          } else {
            reject(new Error('Upload failed'));
          }
        };

        xhr.onerror = () => reject(new Error('Upload failed'));

        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });
      setUploadProgress(null);
      return url;
    } catch (error) {
      setUploadProgress(null);
      throw error;
    }
  };

  const handleImageCapture = async (imageData) => {
    if (!captureTarget) return;

    const target = captureTarget;
    setCaptureTarget(null); // Close capture modal immediately

    // If it's base64, upload it with progress
    if (imageData && imageData.startsWith('data:image/')) {
      try {
        // Convert base64 to blob for upload
        const response = await fetch(imageData);
        const blob = await response.blob();
        const extension = imageData.includes('image/gif') ? 'gif' :
                          imageData.includes('image/png') ? 'png' : 'jpg';
        const file = new File([blob], `image.${extension}`, { type: blob.type });

        imageData = await uploadFileWithProgress(file);
      } catch (error) {
        console.error('Failed to upload image:', error);
        imageData = null; // Don't keep base64 - it causes memory crashes
      }
    }

    // Set the image data (URL only, null if upload failed)
    if (target.type === 'banner') {
      setBannerImage(imageData);
    } else if (target.type === 'ingredient') {
      setIngredients(prev => prev.map((ing, i) =>
        i === target.index ? { ...ing, image: imageData } : ing
      ));
    } else if (target.type === 'stage') {
      setStages(prev => prev.map((stage, i) =>
        i === target.index ? { ...stage, image: imageData } : stage
      ));
    }
  };

  // Open image capture modal (mobile shows camera options, desktop shows upload only)
  const openImageCapture = (target) => {
    setCaptureTarget(target);
  };

  // Add a new variation to the current recipe
  const handleAddVariation = useCallback(() => {
    setNewVariationName('');
    setVariationModal(true);
  }, []);

  const confirmAddVariation = async () => {
    if (!newVariationName.trim()) return;
    
    // Save current variation data first
    const updatedVariations = [...variations];
    updatedVariations[currentVariationIndex] = {
      ...updatedVariations[currentVariationIndex],
      description,
      servings: parseInt(servings) || 4,
      tags,
      bannerImage,
      ingredients: filteredIngredients.length > 0 ? filteredIngredients : ingredients,
      stages: filteredStages.length > 0 ? filteredStages : stages
    };
    
    // Create new variation as a copy of current one
    const currentVar = updatedVariations[currentVariationIndex];
    const newVariation = {
      id: null, // Will be assigned by backend
      name: newVariationName.trim(),
      description: currentVar.description,
      servings: currentVar.servings,
      tags: [...(currentVar.tags || [])],
      bannerImage: currentVar.bannerImage,
      ingredients: (currentVar.ingredients || []).map(ing => ({ ...ing, id: null })),
      stages: (currentVar.stages || []).map(st => ({ ...st, id: null }))
    };
    
    updatedVariations.push(newVariation);
    setVariations(updatedVariations);
    setCurrentVariationIndex(updatedVariations.length - 1);
    loadVariationData(newVariation);
    
    setVariationModal(null);
    setNewVariationName('');
  };

  const handleDelete = useCallback((r) => {
    setDeleteModal(r);
  }, []);

  const confirmDelete = async () => {
    if (deleteModal && !isDeleting) {
      try {
        setIsDeleting(true);
        
        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const isMockRecipe = deleteModal.isMock || (deleteModal.id && deleteModal.id.toString().startsWith('mock-'));
        
        if (isDev && isMockRecipe) {
          // For mock recipes in dev mode, just remove from local state
          setRecipes(prev => prev.filter(r => r.id !== deleteModal.id));
        } else if (isDev) {
          // In dev mode, just remove from local state (API might not be available)
          setRecipes(prev => prev.filter(r => r.id !== deleteModal.id));
        } else {
          // For real recipes in production, call the API
          await api.deleteRecipe(deleteModal.id);
          await loadRecipes();
        }
        
        setDeleteModal(null);
      } catch (error) {
        console.error('Failed to delete recipe:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleImageUpload = async (file, callback) => {
    try {
      const url = await uploadFileWithProgress(file);
      callback(url);
    } catch (error) {
      console.error('Failed to upload image:', error);
      callback(null);
    }
  };

  // Build search results - can include variations as separate entries
  const filteredRecipes = React.useMemo(() => {
    if (!searchQuery.trim()) return recipes;
    
    const q = searchQuery.toLowerCase();
    const results = [];
    
    for (const r of recipes) {
      // Check if recipe name matches
      const nameMatches = r.name.toLowerCase().includes(q);
      
      // Check if original/first variation matches
      const firstVariation = r.variations?.[0];
      const originalTagsMatch = firstVariation?.tags?.some(t => t.toLowerCase().includes(q)) || 
                                r.tags?.some(t => t.toLowerCase().includes(q));
      
      if (nameMatches || originalTagsMatch) {
        // Original matches - show the recipe normally
        results.push(r);
      } else {
        // Check other variations (not the first/original)
        const matchingVariations = r.variations?.slice(1).filter(v => 
          v.tags?.some(t => t.toLowerCase().includes(q)) ||
          v.name.toLowerCase().includes(q)
        ) || [];
        
        // Add each matching variation as a "virtual" recipe entry
        for (const v of matchingVariations) {
          results.push({
            ...r,
            // Override display data with variation data
            displayVariation: v,
            description: v.description,
            servings: v.servings,
            tags: v.tags,
            bannerImage: v.bannerImage,
            ingredients: v.ingredients,
            stages: v.stages,
            // Mark which variation to open
            openVariationIndex: r.variations.indexOf(v)
          });
        }
      }
    }
    
    return results;
  }, [recipes, searchQuery]);

  // Cheffinator loader component (reusable)
  const CheffinatorLoader = ({ text = 'Loading...' }) => (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div 
        className="logo-sprite-animation"
        style={{ 
          width: 'clamp(100px, 25vw, 150px)',
          aspectRatio: '8 / 7',
          backgroundImage: 'url(/logo_animation_spritesheet.webp)',
          backgroundSize: '2500% 100%',
          backgroundPosition: '0 0',
          imageRendering: 'crisp-edges',
          margin: '0 auto 16px'
        }}
      />
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{text}</p>
      <style>{`
        .logo-sprite-animation {
          animation: playSprite 2.083s steps(24) infinite;
        }
        @keyframes playSprite {
          to { background-position: -2400% 0; }
        }
      `}</style>
    </div>
  );

  // Version indicator component (reusable) - always top-left, always LTR
  const VersionIndicator = () => (
    <div style={{ 
      position: 'fixed', 
      top: 12, 
      left: 12,
      fontSize: 10, 
      color: 'rgba(255,255,255,0.5)', 
      lineHeight: 1.4,
      zIndex: 1000,
      fontFamily: 'var(--font-sans)',
      direction: 'ltr',
      textAlign: 'left'
    }}>
      <div>{APP_VERSION} <span style={{ fontSize: 8, opacity: 0.7 }}>alpha</span></div>
      <div>{APP_DATE}</div>
    </div>
  );

  // SPLASH SCREEN - show for 8 seconds on app load with fade out
  if (showSplash) {
    return (
      <div 
        className={splashFading ? 'splash-fade-out' : ''}
        style={{ 
          ...styles.page, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          padding: 24,
          background: 'var(--bg-primary)',
          overflow: 'hidden'
        }}>
        {/* Sprite animation - 25 frames */}
        <div 
          className="logo-sprite-animation"
          style={{ 
            width: 'clamp(250px, 60vw, 400px)',
            aspectRatio: '8 / 7',
            backgroundImage: 'url(/logo_animation_spritesheet.webp)',
            backgroundSize: '2500% 100%',
            backgroundPosition: '0 0',
            imageRendering: 'crisp-edges'
          }}
        />
        
        {/* Logo text */}
        <div style={{
          fontFamily: '"Berlin Sans FB", "Berlin Sans FB Demi", Arial Black, sans-serif',
          fontWeight: 700,
          fontSize: 'clamp(28px, 8vw, 48px)',
          color: '#ffffff',
          letterSpacing: '0.05em',
          marginTop: 8,
          textShadow: '0 2px 10px rgba(0,0,0,0.3)'
        }}>
          CHEFFINATOR
        </div>
        
        {/* Tagline */}
        <div style={{
          fontFamily: '"Berlin Sans FB", Arial, sans-serif',
          fontWeight: 400,
          fontSize: 'clamp(14px, 4vw, 20px)',
          color: 'rgba(255,255,255,0.7)',
          marginTop: 8,
          fontStyle: 'italic'
        }}>
          "{splashTagline.current}"
        </div>
        
        {/* Loading bar */}
        <div style={{
          width: 'clamp(200px, 50vw, 280px)',
          height: 4,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 2,
          marginTop: 32,
          overflow: 'hidden'
        }}>
          <div 
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, var(--accent-green-dark), var(--accent-green))',
              borderRadius: 2,
              width: `${loadingPercent}%`,
              transition: 'width 0.05s linear'
            }}
          />
        </div>
        
        {/* Loading percentage */}
        <div style={{
          marginTop: 12,
          fontSize: 14,
          color: 'rgba(255,255,255,0.6)',
          fontFamily: 'var(--font-sans)',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {loadingPercent}%
        </div>
        
        {/* Version */}
        <div style={{ 
          position: 'absolute',
          bottom: 24,
          fontSize: 11,
          color: 'rgba(255,255,255,0.4)',
          fontFamily: 'var(--font-sans)'
        }}>
          {APP_VERSION}
        </div>
        
        {/* Sprite animation keyframes - 25 frames at 12fps = 2.083s */}
        <style>{`
          .logo-sprite-animation {
            animation: playSprite 2.083s steps(24) infinite;
          }
          @keyframes playSprite {
            to { background-position: -2400% 0; }
          }
          .splash-fade-out {
            animation: fadeOut 1s ease-out forwards;
          }
          @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  // Show loading while fetching a shared recipe or profile
  if ((window.location.pathname.startsWith('/r/') || window.location.pathname.startsWith('/u/')) && loading) {
    return (
      <div style={{ 
        ...styles.page, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: 24
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>🍳</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
            {window.location.pathname.startsWith('/u/') ? 'Loading profile...' : 'Loading recipe...'}
          </p>
        </div>
      </div>
    );
  }

  // LOGIN SCREEN - show when no user code (but skip if viewing a public recipe or profile)
  if (!userCode && !isPublicView && !window.location.pathname.startsWith('/r/') && !window.location.pathname.startsWith('/u/')) {
    return (
      <div 
        className={appFadingIn ? 'app-fade-in' : ''} 
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{ 
          ...styles.page, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: 24
        }}
      >
        {/* Language toggle */}
        <button
          onClick={toggleLanguage}
          style={{
            position: 'fixed',
            top: 16,
            right: isRTL ? 'auto' : 16,
            left: isRTL ? 16 : 'auto',
            padding: '8px 14px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 14,
            fontFamily: 'var(--font-sans)',
            zIndex: 100
          }}
        >
          {lang === 'en' ? 'עב' : 'EN'}
        </button>
        <VersionIndicator />
        <div style={{ 
          maxWidth: 400, 
          width: '100%', 
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>🍳</div>
          <h1 style={{ fontSize: 36, fontWeight: 600, margin: '0 0 12px', letterSpacing: '-0.5px' }}>
            {t('appName')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 40, fontSize: 16 }}>
            {t('whatsYourName')}
          </p>
          
          <div style={{ ...styles.surface, padding: 24 }}>
            <input
              style={{
                width: '100%',
                padding: '16px 20px',
                fontSize: 18,
                background: 'var(--bg-tertiary)',
                border: loginError ? '1px solid var(--accent-red)' : '1px solid var(--border-color)',
                borderRadius: 12,
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
                textAlign: 'center',
                fontFamily: 'var(--font-sans)'
              }}
              placeholder={t('enterName')}
              value={loginInput}
              onChange={e => { setLoginInput(e.target.value); setLoginError(''); }}
              onKeyDown={e => e.key === 'Enter' && !loginLoading && handleLogin(loginInput)}
              autoFocus
              disabled={loginLoading}
            />
            
            {loginError && (
              <p style={{ 
                color: 'var(--accent-red)', 
                margin: '12px 0 0', 
                fontSize: 14 
              }}>
                {loginError}
              </p>
            )}
            
            <button
              style={{
                ...styles.btnPrimary,
                width: '100%',
                marginTop: 16,
                padding: '14px 20px',
                fontSize: 16,
                opacity: loginLoading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
              onClick={() => handleLogin(loginInput)}
              disabled={!loginInput.trim() || loginLoading}
            >
              {loginLoading && (
                <span style={{
                  width: 16,
                  height: 16,
                  border: '2px solid rgba(0,0,0,0.2)',
                  borderTopColor: 'var(--bg-primary)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
              )}
              {loginLoading ? t('checking') : t('continue')}
            </button>
          </div>
          
          <p style={{ color: 'var(--text-muted)', marginTop: 32, fontSize: 13 }}>
            {t('alphaAccess')}
          </p>
        </div>
      </div>
    );
  }

  // PUBLIC PROFILE VIEW - shows all recipes for a user (read-only)
  if (currentView === 'profile' && isPublicView && publicProfile) {
    return (
      <div style={styles.page}>
        <VersionIndicator />
        
        <header style={{ ...styles.header, justifyContent: 'center' }}>
          <h1 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 600, margin: 0, letterSpacing: '-0.5px' }}>
            Cheffinator
          </h1>
        </header>
        
        <main style={styles.main}>
          {/* Profile Header */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, var(--accent-green-dark), var(--accent-green))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: 32,
              fontWeight: 700,
              color: 'var(--bg-primary)'
            }}>
              {publicProfile.userCode.charAt(0).toUpperCase()}
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 8px' }}>
              {publicProfile.userCode}'s Recipes
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
              {publicProfile.recipeCount} {publicProfile.recipeCount === 1 ? 'recipe' : 'recipes'}
            </p>
          </div>
          
          {/* Recipe Grid */}
          {publicProfile.recipes.length === 0 ? (
            <div style={{ ...styles.surface, textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🍳</div>
              <p>No recipes yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {publicProfile.recipes.map(recipe => (
                <div 
                  key={recipe.id}
                  style={{ 
                    ...styles.card, 
                    cursor: 'pointer'
                  }}
                  onClick={() => openPublicRecipe(recipe)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-green)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <div style={{ 
                    width: 60, 
                    height: 60, 
                    borderRadius: 12, 
                    background: recipe.bannerImage ? `url(${recipe.bannerImage}) center/cover` : 'var(--bg-tertiary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: 26, 
                    flexShrink: 0 
                  }}>
                    {!recipe.bannerImage && '🍽️'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 4 }}>{recipe.name}</div>
                    {recipe.description && (
                      <div style={{ 
                        fontSize: 13, 
                        color: 'var(--text-muted)', 
                        fontFamily: 'var(--font-sans)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {recipe.description}
                      </div>
                    )}
                    {recipe.tags && recipe.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {recipe.tags.slice(0, 3).map(tag => (
                          <span key={tag} style={styles.tag}>{tag}</span>
                        ))}
                        {recipe.tags.length > 3 && (
                          <span style={{ ...styles.tag, background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                            +{recipe.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Icon type="chevronRight" />
                </div>
              ))}
            </div>
          )}
          
          {/* Back to Login */}
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <button 
              style={{ ...styles.btn, margin: '0 auto' }}
              onClick={() => {
                window.history.pushState({}, '', '/');
                setIsPublicView(false);
                setPublicProfile(null);
                setCurrentView('dashboard');
              }}
            >
              <Icon type="back" /> Back to Cheffinator
            </button>
          </div>
        </main>
      </div>
    );
  }

  // HOMEPAGE VIEW - Discover recipes from all users
  if (currentView === 'home') {
    return (
      <div className={appFadingIn ? 'app-fade-in' : ''} dir={isRTL ? 'rtl' : 'ltr'} style={styles.page}>
        <VersionIndicator />
        
        <header style={{ ...styles.header, justifyContent: 'space-between', direction: 'ltr' }}>
          {/* Language toggle - pushed right to avoid version indicator */}
          <button
            onClick={toggleLanguage}
            style={{
              padding: '8px 14px',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 14,
              fontFamily: 'var(--font-sans)',
              minWidth: 'clamp(40px, 10vw, 60px)',
              marginLeft: 65
            }}
          >
            {lang === 'en' ? 'עב' : 'EN'}
          </button>
          
          <h1 
            onClick={loadDiscoverRecipes}
            style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 600, margin: 0, letterSpacing: '-0.5px', textAlign: 'center', cursor: 'pointer' }}
          >
            {t('appName')}
          </h1>
          
          {/* User indicator */}
          <div style={{ 
            position: 'relative', 
            display: 'flex', 
            alignItems: 'stretch',
            background: 'transparent',
            borderRadius: 10,
            border: '1px solid var(--border-color)'
          }}>
            <button
              onClick={() => {
                window.history.pushState({ view: 'dashboard' }, '', window.location.pathname);
                setCurrentView('dashboard');
              }}
              style={{ 
                background: 'transparent',
                border: 'none',
                padding: 'clamp(6px, 1.5vw, 8px) clamp(8px, 2vw, 12px)',
                display: 'flex',
                alignItems: 'center',
                gap: 'clamp(4px, 1vw, 8px)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)'
              }}
            >
              <span style={{ 
                width: 'clamp(24px, 5vw, 28px)', 
                height: 'clamp(24px, 5vw, 28px)', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, var(--accent-green-dark), var(--accent-green))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--bg-primary)',
                fontSize: 'clamp(10px, 2vw, 12px)',
                fontWeight: 700,
                flexShrink: 0
              }}>
                {userCode?.charAt(0).toUpperCase()}
              </span>
              <span className="hide-on-mobile" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{userCode}</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }}
              style={{ 
                background: 'transparent',
                border: 'none',
                borderLeft: '1px solid var(--border-color)',
                padding: '0 clamp(8px, 1.5vw, 12px)',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>▼</span>
            </button>
            
            {showUserMenu && (
              <div 
                style={{ 
                  position: 'absolute', 
                  top: '100%', 
                  right: 0, 
                  marginTop: 8,
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 12, 
                  padding: 6,
                  minWidth: 160,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  zIndex: 100
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ 
                  padding: '10px 14px', 
                  borderBottom: '1px solid var(--border-color)',
                  marginBottom: 6
                }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{t('loggedInAs')}</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{userCode}</div>
                </div>
                <button
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    color: 'var(--text-secondary)',
                    fontSize: 14,
                    fontFamily: 'var(--font-sans)',
                    cursor: 'pointer',
                    textAlign: isRTL ? 'right' : 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                  onClick={() => { 
                    window.history.pushState({ view: 'dashboard' }, '', window.location.pathname);
                    setCurrentView('dashboard'); 
                    setShowUserMenu(false); 
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  📖 {t('myRecipes')}
                </button>
                <button
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    color: 'var(--accent-red)',
                    fontSize: 14,
                    fontFamily: 'var(--font-sans)',
                    cursor: 'pointer',
                    textAlign: isRTL ? 'right' : 'left'
                  }}
                  onClick={handleLogout}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {t('logOut')}
                </button>
              </div>
            )}
          </div>
        </header>
        
        <main style={styles.main}>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24, textAlign: 'center' }}>
            {t('randomRecipes')}
          </p>
          
          {discoverLoading ? (
            <CheffinatorLoader text={t('loadingDelicious')} />
          ) : discoverRecipes.length === 0 ? (
            <div style={{ ...styles.surface, textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🍽️</div>
              <p>{t('noSharedRecipes')}</p>
              <p style={{ fontSize: 14, marginTop: 8 }}>{t('beFirstToShare')}</p>
            </div>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {discoverRecipes.map(recipe => (
                <li 
                  key={recipe.id}
                  style={{ 
                    marginBottom: 12,
                    padding: '18px 20px',
                    background: 'var(--bg-secondary)', 
                    borderRadius: 12, 
                    border: '1px solid var(--border-color)', 
                    cursor: 'pointer',
                    display: 'flex',
                    gap: 16,
                    alignItems: 'center',
                    transition: 'border-color 0.2s'
                  }}
                  onClick={async () => {
                    // Check if this is a mock recipe with full data
                    const hasMockData = recipe.variations && recipe.variations.length > 0 &&
                                        recipe.variations[0].ingredients && recipe.variations[0].ingredients.length > 0;

                    if (hasMockData) {
                      // Use mock data directly
                      setPublicRecipe(recipe);
                      setIsPublicView(true);
                      setRecipeName(recipe.name);
                      setVariations(recipe.variations);
                      setCurrentVariationIndex(0);
                      setViewTranslationIndex(null);
                      loadVariationData(recipe.variations[0]);
                      window.history.pushState({ view: 'view', fromDiscover: true }, '', window.location.pathname);
                      setCurrentView('view');
                    } else if (recipe.id) {
                      // Fetch full recipe data using recipe ID
                      try {
                        setLoading(true);
                        const data = await api.fetchRecipe(recipe.id);
                        setPublicRecipe(data);
                        setIsPublicView(true);
                        if (data.variations && data.variations.length > 0) {
                          setRecipeName(data.name);
                          setVariations(data.variations);
                          setCurrentVariationIndex(0);
                          setViewTranslationIndex(null);
                          loadVariationData(data.variations[0]);
                        }
                        window.history.pushState({ view: 'view', fromDiscover: true }, '', window.location.pathname);
                        setCurrentView('view');
                      } catch (error) {
                        console.error('Failed to load recipe:', error);
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-green)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <div style={{ 
                    width: 70, 
                    height: 70, 
                    borderRadius: 12, 
                    background: recipe.bannerImage ? `url(${recipe.bannerImage}) center/cover` : 'var(--bg-tertiary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: 28, 
                    flexShrink: 0 
                  }}>
                    {!recipe.bannerImage && '🍽️'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 4 }}>{recipe.name}</div>
                    <div style={{ fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{t('by')} </span>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{recipe.userCode}</span>
                    </div>
                    {recipe.tags && recipe.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {recipe.tags.slice(0, 3).map(tag => (
                          <span key={tag} style={{ 
                            display: 'inline-block', 
                            padding: '2px 8px', 
                            background: 'rgba(74,222,128,0.15)', 
                            borderRadius: 20, 
                            fontSize: 11, 
                            color: 'var(--accent-green)' 
                          }}>{tTag(tag)}</span>
                        ))}
                        {recipe.tags.length > 3 && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{recipe.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          
          {/* Refresh button */}
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button
              onClick={loadDiscoverRecipes}
              disabled={discoverLoading}
              style={{ 
                ...styles.btn, 
                padding: '12px 24px',
                opacity: discoverLoading ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              {discoverLoading ? (
                <span style={{
                  width: 16,
                  height: 16,
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderTopColor: 'var(--text-primary)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
              ) : '🎲'}
              {discoverLoading ? 'Loading...' : 'Show Different Recipes'}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // DASHBOARD VIEW
  if (currentView === 'dashboard') {
    return (
      <div className={appFadingIn ? 'app-fade-in' : ''} dir={isRTL ? 'rtl' : 'ltr'} style={styles.page}>
        <VersionIndicator />
        
        <header style={{ ...styles.header, justifyContent: 'space-between', direction: 'ltr' }}>
          {/* Language toggle - pushed right to avoid version indicator */}
          <button
            onClick={toggleLanguage}
            style={{
              padding: '8px 14px',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 14,
              fontFamily: 'var(--font-sans)',
              marginLeft: 65
            }}
          >
            {lang === 'en' ? 'עב' : 'EN'}
          </button>
          
          <h1 
            onClick={() => {
              window.history.pushState({ view: 'home' }, '', window.location.pathname);
              setCurrentView('home');
            }}
            style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 600, margin: 0, letterSpacing: '-0.5px', textAlign: 'center', cursor: 'pointer' }}
          >
            {t('appName')}
          </h1>
          
          {/* User indicator */}
          <div style={{ 
            position: 'relative', 
            display: 'flex', 
            alignItems: 'stretch',
            background: 'transparent',
            borderRadius: 10,
            border: '1px solid var(--border-color)'
          }}>
            <button
              onClick={() => {
                window.history.pushState({ view: 'home' }, '', window.location.pathname);
                setCurrentView('home');
              }}
              style={{ 
                background: 'transparent',
                border: 'none',
                padding: 'clamp(6px, 1.5vw, 8px) clamp(8px, 2vw, 12px)',
                display: 'flex',
                alignItems: 'center',
                gap: 'clamp(4px, 1vw, 8px)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)'
              }}
            >
              <span style={{ 
                width: 'clamp(24px, 5vw, 28px)', 
                height: 'clamp(24px, 5vw, 28px)', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, var(--accent-green-dark), var(--accent-green))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--bg-primary)',
                fontSize: 'clamp(10px, 2vw, 12px)',
                fontWeight: 700,
                flexShrink: 0
              }}>
                {userCode.charAt(0).toUpperCase()}
              </span>
              <span className="hide-on-mobile" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{userCode}</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }}
              style={{ 
                background: 'transparent',
                border: 'none',
                borderLeft: '1px solid var(--border-color)',
                padding: '0 clamp(8px, 1.5vw, 12px)',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>▼</span>
            </button>
            
            {showUserMenu && (
              <div 
                style={{ 
                  position: 'absolute', 
                  top: '100%', 
                  right: 0, 
                  marginTop: 8,
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 12, 
                  padding: 6,
                  minWidth: 160,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  zIndex: 100
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ 
                  padding: '10px 14px', 
                  borderBottom: '1px solid var(--border-color)',
                  marginBottom: 6
                }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{t('loggedInAs')}</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{userCode}</div>
                </div>
                <button
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    color: 'var(--text-secondary)',
                    fontSize: 14,
                    fontFamily: 'var(--font-sans)',
                    cursor: 'pointer',
                    textAlign: isRTL ? 'right' : 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                  onClick={() => { setProfileShareModal(true); setShowUserMenu(false); }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Icon type="share" /> {t('shareProfile')}
                </button>
                <button
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    color: 'var(--accent-red)',
                    fontSize: 14,
                    fontFamily: 'var(--font-sans)',
                    cursor: 'pointer',
                    textAlign: isRTL ? 'right' : 'left'
                  }}
                  onClick={handleLogout}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {t('logOut')}
                </button>
              </div>
            )}
          </div>
        </header>
        
        <main style={styles.main}>
          <h2 style={{ 
            fontSize: 12, 
            fontWeight: 600, 
            color: 'var(--text-secondary)', 
            textTransform: 'uppercase', 
            letterSpacing: 2, 
            marginBottom: 16, 
            fontFamily: 'var(--font-sans)' 
          }}>
            {t('yourRecipes')}
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
              placeholder={t('searchPlaceholder')} 
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
            <CheffinatorLoader text={t('loadingRecipes')} />
          ) : (
            <>
              <button 
                style={{ 
                  ...styles.card, 
                  borderStyle: 'dashed',
                  borderColor: 'var(--accent-green)',
                  background: 'transparent',
                  justifyContent: 'center',
                  width: '100%',
                  textAlign: isRTL ? 'right' : 'left',
                  fontFamily: 'inherit'
                }} 
                onClick={openNew}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ 
                  width: 60, 
                  height: 60, 
                  borderRadius: 12, 
                  background: 'var(--accent-green)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  flexShrink: 0 
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--accent-green)' }}>
                    {t('addRecipe')}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
                    {t('createNewRecipe')}
                  </div>
                </div>
              </button>
              {filteredRecipes.length === 0 && recipes.length > 0 ? (
                <div style={{ ...styles.surface, textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  {t('noRecipesMatch')}
                </div>
              ) : (
                filteredRecipes.map((r, idx) => (
              <div 
                key={r.displayVariation ? `${r.id}-${r.displayVariation.id}` : r.id} 
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
                  <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {r.name}
                    {r.displayVariation ? (
                      <span style={{ 
                        fontSize: 11, 
                        fontWeight: 500, 
                        background: 'rgba(74, 222, 128, 0.15)', 
                        color: 'var(--accent-green)', 
                        padding: '3px 10px', 
                        borderRadius: 10, 
                        fontFamily: 'var(--font-sans)'
                      }}>
                        {r.displayVariation.name}
                      </span>
                    ) : r.variations && r.variations.length > 1 && !searchQuery.trim() && (
                      <span style={{ 
                        fontSize: 11, 
                        fontWeight: 500, 
                        background: 'rgba(74, 222, 128, 0.15)', 
                        color: 'var(--accent-green)', 
                        padding: '3px 10px', 
                        borderRadius: 10, 
                        fontFamily: 'var(--font-sans)'
                      }}>
                        {r.variations.length} variations
                      </span>
                    )}
                  </div>
                  <div>
                    {r.tags?.map(t => <span key={t} style={styles.tag}>{t}</span>)}
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>{r.updated}</span>
                  </div>
                </div>
                <div style={{ position: 'relative' }}>
                  <button 
                    style={{ 
                      background: openMenuId === r.id ? 'var(--bg-tertiary)' : 'transparent', 
                      border: 'none', 
                      color: 'var(--text-secondary)', 
                      opacity: 0.7, 
                      cursor: 'pointer', 
                      padding: 8, 
                      borderRadius: 6,
                      transition: 'all 0.15s ease'
                    }} 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setOpenMenuId(openMenuId === r.id ? null : r.id); 
                    }}
                    title="More options"
                  >
                    <Icon type="more" />
                  </button>
                  {openMenuId === r.id && (
                    <div 
                      style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        right: 0, 
                        marginTop: 4,
                        background: 'var(--bg-secondary)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: 12, 
                        padding: 6,
                        minWidth: 140,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        zIndex: 50
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 8,
                          color: 'var(--accent-red)',
                          fontSize: 14,
                          fontFamily: 'var(--font-sans)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          textAlign: 'left'
                        }}
                        onClick={() => { 
                          handleDelete(r); 
                          setOpenMenuId(null);
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Icon type="trash" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
                ))
              )}
            </>
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
                <button style={styles.btn} onClick={() => setDeleteModal(null)} disabled={isDeleting}>Cancel</button>
                <button 
                  style={{ ...styles.btnPrimary, background: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: 8, opacity: isDeleting ? 0.7 : 1 }} 
                  onClick={confirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting && (
                    <span style={{
                      width: 16,
                      height: 16,
                      border: '2px solid rgba(0,0,0,0.2)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                  )}
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Share Modal */}
        {profileShareModal && (
          <div 
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} 
            onClick={() => setProfileShareModal(false)}
          >
            <div 
              style={{ background: 'var(--bg-secondary)', borderRadius: 20, padding: 32, maxWidth: 440, width: '90%', border: '1px solid var(--border-color)' }} 
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600 }}>Share Your Profile</h3>
              <p style={{ margin: '0 0 24px', color: 'var(--text-muted)', fontSize: 14 }}>
                Anyone with this link can view all your recipes (read-only).
              </p>
              
              <div style={{ 
                background: 'var(--bg-tertiary)', 
                borderRadius: 12, 
                padding: '14px 16px', 
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                <Icon type="link" />
                <code style={{ 
                  flex: 1, 
                  fontSize: 14, 
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {window.location.origin}/u/{userCode}
                </code>
              </div>
              
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button style={styles.btn} onClick={() => setProfileShareModal(false)}>Close</button>
                <button 
                  style={{ ...styles.btnPrimary, display: 'flex', alignItems: 'center', gap: 8 }}
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/u/${userCode}`);
                    setProfileShareModal(false);
                  }}
                >
                  <Icon type="copy" /> Copy Link
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // COOKING MODE - Fully responsive
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
        zIndex: 1000,
        overflow: 'hidden'
      }}>
        {/* Header - compact on mobile */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: 'clamp(12px, 2vw, 16px) clamp(16px, 3vw, 24px)', 
          background: 'rgba(0,0,0,0.5)',
          flexShrink: 0
        }}>
          <span style={{ fontSize: 'clamp(12px, 2vw, 14px)', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
            {cookingSlide + 1} / {totalSlides}
          </span>
          <button 
            onClick={exitCookingMode} 
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', 
              borderRadius: 8, 
              padding: 'clamp(6px, 1.5vw, 8px)', 
              cursor: 'pointer', 
              color: 'var(--text-secondary)', 
              display: 'flex' 
            }}
          >
            <Icon type="close" />
          </button>
        </div>
        
        {/* Content area - responsive padding */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: 'clamp(16px, 4vw, 40px) clamp(16px, 5vw, 80px)', 
          overflow: 'auto',
          minHeight: 0
        }}>
          {/* Slide 0: Recipe intro */}
          {cookingSlide === 0 && (
            <div style={{ textAlign: 'center', maxWidth: 800, width: '100%' }}>
              {bannerImage && (
                <div style={{ 
                  width: 'clamp(120px, 30vw, 220px)', 
                  height: 'clamp(120px, 30vw, 220px)', 
                  borderRadius: '50%', 
                  background: `url(${bannerImage}) center/cover`, 
                  margin: '0 auto clamp(24px, 5vw, 48px)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                }} />
              )}
              <h1 style={{ 
                fontSize: 'clamp(28px, 7vw, 80px)', 
                fontWeight: 600, 
                margin: '0 0 clamp(12px, 2vw, 24px)', 
                letterSpacing: '-1px',
                lineHeight: 1.1
              }}>
                {recipeName}
              </h1>
              {description && (
                <p style={{ 
                  fontSize: 'clamp(14px, 3vw, 26px)', 
                  color: 'var(--text-secondary)', 
                  margin: '0 0 clamp(24px, 5vw, 48px)', 
                  lineHeight: 1.5 
                }}>
                  {description}
                </p>
              )}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: 'clamp(16px, 4vw, 40px)', 
                fontSize: 'clamp(12px, 2.5vw, 20px)', 
                color: 'var(--text-muted)', 
                fontFamily: 'var(--font-sans)',
                flexWrap: 'wrap'
              }}>
                <span><strong style={{ color: 'var(--accent-green)' }}>{servings}</strong> servings</span>
                <span><strong style={{ color: 'var(--accent-green)' }}>{filteredIngredients.length}</strong> ingredients</span>
                <span><strong style={{ color: 'var(--accent-green)' }}>{filteredStages.length}</strong> steps</span>
              </div>
            </div>
          )}
          
          {/* Slide 1: Ingredients */}
          {cookingSlide === 1 && (
            <div style={{ maxWidth: 900, width: '100%', padding: '0 clamp(8px, 2vw, 20px)' }}>
              <h2 style={{ 
                fontSize: 'clamp(12px, 2vw, 18px)', 
                fontWeight: 600, 
                color: 'var(--accent-green)', 
                textTransform: 'uppercase', 
                letterSpacing: 'clamp(2px, 0.5vw, 4px)', 
                marginBottom: 'clamp(24px, 5vw, 50px)', 
                textAlign: 'center', 
                fontFamily: 'var(--font-sans)' 
              }}>
                Ingredients
              </h2>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: `repeat(auto-fit, minmax(clamp(140px, 25vw, ${filteredIngredients.some(i => i.image) ? '200px' : '280px'}), 1fr))`,
                gap: 'clamp(12px, 2vw, 20px)',
                justifyContent: 'center'
              }}>
                {filteredIngredients.map((ing) => (
                  <div key={ing.id} style={{ 
                    background: 'linear-gradient(145deg, var(--bg-secondary) 0%, #141414 100%)',
                    borderRadius: 'clamp(10px, 2vw, 16px)',
                    padding: ing.image ? 0 : 'clamp(14px, 3vw, 24px)',
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
                    <div style={{ padding: ing.image ? 'clamp(10px, 2vw, 16px) clamp(12px, 2vw, 20px) clamp(12px, 2vw, 20px)' : '0', textAlign: 'center' }}>
                      <div style={{ 
                        fontSize: 'clamp(14px, 2.5vw, 22px)', 
                        fontWeight: 500,
                        marginBottom: 'clamp(4px, 1vw, 8px)',
                        color: 'var(--text-primary)'
                      }}>{ing.name}</div>
                      <div style={{ 
                        fontSize: 'clamp(12px, 2vw, 18px)',
                        color: 'var(--accent-green)',
                        fontFamily: 'var(--font-sans)',
                        fontWeight: 600,
                        background: 'rgba(74,222,128,0.1)',
                        padding: 'clamp(4px, 1vw, 8px) clamp(8px, 2vw, 16px)',
                        borderRadius: 8,
                        display: 'inline-block'
                      }}>{ing.amount} {ing.unit}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Cooking steps */}
          {cookingSlide >= 2 && filteredStages[cookingSlide - 2] && (
            <div style={{ maxWidth: 800, textAlign: 'center', padding: '0 clamp(8px, 2vw, 20px)' }}>
              <div style={{ 
                width: 'clamp(50px, 12vw, 110px)', 
                height: 'clamp(50px, 12vw, 110px)', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, var(--accent-green-dark), var(--accent-green))', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#0A0A0A', 
                fontSize: 'clamp(20px, 5vw, 48px)', 
                fontWeight: 700, 
                marginBottom: 'clamp(24px, 5vw, 48px)', 
                fontFamily: 'var(--font-sans)',
                boxShadow: '0 15px 50px rgba(74, 222, 128, 0.3)'
              }}>
                {cookingSlide - 1}
              </div>
              <p style={{ 
                fontSize: 'clamp(18px, 4.5vw, 40px)', 
                lineHeight: 1.6, 
                margin: 0, 
                color: '#EEE' 
              }}>
                {filteredStages[cookingSlide - 2].text}
              </p>
              {filteredStages[cookingSlide - 2].image && (
                <img 
                  src={filteredStages[cookingSlide - 2].image} 
                  alt="" 
                  style={{ 
                    marginTop: 'clamp(24px, 5vw, 48px)', 
                    maxWidth: '100%', 
                    maxHeight: 'clamp(150px, 30vh, 40vh)', 
                    borderRadius: 'clamp(12px, 2vw, 20px)', 
                    objectFit: 'contain', 
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)' 
                  }} 
                />
              )}
            </div>
          )}
        </div>
        
        {/* Bottom navigation - responsive and always visible */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: 'clamp(12px, 2.5vw, 24px) clamp(12px, 3vw, 40px)', 
          background: 'rgba(0,0,0,0.7)',
          flexShrink: 0,
          gap: 'clamp(8px, 2vw, 16px)'
        }}>
          <button 
            onClick={() => setCookingSlide(Math.max(0, cookingSlide - 1))} 
            disabled={cookingSlide === 0} 
            style={{ 
              ...styles.btn, 
              padding: 'clamp(10px, 2vw, 16px) clamp(14px, 2.5vw, 28px)', 
              opacity: cookingSlide === 0 ? 0.3 : 1,
              fontSize: 'clamp(12px, 2vw, 14px)',
              whiteSpace: 'nowrap',
              minWidth: 0
            }}
          >
            <Icon type="back" /> <span style={{ display: 'inline' }}>Prev</span>
          </button>
          
          {/* Dot indicators - hide on very small screens, show abbreviated on mobile */}
          <div style={{ 
            display: 'flex', 
            gap: 'clamp(4px, 1vw, 8px)',
            flexShrink: 1,
            overflow: 'hidden',
            justifyContent: 'center'
          }}>
            {totalSlides <= 10 ? (
              Array.from({ length: totalSlides }).map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setCookingSlide(i)} 
                  style={{ 
                    width: i === cookingSlide ? 'clamp(16px, 3vw, 28px)' : 'clamp(6px, 1.2vw, 10px)', 
                    height: 'clamp(6px, 1.2vw, 10px)', 
                    borderRadius: 5, 
                    background: i === cookingSlide ? 'var(--accent-green)' : '#333', 
                    border: 'none', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                  }} 
                />
              ))
            ) : (
              <span style={{ 
                fontSize: 'clamp(11px, 2vw, 14px)', 
                color: 'var(--text-muted)', 
                fontFamily: 'var(--font-sans)' 
              }}>
                {cookingSlide + 1} of {totalSlides}
              </span>
            )}
          </div>
          
          <button 
            onClick={() => setCookingSlide(Math.min(totalSlides - 1, cookingSlide + 1))} 
            disabled={cookingSlide === totalSlides - 1} 
            style={{ 
              ...styles.btnPrimary, 
              padding: 'clamp(10px, 2vw, 16px) clamp(14px, 2.5vw, 28px)', 
              opacity: cookingSlide === totalSlides - 1 ? 0.3 : 1, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'clamp(4px, 1vw, 8px)',
              fontSize: 'clamp(12px, 2vw, 14px)',
              whiteSpace: 'nowrap',
              minWidth: 0
            }}
          >
            <span style={{ display: 'inline' }}>Next</span> <Icon type="chevronRight" />
          </button>
        </div>
      </div>
    );
  }

  // VIEW MODE
  if (currentView === 'view') {
    const currentVariation = variations[currentVariationIndex] || {};
    
    // Handle back button - use browser history
    const handleBack = () => {
      window.history.back();
    };
    
    // Handle share button click
    const handleShare = async () => {
      if (isSharing) return;
      try {
        setIsSharing(true);
        const result = await api.generateShareLink(editingId);
        const shareUrl = `${window.location.origin}/r/${result.shareId}`;
        setShareModal({ recipeId: editingId, shareUrl });
      } catch (error) {
        console.error('Failed to generate share link:', error);
      } finally {
        setIsSharing(false);
      }
    };
    
    // Copy share URL to clipboard
    const copyShareUrl = async () => {
      if (shareModal?.shareUrl) {
        try {
          await navigator.clipboard.writeText(shareModal.shareUrl);
          // Show brief feedback
          const btn = document.getElementById('copy-share-btn');
          if (btn) {
            btn.textContent = t('linkCopied');
            setTimeout(() => { btn.textContent = t('copyLink'); }, 2000);
          }
        } catch (error) {
          console.error('Failed to copy:', error);
        }
      }
    };
    
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} style={styles.page}>
        <header style={{ 
          ...styles.header, 
          position: 'sticky', 
          top: 0, 
          background: 'rgba(13,13,13,0.95)', 
          backdropFilter: 'blur(12px)', 
          zIndex: 100 
        }}>
          <button style={styles.btn} onClick={handleBack}>
            <Icon type="back" /> {isPublicView ? t('appName') : t('back')}
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            {(filteredIngredients.length > 0 || filteredStages.length > 0) && (
              <button 
                style={{ ...styles.btn, color: 'var(--accent-green)', borderColor: 'var(--accent-green)' }} 
                onClick={startCookingMode}
              >
                <Icon type="play" /> Cook
              </button>
            )}
            {!isPublicView && (
              <>
                <button 
                  style={{ ...styles.btn, color: 'var(--accent-orange)', borderColor: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: 6, opacity: isSharing ? 0.7 : 1 }} 
                  onClick={handleShare}
                  disabled={isSharing}
                >
                  {isSharing ? (
                    <span style={{
                      width: 14,
                      height: 14,
                      border: '2px solid rgba(255,165,0,0.2)',
                      borderTopColor: 'var(--accent-orange)',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                  ) : <Icon type="share" />}
                  {isSharing ? t('sharing') : t('share')}
                </button>
                <button style={{ ...styles.btnPrimary, display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => {
                    window.history.pushState({ view: 'edit' }, '', window.location.pathname);
                    setCurrentView('edit');
                  }}>
                  <Icon type="edit" /> {t('edit')}
                </button>
              </>
            )}
          </div>
        </header>
        
        {/* Variation Tabs */}
        {variations.length > 0 && (
          <div style={{ 
            display: 'flex', 
            gap: 0, 
            padding: '0 24px', 
            maxWidth: 680, 
            margin: '0 auto',
            borderBottom: '1px solid var(--border-color)',
            overflowX: 'auto'
          }}>
            {variations.map((v, i) => (
              <button
                key={v.id || i}
                onClick={() => switchVariation(i)}
                style={{
                  padding: '14px 20px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: i === currentVariationIndex ? '2px solid var(--accent-green)' : '2px solid transparent',
                  color: i === currentVariationIndex ? 'var(--accent-green)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  fontWeight: i === currentVariationIndex ? 600 : 400,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease'
                }}
              >
                {v.name}
              </button>
            ))}
            {!isPublicView && (
              <button
                onClick={handleAddVariation}
                style={{
                  padding: '14px 16px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
                title="Add variation"
              >
                <Icon type="plus" /> Add
              </button>
            )}
          </div>
        )}

        {/* Language toggle buttons */}
        {translations.length > 0 && (
          <div style={{ display: 'flex', gap: 8, padding: '10px 24px', maxWidth: 680, margin: '0 auto', flexWrap: 'wrap' }}>
            <button
              onClick={() => setViewTranslationIndex(null)}
              style={{
                padding: '7px 18px',
                background: viewTranslationIndex === null ? 'rgba(74,222,128,0.15)' : 'transparent',
                border: viewTranslationIndex === null ? '1px solid var(--accent-green)' : '1px solid var(--border-color)',
                borderRadius: 20,
                color: viewTranslationIndex === null ? 'var(--accent-green)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: viewTranslationIndex === null ? 600 : 400
              }}
            >
              Original
            </button>
            {translations.map((tr, i) => (
              <button
                key={i}
                onClick={() => setViewTranslationIndex(i)}
                style={{
                  padding: '7px 18px',
                  background: viewTranslationIndex === i ? 'rgba(74,222,128,0.15)' : 'transparent',
                  border: viewTranslationIndex === i ? '1px solid var(--accent-green)' : '1px solid var(--border-color)',
                  borderRadius: 20,
                  color: viewTranslationIndex === i ? 'var(--accent-green)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  fontWeight: viewTranslationIndex === i ? 600 : 400
                }}
              >
                {tr.langName || `Language ${i + 1}`}
              </button>
            ))}
          </div>
        )}

        <main style={{ maxWidth: 680, margin: '0 auto', padding: '0 24px 80px' }}>
          {/* Recipe content - auto-detect language direction */}
          {(() => {
            const activeTr = viewTranslationIndex !== null ? translations[viewTranslationIndex] : null;
            const displayName = activeTr?.name || recipeName;
            const displayDesc = activeTr?.description || description;
            const contentIsHebrew = activeTr
              ? [activeTr.name, activeTr.description, activeTr.ingredients?.[0]?.name, activeTr.stages?.[0]?.text].filter(Boolean).some(isHebrewText)
              : isRecipeHebrew();
            return (
          <div dir={contentIsHebrew ? 'rtl' : 'ltr'} style={{
            width: 'calc(100% + 48px)',
            marginLeft: contentIsHebrew ? 0 : -24,
            marginRight: contentIsHebrew ? -24 : 0,
            height: bannerImage ? 300 : 200,
            background: bannerImage
              ? `linear-gradient(to top, rgba(13,13,13,1) 0%, rgba(13,13,13,0.4) 50%, rgba(13,13,13,0.1) 100%), url(${bannerImage}) center/cover`
              : 'linear-gradient(to bottom, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '48px 24px 36px',
            textAlign: contentIsHebrew ? 'right' : 'left'
          }}>
            <h1 style={{ fontSize: 40, fontWeight: 600, margin: 0, marginBottom: displayDesc ? 14 : 0, letterSpacing: '-0.5px' }}>
              {displayName || t('untitled')}
            </h1>
            {displayDesc && <p style={{ fontSize: 17, color: '#999', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{displayDesc}</p>}
          </div>
            );
          })()}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '28px 0 36px', borderBottom: '1px solid var(--bg-secondary)', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
              <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{servings}</span> {t('servings')}
            </span>
            {tags.map(tag => (
              <span key={tag} style={{ padding: '7px 16px', background: 'rgba(74,222,128,0.1)', borderRadius: 20, fontSize: 13, color: 'var(--accent-green)', fontFamily: 'var(--font-sans)' }}>
                {tTag(tag)}
              </span>
            ))}
          </div>
          
          {filteredIngredients.length > 0 && (
            <section dir={isRecipeHebrew() ? 'rtl' : 'ltr'} style={{ padding: '36px 0', borderBottom: '1px solid var(--bg-secondary)' }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 24, fontFamily: 'var(--font-sans)' }}>
                {t('ingredients')}
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
                      <span style={{ fontSize: 17 }}>{viewTranslationIndex !== null ? ((translations[viewTranslationIndex]?.ingredients || [])[i]?.name || ing.name) : ing.name}</span>
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
            <section dir={isRecipeHebrew() ? 'rtl' : 'ltr'} style={{ paddingTop: 36 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 28, fontFamily: 'var(--font-sans)' }}>
                {t('instructions')}
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
                        <p style={{ margin: 0, fontSize: 17, lineHeight: 1.8, color: '#CCC' }}>{viewTranslationIndex !== null ? ((translations[viewTranslationIndex]?.stages || [])[i]?.text || stage.text) : stage.text}</p>
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
              <div style={{ fontSize: 48, marginBottom: 20 }}>{isPublicView ? '🍳' : '📝'}</div>
              <p style={{ margin: '0 0 20px' }}>{isPublicView ? t('noContentYet') : t('recipeEmpty')}</p>
              {!isPublicView && (
                <button 
                  style={{ ...styles.btnPrimary, display: 'inline-flex', alignItems: 'center', gap: 8 }} 
                  onClick={() => setCurrentView('edit')}
                >
                  <Icon type="edit" /> Add content
                </button>
              )}
            </div>
          )}
        </main>

        {/* Add Variation Modal */}
        {variationModal && (
          <div 
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} 
            onClick={() => setVariationModal(null)}
          >
            <div 
              style={{ background: 'var(--bg-secondary)', borderRadius: 20, padding: 32, maxWidth: 400, width: '90%', border: '1px solid var(--border-color)' }} 
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 600 }}>New Variation</h3>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontFamily: 'var(--font-sans)' }}>
                  Variation Name
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
                  value={newVariationName} 
                  onChange={e => setNewVariationName(e.target.value)} 
                  placeholder="e.g., Low-carb, Spicy, Vegan..."
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && newVariationName.trim() && confirmAddVariation()}
                />
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 24px', lineHeight: 1.5 }}>
                This will create a copy of the current variation that you can customize.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button style={styles.btn} onClick={() => setVariationModal(null)}>Cancel</button>
                <button 
                  style={{ ...styles.btnPrimary, opacity: newVariationName.trim() ? 1 : 0.5 }} 
                  onClick={confirmAddVariation}
                  disabled={!newVariationName.trim()}
                >
                  Create Variation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {shareModal && (
          <div 
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} 
            onClick={() => setShareModal(null)}
          >
            <div 
              style={{ background: 'var(--bg-secondary)', borderRadius: 20, padding: 32, maxWidth: 450, width: '90%', border: '1px solid var(--border-color)' }} 
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 12, 
                  background: 'rgba(251,146,60,0.15)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: 'var(--accent-orange)'
                }}>
                  <Icon type="share" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Share Recipe</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Anyone with this link can view</p>
                </div>
              </div>
              
              <div style={{ 
                background: 'var(--bg-tertiary)', 
                borderRadius: 12, 
                padding: '14px 16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12,
                marginBottom: 24
              }}>
                <Icon type="link" />
                <input 
                  type="text" 
                  value={shareModal.shareUrl} 
                  readOnly 
                  style={{ 
                    flex: 1, 
                    background: 'transparent', 
                    border: 'none', 
                    color: 'var(--text-primary)', 
                    fontSize: 14, 
                    fontFamily: 'var(--font-sans)',
                    outline: 'none'
                  }} 
                  onClick={e => e.target.select()}
                />
              </div>
              
              <div style={{ display: 'flex', gap: 12 }}>
                <button style={{ ...styles.btn, flex: 1 }} onClick={() => setShareModal(null)}>
                  Close
                </button>
                <button 
                  id="copy-share-btn"
                  style={{ ...styles.btnPrimary, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} 
                  onClick={copyShareUrl}
                >
                  <Icon type="copy" /> Copy Link
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // EDIT MODE
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={styles.page}>
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
          onClick={() => {
            // Clear auto-save timeout
            if (autoSaveTimeoutRef.current) {
              clearTimeout(autoSaveTimeoutRef.current);
            }
            // If there are unsaved changes, save before leaving
            if (autoSaveStatus === 'unsaved') {
              saveRecipe(true).then(() => setCurrentView('view'));
            } else {
              setCurrentView('view');
            }
          }}
        >
          <Icon type="back" /> {t('done')}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Publish button */}
          <button
            style={{
              ...styles.btn,
              color: isPublished ? 'var(--accent-green)' : 'var(--text-secondary)',
              borderColor: isPublished ? 'var(--accent-green)' : 'var(--border-color)',
              background: isPublished ? 'rgba(74,222,128,0.1)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: isPublishing ? 0.7 : 1
            }}
            disabled={isPublishing || !editingId || editingId.startsWith('mock-')}
            onClick={async () => {
              if (isPublishing || !editingId || editingId.startsWith('mock-')) return;
              try {
                setIsPublishing(true);
                const result = await api.publishRecipe(editingId, !isPublished);
                setIsPublished(result.isPublished);
                // Update the recipe in local state
                setRecipes(prev => prev.map(r => 
                  r.id === editingId ? { ...r, isPublished: result.isPublished } : r
                ));
              } catch (error) {
                console.error('Failed to update publish status:', error);
              } finally {
                setIsPublishing(false);
              }
            }}
          >
            {isPublishing ? (
              <span style={{
                width: 14,
                height: 14,
                border: '2px solid rgba(74,222,128,0.2)',
                borderTopColor: 'var(--accent-green)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
            ) : (
              <span>{isPublished ? '📢' : '📤'}</span>
            )}
            {isPublishing ? t('publishing') : isPublished ? t('published') : t('publish')}
          </button>
          
          {saveMessage && (
            <span style={{ 
              padding: '8px 16px', 
              background: saveMessage.includes('Please') || saveMessage.includes('Error') || saveMessage.includes('נא') ? 'rgba(239,68,68,0.2)' : 'rgba(74,222,128,0.2)', 
              borderRadius: 8, 
              fontSize: 13, 
              color: saveMessage.includes('Please') || saveMessage.includes('Error') || saveMessage.includes('נא') ? 'var(--accent-red)' : 'var(--accent-green)', 
              fontFamily: 'var(--font-sans)' 
            }}>
              {saveMessage}
            </span>
          )}
          
          {/* Auto-save status indicator */}
          {!saveMessage && (
            <span style={{ 
              padding: '8px 16px', 
              borderRadius: 8, 
              fontSize: 13, 
              fontFamily: 'var(--font-sans)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: autoSaveStatus === 'saving' ? 'var(--text-secondary)' : 
                     autoSaveStatus === 'saved' ? 'var(--accent-green)' : 'var(--text-muted)',
              background: autoSaveStatus === 'saving' ? 'rgba(255,255,255,0.05)' : 
                          autoSaveStatus === 'saved' ? 'rgba(74,222,128,0.1)' : 'transparent'
            }}>
              {autoSaveStatus === 'saving' && (
                <span style={{
                  width: 12,
                  height: 12,
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderTopColor: 'var(--text-secondary)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
              )}
              {autoSaveStatus === 'saving' ? t('saving') : 
               autoSaveStatus === 'saved' ? t('saved') : t('unsavedChanges')}
            </span>
          )}
        </div>
      </header>
      
      {/* Variation Tabs in Edit Mode */}
      {editingId && variations.length > 0 && (
        <div style={{
          display: 'flex',
          gap: 0,
          padding: '0 24px',
          maxWidth: 680 + 48,
          margin: '0 auto',
          borderBottom: '1px solid var(--border-color)',
          overflowX: 'auto'
        }}>
          {variations.map((v, i) => (
            <button
              key={v.id || i}
              onClick={() => switchVariation(i)}
              style={{
                padding: '14px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: editingTranslationIndex === null && i === currentVariationIndex ? '2px solid var(--accent-green)' : '2px solid transparent',
                color: editingTranslationIndex === null && i === currentVariationIndex ? 'var(--accent-green)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                fontWeight: editingTranslationIndex === null && i === currentVariationIndex ? 600 : 400,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              {v.name}
            </button>
          ))}
          <button
            onClick={handleAddVariation}
            style={{
              padding: '14px 16px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
            title="Add variation"
          >
            <Icon type="plus" /> Add
          </button>
          {translations.map((tr, i) => (
            <button
              key={i}
              onClick={() => {
                const updatedVariations = [...variations];
                updatedVariations[currentVariationIndex] = {
                  ...updatedVariations[currentVariationIndex],
                  description,
                  servings: parseInt(servings) || 4,
                  tags,
                  bannerImage,
                  ingredients: filteredIngredients.length > 0 ? filteredIngredients : ingredients,
                  stages: filteredStages.length > 0 ? filteredStages : stages
                };
                setVariations(updatedVariations);
                setEditingTranslationIndex(i);
              }}
              style={{
                padding: '14px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: editingTranslationIndex === i ? '2px solid #888' : '2px solid transparent',
                color: editingTranslationIndex === i ? 'var(--text-secondary)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                fontWeight: editingTranslationIndex === i ? 600 : 400,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              🌐 {tr.langName || `Language ${i + 1}`}
            </button>
          ))}
          <button
            onClick={() => {
              const updatedVariations = [...variations];
              updatedVariations[currentVariationIndex] = {
                ...updatedVariations[currentVariationIndex],
                description,
                servings: parseInt(servings) || 4,
                tags,
                bannerImage,
                ingredients: filteredIngredients.length > 0 ? filteredIngredients : ingredients,
                stages: filteredStages.length > 0 ? filteredStages : stages
              };
              setVariations(updatedVariations);
              const newTranslations = [...translations, { langName: '', name: '', description: '', ingredients: [], stages: [] }];
              setTranslations(newTranslations);
              setEditingTranslationIndex(newTranslations.length - 1);
            }}
            style={{
              padding: '14px 16px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
            title="Add language"
          >
            🌐 +
          </button>
        </div>
      )}
      
      <main style={{ ...styles.main, maxWidth: 680 }}>
        {editingTranslationIndex !== null ? (
          /* Translation Form */
          (() => {
            const curTr = translations[editingTranslationIndex] || {};
            const updateTr = (field, value) => {
              const updated = [...translations];
              updated[editingTranslationIndex] = { ...curTr, [field]: value };
              setTranslations(updated);
            };
            return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <div style={{ flex: 1, marginRight: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10, fontFamily: 'var(--font-sans)' }}>
                    Language
                  </label>
                  <input
                    style={{ ...styles.input, fontSize: 16, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '14px 18px' }}
                    placeholder="e.g., Hebrew, French, Spanish..."
                    value={curTr.langName || ''}
                    onChange={e => updateTr('langName', e.target.value)}
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => {
                    const updated = translations.filter((_, i) => i !== editingTranslationIndex);
                    setTranslations(updated);
                    setEditingTranslationIndex(null);
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '8px', marginTop: 28, flexShrink: 0 }}
                  title="Delete this language"
                >
                  <Icon type="trash" />
                </button>
              </div>

              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10, fontFamily: 'var(--font-sans)' }}>
                  Recipe Name
                </label>
                <input
                  style={{ ...styles.input, fontSize: 16, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '14px 18px' }}
                  placeholder="Recipe name in this language..."
                  value={curTr.name || ''}
                  onChange={e => updateTr('name', e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 44 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10, fontFamily: 'var(--font-sans)' }}>
                  Description
                </label>
                <textarea
                  style={{ ...styles.input, fontSize: 15, lineHeight: 1.6, resize: 'none', minHeight: 80, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '14px 18px' }}
                  placeholder="Description in this language..."
                  value={curTr.description || ''}
                  onChange={e => updateTr('description', e.target.value)}
                />
              </div>

              {filteredIngredients.length > 0 && (
                <div style={{ marginBottom: 44 }}>
                  <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 18px', fontFamily: 'var(--font-sans)' }}>
                    {t('ingredients')}
                  </h2>
                  {filteredIngredients.map((ing, i) => (
                    <div key={ing.id} style={{ ...styles.surface, marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ flex: 1, fontSize: 15, color: 'var(--text-muted)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ing.name}
                      </span>
                      <span style={{ color: '#444', fontSize: 18, flexShrink: 0 }}>→</span>
                      <input
                        style={{ ...styles.input, flex: 1, fontSize: 15, minWidth: 0 }}
                        placeholder="Translation..."
                        value={(curTr.ingredients || [])[i]?.name || ''}
                        onChange={e => {
                          const ings = [...(curTr.ingredients || [])];
                          ings[i] = { ...(ings[i] || {}), name: e.target.value };
                          updateTr('ingredients', ings);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {filteredStages.length > 0 && (
                <div>
                  <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 18px', fontFamily: 'var(--font-sans)' }}>
                    {t('instructions')}
                  </h2>
                  {filteredStages.map((stage, i) => (
                    <div key={stage.id} style={{ ...styles.surface, marginBottom: 12 }}>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: 'var(--accent-green)', flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        <p style={{ flex: 1, fontSize: 14, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>{stage.text}</p>
                      </div>
                      <textarea
                        style={{ ...styles.input, fontSize: 15, lineHeight: 1.7, resize: 'none', minHeight: 80 }}
                        placeholder="Step translation..."
                        value={(curTr.stages || [])[i]?.text || ''}
                        onChange={e => {
                          const stgs = [...(curTr.stages || [])];
                          stgs[i] = { ...(stgs[i] || {}), text: e.target.value };
                          updateTr('stages', stgs);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            );
          })()
        ) : (
        <>
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
            onClick={() => openImageCapture({ type: 'banner' })}
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
                {t('clickToAddBanner')}
              </div>
            )}
            <input 
              style={{ ...styles.input, fontSize: 34, fontWeight: 600, marginBottom: 10, textShadow: bannerImage ? '0 2px 8px rgba(0,0,0,0.5)' : 'none' }} 
              placeholder={t('recipeName')} 
              value={recipeName} 
              onChange={e => setRecipeName(e.target.value)}
              onFocus={e => { if (recipeName === 'Untitled Recipe' || recipeName === 'מתכון ללא שם') setRecipeName(''); }}
              onBlur={e => { if (!recipeName.trim()) setRecipeName(t('untitledRecipe')); }}
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
              placeholder={t('shortDescription')} 
              value={description} 
              onChange={e => { const txt = e.target.value; if ((txt.match(/\n/g) || []).length <= 1) setDescription(txt); }} 
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
            <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>{t('serves')}</span>
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
              {tags.map(tag => (
                <span key={tag} style={{ 
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
                  {tTag(tag)}
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
                    onClick={() => removeTag(tag)}
                  >
                    <Icon type="x" />
                  </button>
                </span>
              ))}
              <input 
                style={{ ...styles.input, flex: 1, minWidth: 100, padding: '6px 0', fontSize: 14, fontFamily: 'var(--font-sans)' }} 
                placeholder={tags.length ? '' : t('addTags')} 
                value={tagInput} 
                enterKeyHint="done"
                onChange={e => { setTagInput(e.target.value); setShowSuggestions(true); }} 
                onFocus={() => setShowSuggestions(true)} 
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} 
                onKeyDown={e => { 
                  if ((e.key === 'Enter' || e.keyCode === 13) && tagInput.trim()) { 
                    e.preventDefault(); 
                    e.stopPropagation();
                    addTag(tagInput); 
                  } 
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
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 2, margin: 0, fontFamily: 'var(--font-sans)' }}>
            {t('ingredients')}
          </h2>
        </div>
        
        {ingredients.map((ing, i) => (
          <div key={ing.id} style={{ ...styles.surface, marginBottom: 12 }}>
            {/* Ingredient name row */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
              <input 
                style={{ ...styles.input, flex: 1, fontSize: 15, minWidth: 0 }} 
                placeholder={t('ingredient')} 
                value={ing.name} 
                onChange={e => setIngredients(ingredients.map(x => x.id === ing.id ? { ...x, name: e.target.value } : x))}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const newId = Date.now();
                    setIngredients([...ingredients, { id: newId, name: '', amount: '', unit: 'g', image: null }]);
                    setTimeout(() => {
                      const inputs = document.querySelectorAll(`input[placeholder="${t('ingredient')}"]`);
                      inputs[inputs.length - 1]?.focus();
                    }, 10);
                  }
                }}
              />
              <button 
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'var(--accent-red)', 
                  cursor: ingredients.length === 1 ? 'not-allowed' : 'pointer', 
                  opacity: ingredients.length === 1 ? 0.3 : 0.6, 
                  padding: 8,
                  flexShrink: 0
                }} 
                disabled={ingredients.length === 1} 
                onClick={() => ingredients.length > 1 && setIngredients(ingredients.filter(x => x.id !== ing.id))}
              >
                <Icon type="trash" />
              </button>
            </div>
            {/* Amount and unit row */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
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
                <button 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 6, 
                    padding: '8px 14px', 
                    background: 'var(--bg-tertiary)', 
                    borderRadius: 8, 
                    cursor: 'pointer', 
                    fontSize: 12, 
                    color: 'var(--text-secondary)', 
                    fontFamily: 'var(--font-sans)',
                    border: 'none'
                  }}
                  onClick={() => openImageCapture({ type: 'ingredient', index: i })}
                >
                  <Icon type="camera" /> Add image
                </button>
              )}
            </div>
          </div>
        ))}
        
        <button 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: 6, 
            padding: '14px 20px', 
            background: 'transparent', 
            border: '1px dashed var(--border-color)', 
            borderRadius: 12, 
            color: 'var(--text-secondary)', 
            fontSize: 14, 
            cursor: 'pointer', 
            fontFamily: 'var(--font-sans)',
            width: '100%',
            marginTop: 4
          }} 
          onClick={() => {
            setIngredients([...ingredients, { id: Date.now(), name: '', amount: '', unit: 'g', image: null }]);
            setTimeout(() => {
              const inputs = document.querySelectorAll(`input[placeholder="${t('ingredient')}"]`);
              inputs[inputs.length - 1]?.focus();
            }, 10);
          }}
        >
          <Icon type="plus" /> {t('addIngredient')}
        </button>

        {/* Cooking Steps Section */}
        <div style={{ marginTop: 44, marginBottom: 18 }}>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 2, margin: 0, fontFamily: 'var(--font-sans)' }}>
            {t('instructions')}
          </h2>
        </div>
        
        {stages.map((stage, i) => (
          <div key={stage.id} dir={isRecipeHebrew() ? 'rtl' : 'ltr'} style={{ ...styles.surface, marginBottom: 16, padding: 20 }}>
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
                placeholder={t('describeStep')} 
                value={stage.text} 
                onChange={e => setStages(stages.map(x => x.id === stage.id ? { ...x, text: e.target.value } : x))}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const newId = Date.now();
                    setStages([...stages, { id: newId, text: '', image: null }]);
                    setTimeout(() => {
                      const textareas = document.querySelectorAll(`textarea[placeholder="${t('describeStep')}"]`);
                      textareas[textareas.length - 1]?.focus();
                    }, 10);
                  }
                }}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, marginInlineStart: 56 }}>
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
                <button 
                  style={{ 
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
                  }}
                  onClick={() => openImageCapture({ type: 'stage', index: i })}
                >
                  <Icon type="camera" /> Add image or GIF
                </button>
              )}
            </div>
          </div>
        ))}
        
        <button 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: 6, 
            padding: '14px 20px', 
            background: 'transparent', 
            border: '1px dashed var(--border-color)', 
            borderRadius: 12, 
            color: 'var(--text-secondary)', 
            fontSize: 14, 
            cursor: 'pointer', 
            fontFamily: 'var(--font-sans)',
            width: '100%',
            marginTop: 4
          }} 
          onClick={() => {
            setStages([...stages, { id: Date.now(), text: '', image: null }]);
            setTimeout(() => {
              const textareas = document.querySelectorAll(`textarea[placeholder="${t('describeStep')}"]`);
              textareas[textareas.length - 1]?.focus();
            }, 10);
          }}
        >
          <Icon type="plus" /> {t('addStep')}
        </button>
        </>
        )}
      </main>

      {/* Add Variation Modal in Edit Mode */}
      {variationModal && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} 
          onClick={() => setVariationModal(null)}
        >
          <div 
            style={{ background: 'var(--bg-secondary)', borderRadius: 20, padding: 32, maxWidth: 400, width: '90%', border: '1px solid var(--border-color)' }} 
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 600 }}>{t('newVariation')}</h3>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontFamily: 'var(--font-sans)' }}>
                {t('variationName')}
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
                value={newVariationName} 
                onChange={e => setNewVariationName(e.target.value)} 
                placeholder="e.g., Low-carb, Spicy, Vegan..."
                autoFocus
                onKeyDown={e => e.key === 'Enter' && newVariationName.trim() && confirmAddVariation()}
              />
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 24px', lineHeight: 1.5 }}>
              {t('copyCurrentVariation')}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button style={styles.btn} onClick={() => setVariationModal(null)}>{t('cancel')}</button>
              <button 
                style={{ ...styles.btnPrimary, opacity: newVariationName.trim() ? 1 : 0.5 }} 
                onClick={confirmAddVariation}
                disabled={!newVariationName.trim()}
              >
                {t('create')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Image Capture Modal (mobile camera/GIF feature) */}
      {captureTarget && (
        <ImageCapture
          onCapture={handleImageCapture}
          onClose={() => setCaptureTarget(null)}
          currentImage={
            captureTarget.type === 'banner' ? bannerImage :
            captureTarget.type === 'ingredient' ? ingredients[captureTarget.index]?.image :
            captureTarget.type === 'stage' ? stages[captureTarget.index]?.image :
            null
          }
        />
      )}
      
      {/* Upload Progress Modal */}
      {uploadProgress !== null && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: 20,
            padding: 32,
            maxWidth: 360,
            width: '90%',
            textAlign: 'center',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📤</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600 }}>
              Uploading Image
            </h3>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 24px', fontSize: 14 }}>
              {uploadProgress}% complete
            </p>
            
            {/* Progress bar */}
            <div style={{
              background: 'var(--bg-tertiary)',
              borderRadius: 8,
              height: 8,
              overflow: 'hidden'
            }}>
              <div style={{
                background: 'var(--accent-green)',
                height: '100%',
                width: `${uploadProgress}%`,
                borderRadius: 8,
                transition: 'width 0.2s ease-out'
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



