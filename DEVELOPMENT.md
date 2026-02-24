# 🚀 EchoThink - Local Development Setup

This guide will help you set up and run the EchoThink application locally for development.

## 📋 Prerequisites

- Python 3.8+ (with virtual environment support)
- Node.js 20+ (with npm)
- Django 4.x+
- React 19+

## 🔧 Backend Setup

### 1. Navigate to Backend Directory

```bash
cd EchoThink
```

### 2. Activate Virtual Environment

The virtual environment `venv` has already been created. Activate it:

**Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

**Windows (Command Prompt):**
```cmd
venv\Scripts\activate
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Create Environment Variables (Optional)

Copy `.env.example` to `.env` and customize if needed:

```bash
cp .env.example .env
```

### 5. Run Django Server

```bash
python manage.py runserver 0.0.0.0:8000
```

The backend will be available at `http://localhost:8000`

## 🎨 Frontend Setup

### 1. Navigate to Frontend Directory

```bash
cd EchoThinkUI
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment File

The `.env.local` file has been created with development URLs. If you need to update it:

```env
VITE_BACKEND_URL=http://localhost:8000
VITE_API_URL=http://localhost:8000/api
```

### 4. Run Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 🌐 Access the Application

Once both servers are running:

1. **Frontend:** [http://localhost:5173](http://localhost:5173)
2. **Backend API:** [http://localhost:8000/api](http://localhost:8000/api)
3. **Django Admin:** [http://localhost:8000/admin](http://localhost:8000/admin)

## 🔄 Switching Between Development and Production

### Development (Local)
- Backend URLs: `http://localhost:8000` and `http://localhost:8000/api`
- Frontend URLs: `http://localhost:5173`
- Database: SQLite (local)

### Production
- Backend URLs: `https://cidivan-production.up.railway.app`
- Frontend is built and served by the production build
- Database: PostgreSQL (via Railway)

The app automatically uses:
- `.env.local` for development (frontend)
- `.env.production` for production builds (frontend)
- Environment variables from system/Railway for backend

## 📝 Common Commands

### Backend
```bash
# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Run server
python manage.py runserver

# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Deactivate virtual environment
deactivate
```

### Frontend
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## 🐛 Troubleshooting

### Backend Issues
- **CORS errors?** Check `CORS_ALLOWED_ORIGINS` in `EchoThink/settings.py`
- **Port 8000 in use?** Run on different port: `python manage.py runserver 8001`
- **Database error?** Run migrations: `python manage.py migrate`

### Frontend Issues
- **API not found?** Ensure `.env.local` has correct `VITE_BACKEND_URL`
- **Port 5173 in use?** Vite will use the next available port
- **Modules missing?** Run `npm install` again

### Environment Issues
- **Virtual environment not activating?** Try: `python -m venv venv` to recreate
- **Node modules error?** Delete `node_modules` and `.package-lock.json`, then `npm install`

## 📚 Additional Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [REST Framework](https://www.django-rest-framework.org/)

## 🎯 Next Steps

1. Start the backend server
2. Start the frontend server
3. Navigate to `http://localhost:5173`
4. Login or register to test the application

Happy coding! 🎉
