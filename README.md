# Cooktube - YouTube Cooking Video Organizer

A full-stack application for organizing and annotating YouTube cooking videos, now with backend storage and migration capabilities.

## 🚀 Features

- **Video Management**: Add, organize, and search YouTube cooking videos
- **Time-based Notes**: Add notes at specific timestamps while watching
- **Tagging System**: Categorize videos with custom tags
- **Backend Migration**: Seamlessly migrate from localStorage to backend storage
- **Offline Support**: Automatic fallback to localStorage when backend is unavailable
- **Responsive Design**: Works on desktop and mobile devices

## 🏗️ Architecture

### Frontend (React 18 SPA)
- React with React Router for navigation
- localStorage for offline data storage
- Automatic migration to backend when available
- Responsive design with mobile support

### Backend (FastAPI + SQLAlchemy)
- FastAPI with automatic OpenAPI documentation
- SQLAlchemy ORM with Alembic migrations
- PostgreSQL or SQLite database support
- CORS enabled for frontend integration

## 📦 Installation & Setup

### Prerequisites
- Node.js 16+ (for frontend)
- Python 3.8+ (for backend)
- PostgreSQL (optional, SQLite is default)

### Frontend Setup

```bash
cd frontned
npm install
npm start
```

The frontend will run on `http://localhost:3000`

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env if needed
python -m alembic upgrade head
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will run on `http://localhost:8000`

## 🔄 Migration Process

When you first load the app after setting up the backend:

1. **Automatic Detection**: App detects existing localStorage data
2. **Migration Banner**: Shows migration options with data summary
3. **One-Click Migration**: Migrate all videos and notes to backend
4. **Backup Creation**: Automatic backup of localStorage data
5. **Seamless Transition**: App switches to backend as primary data source

### Migration Features
- **Idempotent**: Safe to run multiple times
- **Validation**: Ensures data integrity during migration
- **Error Handling**: Detailed error reporting and recovery
- **Backup**: Automatic backup with timestamp

## 🎯 Usage

### Adding Videos
1. Paste any YouTube URL in the add video form
2. Add custom title and tags
3. Video is automatically processed and stored

### Taking Notes
1. Click on any video to open the detail view
2. Play the video and pause at interesting moments
3. Add notes at current timestamp
4. Click timestamp in notes to jump back to that moment

### Search & Organization
- Search by video title or tags
- Filter videos using the search bar
- Edit video details and tags inline

## 🔧 API Documentation

When the backend is running, visit:
- **Interactive Docs**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **Health Check**: `http://localhost:8000/health`

### Key Endpoints
- `POST /api/import` - Migrate localStorage data
- `GET /api/videos` - List all videos
- `GET /api/videos/{id}` - Get video with notes
- `POST /api/videos` - Create new video
- `GET /api/videos/{id}/notes` - Get video notes
- `POST /api/videos/{id}/notes` - Create note

## 🧪 Testing

### Backend Tests
```bash
cd backend
python -m pytest
python -m pytest --cov=app  # With coverage
```

### Frontend Testing
```bash
cd frontned
npm test
```

## 📁 Project Structure

```
cooktube/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── utils/          # Utility functions
│   │   │   ├── api.js      # Backend API client
│   │   │   ├── migration.js # Migration logic
│   │   │   ├── dataService.js # Data abstraction layer
│   │   │   └── storage.js   # localStorage utilities
│   │   └── App.js          # Main app component
│   └── package.json
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── models.py       # Database models
│   │   ├── schemas.py      # Pydantic schemas
│   │   ├── routes.py       # API routes
│   │   ├── crud.py         # Database operations
│   │   └── main.py         # FastAPI app
│   ├── alembic/            # Database migrations
│   ├── tests/              # Backend tests
│   └── requirements.txt
└── README.md
```

## 🔒 Data Storage

### localStorage Format (Legacy)
- `cooktube-videos`: Array of video objects
- `cooktube-notes-{VIDEO_ID}`: Array of notes for each video
- `cooktube.migrated`: Migration status flag

### Backend Database
- **Videos**: YouTube video metadata with timestamps
- **Tags**: Normalized tag system with case-insensitive matching
- **Notes**: Time-based annotations linked to videos
- **Video_Tags**: Many-to-many relationship for video tagging

## 🌐 Environment Configuration

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:8000/api
```

### Backend (.env)
```env
DATABASE_URL=sqlite:///./cooktube.db
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True
CORS_ORIGINS=http://localhost:3000
```

## 🚀 Deployment

### Frontend (Vercel/Netlify)
1. Build: `npm run build`
2. Deploy `build/` directory
3. Set `REACT_APP_API_URL` environment variable

### Backend (Docker/VPS)
1. Set production environment variables
2. Use PostgreSQL for production
3. Run migrations: `python -m alembic upgrade head`
4. Start server: `python app/main.py`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🆘 Troubleshooting

### Migration Issues
- Ensure backend is running on `http://localhost:8000`
- Check browser console for detailed error messages
- Use "Continue Offline" if backend is unavailable

### Backend Connection
- Verify CORS settings in backend `.env`
- Check firewall settings for port 8000
- Ensure database is accessible

### Data Recovery
- Migration creates automatic backups in localStorage
- Look for keys with `.backup.YYYYMMDD` suffix
- Use browser dev tools to inspect localStorage data