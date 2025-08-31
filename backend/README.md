# Cooktube Backend

FastAPI backend for Cooktube - YouTube Cooking Video Organizer with PostgreSQL/SQLite database support.

## Features

- **Video Management**: Store and manage YouTube cooking videos with metadata
- **Tagging System**: Case-insensitive tag management with many-to-many relationships
- **Notes System**: Time-based video annotations with idempotent imports
- **Data Migration**: Import existing localStorage data with full idempotency
- **Database Support**: SQLite (default) or PostgreSQL
- **API Documentation**: Auto-generated OpenAPI/Swagger docs

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt

# Optional: For PostgreSQL support (only if you plan to use PostgreSQL)
pip install -r requirements-postgres.txt
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Database Setup

```bash
# Option 1: Use setup script (recommended)
python setup_db.py

# Option 2: Use alembic directly (if installed globally)
alembic upgrade head
```

### 4. Start Server

```bash
# Development
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
python app/main.py
```

### 5. API Documentation

Visit `http://localhost:8000/docs` for interactive API documentation.

## Database Configuration

### SQLite (Default - Recommended for Development)
```env
DATABASE_URL=sqlite:///./cooktube.db
```

### PostgreSQL (Optional - For Production)
```env
DATABASE_URL=postgresql://username:password@localhost/cooktube
```

**Note**: SQLite is the default and recommended option for development. It requires no additional setup and works out of the box. PostgreSQL is optional and requires additional installation steps.

## API Endpoints

### Import/Migration
- `POST /api/import` - Import data from localStorage

### Videos
- `GET /api/videos` - List all videos
- `GET /api/videos/{id}` - Get video with notes
- `POST /api/videos` - Create new video
- `PATCH /api/videos/{id}` - Update video
- `DELETE /api/videos/{id}` - Delete video

### Notes
- `GET /api/videos/{id}/notes` - Get video notes
- `POST /api/videos/{id}/notes` - Create note
- `DELETE /api/notes/{id}` - Delete note

### Tags
- `GET /api/tags` - List all tags

## Database Schema

### Videos Table
- `id` (String): YouTube video ID (primary key)
- `url` (String): YouTube URL
- `title` (String): Video title
- `created_at`, `updated_at` (DateTime): Timestamps

### Tags Table
- `id` (Integer): Auto-increment primary key
- `name` (String): Tag name (case-insensitive unique)
- `created_at` (DateTime): Creation timestamp

### Video_Tags Table
- Many-to-many relationship between videos and tags
- Unique constraint on (video_id, tag_id)

### Notes Table
- `id` (Integer): Auto-increment primary key
- `video_id` (String): Foreign key to videos
- `client_note_id` (String): Original client-side ID for idempotency
- `timestamp_sec` (Integer): Timestamp in seconds
- `content` (Text): Note content
- `created_at` (DateTime): Creation timestamp

## Migration from localStorage

The `/api/import` endpoint accepts data in the format:

```json
{
  "videos": [
    {
      "id": "qjMSYLMkPBc",
      "url": "https://www.youtube.com/watch?v=qjMSYLMkPBc",
      "title": "滷肉飯 做法｜台式魯肉飯…",
      "tags": ["grilling", "healthy", "chicken"],
      "dateAdded": "2025-08-07T03:22:58.510Z"
    }
  ],
  "notesByVideoId": {
    "qjMSYLMkPBc": [
      {
        "id": 1754967279620,
        "timestamp": 0,
        "content": "Start of recipe",
        "createdAt": "2025-08-12T02:54:39.620Z"
      }
    ]
  }
}
```

## Testing

```bash
# Run all tests
python -m pytest

# Run with coverage
python -m pytest --cov=app

# Run specific test file
python -m pytest tests/test_import.py -v
```

## Development

### Database Migrations

```bash
# Create new migration
python -m alembic revision --autogenerate -m "Description"

# Apply migrations
python -m alembic upgrade head

# Rollback migration
python -m alembic downgrade -1
```

### Code Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI app
│   ├── database.py      # Database config
│   ├── models.py        # SQLAlchemy models
│   ├── schemas.py       # Pydantic schemas
│   ├── crud.py          # Database operations
│   ├── routes.py        # API routes
│   └── utils.py         # Utility functions
├── alembic/             # Database migrations
├── tests/               # Test files
├── requirements.txt     # Dependencies
└── .env.example         # Environment template
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./cooktube.db` | Database connection string |
| `API_HOST` | `0.0.0.0` | Server host |
| `API_PORT` | `8000` | Server port |
| `DEBUG` | `True` | Debug mode |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins |

## Production Deployment

1. Set environment variables
2. Use PostgreSQL for production
3. Run migrations: `python -m alembic upgrade head`
4. Start with: `python app/main.py`
5. Use reverse proxy (nginx) for SSL/domain routing