# EchoThink UI - Frontend

Frontend application built with React + Vite.

## Development Setup

### 1. Environment Configuration

Create a `.env.local` file in the root directory with local development URLs:

```env
VITE_BACKEND_URL=http://localhost:8000
VITE_API_URL=http://localhost:8000/api
```

For production, the `.env.production` file already contains the production URLs.

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

## Configuration

The app uses a centralized configuration system located in `src/config.js`:

- **BACKEND_URL**: Base URL for the backend API (http://localhost:8000 for development, https://cidivan-production.up.railway.app for production)
- **API_URL**: Full API endpoint URL (BACKEND_URL + /api)

All environment-specific variables are managed through Vite's `import.meta.env` system.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Notes

- `.env.local` is ignored by git (see .gitignore)
- Use `.env.example` as a reference for required variables
- The backend must be running on `http://localhost:8000` for local development
