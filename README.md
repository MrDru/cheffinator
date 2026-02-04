# 🍳 Cheffinator - Recipe Manager

A beautiful, modern recipe management web application for storing, organizing, and following your favorite recipes.

![Cheffinator](https://img.shields.io/badge/version-1.0.0-green)

## ✨ Features

- **Create & Edit Recipes** - Add recipes with ingredients, cooking steps, and images
- **Tag System** - Organize recipes with customizable tags (Vegetarian, Vegan, Italian, etc.)
- **Search** - Quickly find recipes by name or tag
- **Cooking Mode** - Full-screen presentation mode for following recipes while cooking
- **Duplicate Recipes** - Easily create variations of existing recipes
- **Image Support** - Add banner images, ingredient photos, and step-by-step images
- **Responsive Design** - Works great on desktop and tablet

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)

### Installation

1. **Navigate to the project directory:**
   ```bash
   cd "Cheffinator webapp"
   ```

2. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## 📁 Project Structure

```
Cheffinator webapp/
├── backend/              # Express.js API server
│   ├── server.js         # Main server file
│   └── uploads/          # Local uploads (dev only)
├── frontend/             # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx       # Main React component
│   │   ├── api.js        # API client functions
│   │   ├── data/         # Mock data for development
│   │   └── index.css     # Global styles
│   └── index.html
├── reference/            # Design mockups and specs
└── package.json          # Root package with scripts
```

## 🛠 Development

### Running Individual Services

```bash
# Backend only
cd backend && npm run dev

# Frontend only
cd frontend && npm run dev
```

### Building for Production

```bash
npm run build
```

The built frontend will be in `frontend/dist/`. The backend can serve these files in production mode.

## 📦 Tech Stack

- **Frontend:** React 18, Vite
- **Backend:** Node.js, Express
- **Database:** PostgreSQL (Supabase)
- **Image Storage:** Supabase Storage
- **Hosting:** Render.com
- **Styling:** CSS Variables, Custom Design System
- **Fonts:** Heebo, Roboto

## 🌐 Deployment

### Environment Variables

Set these in your hosting provider (e.g., Render):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string from Supabase |
| `SUPABASE_URL` | Supabase project URL (e.g., `https://xxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Supabase anon/public API key |
| `NODE_ENV` | Set to `production` for production builds |

### Supabase Storage Setup

1. Create a storage bucket named `images` (make it **public**)
2. Add these **Storage Policies** for the `images` bucket:

   **INSERT policy (for uploads):**
   - Name: `Allow public uploads`
   - Operation: INSERT
   - Target roles: anon
   - Policy: `bucket_id = 'images'`

   **SELECT policy (for viewing):**
   - Name: `Allow public read`
   - Operation: SELECT
   - Target roles: anon
   - Policy: `bucket_id = 'images'`

## 🎨 Design

The app features a dark theme with vibrant green accents, elegant typography, and smooth animations. The design prioritizes readability and ease of use while cooking.

### Color Palette

| Color | Value | Usage |
|-------|-------|-------|
| Background | `#0D0D0D` | Primary background |
| Surface | `#1A1A1A` | Cards and surfaces |
| Accent | `#4ADE80` | Buttons, highlights |
| Text | `#F5F5F5` | Primary text |

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recipes` | List all recipes |
| GET | `/api/recipes/:id` | Get single recipe |
| POST | `/api/recipes` | Create recipe |
| PUT | `/api/recipes/:id` | Update recipe |
| DELETE | `/api/recipes/:id` | Delete recipe |
| POST | `/api/recipes/:id/duplicate` | Duplicate recipe |
| POST | `/api/upload` | Upload image |

## 🎯 Usage Tips

1. **Cooking Mode:** Click the "Cook" button to enter full-screen mode. Use arrow keys or spacebar to navigate.
2. **Tags:** Start typing to see tag suggestions, or create custom tags by pressing Enter.
3. **Images:** Add images to ingredients and steps for visual guidance while cooking.

---

Made with ❤️ for home cooks everywhere




