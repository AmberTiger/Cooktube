"""Tests for search functionality."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import get_db, Base

# Create test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_search.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="function")
def test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def sample_data(client, test_db):
    """Create sample data for testing."""
    import_data = {
        "videos": [
            {
                "id": "video1test",
                "url": "https://www.youtube.com/watch?v=video1test",
                "title": "Chicken Grilling Recipe",
                "tags": ["chicken", "grilling", "bbq"],
                "dateAdded": "2025-08-07T03:22:58.510Z"
            },
            {
                "id": "video2test",
                "url": "https://www.youtube.com/watch?v=video2test",
                "title": "Healthy Salad Bowl",
                "tags": ["healthy", "salad", "vegetarian"],
                "dateAdded": "2025-08-07T04:22:58.510Z"
            },
            {
                "id": "video3test",
                "url": "https://www.youtube.com/watch?v=video3test",
                "title": "Pasta with Chicken",
                "tags": ["pasta", "chicken", "italian"],
                "dateAdded": "2025-08-07T05:22:58.510Z"
            }
        ],
        "notesByVideoId": {}
    }
    
    response = client.post("/api/import", json=import_data)
    assert response.status_code == 200
    return import_data

def test_get_all_videos(client, sample_data):
    """Test getting all videos."""
    response = client.get("/api/videos")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    
    # Check that videos are ordered by created_at desc (newest first)
    titles = [video["title"] for video in data]
    assert "Pasta with Chicken" in titles[0]  # Most recent

def test_get_videos_pagination(client, sample_data):
    """Test video pagination."""
    response = client.get("/api/videos?limit=2")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    
    response = client.get("/api/videos?skip=2&limit=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1

def test_get_single_video(client, sample_data):
    """Test getting a single video with details."""
    response = client.get("/api/videos/video1test")
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "video1test"
    assert data["title"] == "Chicken Grilling Recipe"
    assert "chicken" in data["tags"]
    assert "grilling" in data["tags"]
    assert "bbq" in data["tags"]
    assert "notes" in data

def test_get_nonexistent_video(client, sample_data):
    """Test getting a video that doesn't exist."""
    response = client.get("/api/videos/nonexistent")
    
    assert response.status_code == 404
    assert "Video not found" in response.json()["detail"]

def test_get_all_tags(client, sample_data):
    """Test getting all tags."""
    response = client.get("/api/tags")
    
    assert response.status_code == 200
    data = response.json()
    
    tag_names = [tag["name"] for tag in data]
    expected_tags = ["chicken", "grilling", "bbq", "healthy", "salad", "vegetarian", "pasta", "italian"]
    
    for expected_tag in expected_tags:
        assert expected_tag in tag_names

def test_create_video(client, test_db):
    """Test creating a new video."""
    video_data = {
        "url": "https://www.youtube.com/watch?v=newvideo11",
        "title": "New Test Video",
        "tags": ["test", "new"]
    }
    
    response = client.post("/api/videos", json=video_data)
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "newvideo11"
    assert data["title"] == "New Test Video"
    assert "test" in data["tags"]
    assert "new" in data["tags"]

def test_create_duplicate_video(client, sample_data):
    """Test creating a video that already exists."""
    video_data = {
        "url": "https://www.youtube.com/watch?v=video1test",
        "title": "Duplicate Video",
        "tags": []
    }
    
    response = client.post("/api/videos", json=video_data)
    
    assert response.status_code == 400
    assert "Video already exists" in response.json()["detail"]

def test_create_video_invalid_url(client, test_db):
    """Test creating a video with invalid URL."""
    video_data = {
        "url": "https://not-youtube.com/watch?v=invalid",
        "title": "Invalid Video",
        "tags": []
    }
    
    response = client.post("/api/videos", json=video_data)
    
    assert response.status_code == 400
    assert "Invalid YouTube URL" in response.json()["detail"]

def test_update_video(client, sample_data):
    """Test updating a video."""
    update_data = {
        "title": "Updated Chicken Recipe",
        "tags": ["chicken", "updated", "recipe"]
    }
    
    response = client.patch("/api/videos/video1test", json=update_data)
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Chicken Recipe"
    assert "updated" in data["tags"]
    assert "recipe" in data["tags"]

def test_delete_video(client, sample_data):
    """Test deleting a video."""
    response = client.delete("/api/videos/video1test")
    
    assert response.status_code == 200
    assert "deleted successfully" in response.json()["message"]
    
    # Verify video is deleted
    response = client.get("/api/videos/video1test")
    assert response.status_code == 404