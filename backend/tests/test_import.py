"""Tests for the import functionality."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import get_db, Base
from app import models

# Create test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
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

def test_import_empty_data(client, test_db):
    """Test importing empty data."""
    response = client.post("/api/import", json={
        "videos": [],
        "notesByVideoId": {}
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["stats"]["videos_created"] == 0
    assert data["stats"]["notes_created"] == 0

def test_import_single_video(client, test_db):
    """Test importing a single video."""
    import_data = {
        "videos": [
            {
                "id": "qjMSYLMkPBc",
                "url": "https://www.youtube.com/watch?v=qjMSYLMkPBc",
                "title": "滷肉飯 做法｜台式魯肉飯…",
                "tags": ["grilling", "healthy", "chicken"],
                "dateAdded": "2025-08-07T03:22:58.510Z"
            }
        ],
        "notesByVideoId": {}
    }
    
    response = client.post("/api/import", json=import_data)
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["stats"]["videos_created"] == 1
    assert data["stats"]["tags_created"] == 3

def test_import_video_with_notes(client, test_db):
    """Test importing a video with notes."""
    import_data = {
        "videos": [
            {
                "id": "qjMSYLMkPBc",
                "url": "https://www.youtube.com/watch?v=qjMSYLMkPBc",
                "title": "滷肉飯 做法｜台式魯肉飯…",
                "tags": ["grilling"],
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
                },
                {
                    "id": 1754967281527,
                    "timestamp": 120,
                    "content": "Add ingredients",
                    "createdAt": "2025-08-12T02:54:41.527Z"
                }
            ]
        }
    }
    
    response = client.post("/api/import", json=import_data)
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["stats"]["videos_created"] == 1
    assert data["stats"]["notes_created"] == 2

def test_import_idempotency(client, test_db):
    """Test that importing the same data twice is idempotent."""
    import_data = {
        "videos": [
            {
                "id": "qjMSYLMkPBc",
                "url": "https://www.youtube.com/watch?v=qjMSYLMkPBc",
                "title": "滷肉飯 做法｜台式魯肉飯…",
                "tags": ["grilling"],
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
    
    # First import
    response1 = client.post("/api/import", json=import_data)
    assert response1.status_code == 200
    data1 = response1.json()
    assert data1["stats"]["videos_created"] == 1
    assert data1["stats"]["notes_created"] == 1
    
    # Second import (should update, not create)
    response2 = client.post("/api/import", json=import_data)
    assert response2.status_code == 200
    data2 = response2.json()
    assert data2["stats"]["videos_created"] == 0
    assert data2["stats"]["videos_updated"] == 1
    assert data2["stats"]["notes_created"] == 0
    assert data2["stats"]["notes_updated"] == 1

def test_import_invalid_video_id(client, test_db):
    """Test importing video with invalid ID/URL mismatch."""
    import_data = {
        "videos": [
            {
                "id": "wrongid123",
                "url": "https://www.youtube.com/watch?v=qjMSYLMkPBc",
                "title": "Test Video",
                "tags": [],
                "dateAdded": "2025-08-07T03:22:58.510Z"
            }
        ],
        "notesByVideoId": {}
    }
    
    response = client.post("/api/import", json=import_data)
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert len(data["errors"]) > 0
    assert "Invalid video ID/URL mismatch" in data["errors"][0]

def test_import_notes_for_nonexistent_video(client, test_db):
    """Test importing notes for a video that doesn't exist."""
    import_data = {
        "videos": [],
        "notesByVideoId": {
            "nonexistent": [
                {
                    "id": 123,
                    "timestamp": 0,
                    "content": "Test note",
                    "createdAt": "2025-08-12T02:54:39.620Z"
                }
            ]
        }
    }
    
    response = client.post("/api/import", json=import_data)
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert len(data["errors"]) > 0
    assert "Cannot import notes for non-existent video" in data["errors"][0]