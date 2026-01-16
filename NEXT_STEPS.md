# Cheffinator - Next Steps & Feature Roadmap

## 🚀 Planned Features

### High Priority
- [ ] **Video → WebP pipeline** - Replace client-side GIF encoding with: record WebM → upload → convert to animated WebP server-side (ffmpeg). Faster, smaller uploads, better quality.

### Medium Priority
- [ ] _Add your features here_

### Nice to Have
- [ ] _Add your features here_

---

## 🔄 In Progress (Preview Branch: `home-page`)
- [ ] **Mobile Camera/GIF Capture** - On mobile/tablet, users can:
  - 📁 Upload from gallery
  - 📷 Take a photo with camera
  - 🎬 Record 3-sec video → auto-convert to looping GIF (320px, 8fps for smaller size)
  - Includes animated cooking loader while processing GIF

---

## ✅ Completed Features
- [x] Recipe creation and editing
- [x] Ingredients with amounts and units
- [x] Cooking steps with images
- [x] Tag system with autocomplete
- [x] Search recipes by name or tag
- [x] Cooking mode (fullscreen presentation)
- [x] PostgreSQL database (persistent storage)
- [x] Persistent disk for images
- [x] Roboto font family
- [x] Deployed on Render
- [x] **Seamless ingredient/step entry** - Press Enter to create new rows automatically
- [x] **Recipe variations** - Multiple variations of the same recipe with tabs (e.g., Original, Spicy, Low-carb)
- [x] **Three-dots menu** - Expandable options menu on recipe cards (currently: Delete)
- [x] **Variations indicator** - Shows number of variations on recipe cards in dashboard
- [x] **"Add Recipe" card** - Dashboard shows an "Add Recipe" card instead of a button
- [x] **Enhanced search** - Search includes variation tags; variations appear as separate results when matching
- [x] **Multi-user system** - Access code login, per-user recipe isolation, user indicator in header
- [x] **User whitelist** - Only approved codes can access the app (hardcoded in server.js)
- [x] **Responsive header** - Mobile-friendly header with scaled title and avatar-only user indicator
- [x] **Responsive cooking mode** - Fully responsive across mobile, tablet, and desktop

---

## 💡 Feature Ideas (from spec)
_These are from the original product spec - move to "Planned" when ready to implement:_

- [ ] Voice control in Cooking Mode
- [ ] Recipe collections/folders
- [ ] Advanced filtering (by ingredient, cooking time, multiple tags)
- [ ] Serving size scaling (auto-calculate ingredient amounts)
- [ ] Recipe import from URL
- [ ] Inline timers in cooking steps
- [ ] Share recipes via link or PDF export
- [ ] Offline support (PWA)
- [ ] Custom domain setup

---

## 🐛 Known Issues
- [ ] _Add any bugs here_

---

## 📝 Notes

### Current Alpha Users (in `backend/server.js`)
```javascript
const VALID_CODES = [
  'cheffinator',
  'mrdru3000',
  'dante',
  'jono',
  'tester4'
];
```

### Preview Environments
- Enable "PR Previews" in Render settings to test branches before merging
- Current preview branch: `camera-use` (MR #1)

---

Last updated: January 2026
