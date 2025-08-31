"""Pydantic schemas for request/response validation."""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator


class NoteBase(BaseModel):
    """Base schema for notes."""
    timestamp: int = Field(ge=0, description="Timestamp in seconds")
    content: str = Field(min_length=1, max_length=5000)


class NoteCreate(NoteBase):
    """Schema for creating a note."""
    id: Optional[str] = Field(None, description="Client-side note ID for idempotency")


class NoteResponse(NoteBase):
    """Schema for note responses."""
    id: int
    client_note_id: str
    video_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class VideoBase(BaseModel):
    """Base schema for videos."""
    url: str = Field(min_length=1, max_length=255)
    title: str = Field(min_length=1, max_length=500)


class VideoCreate(VideoBase):
    """Schema for creating a video."""
    tags: List[str] = Field(default_factory=list, max_items=20)
    
    @validator('tags')
    def validate_tags(cls, v):
        # Filter out empty tags and limit length
        return [tag.strip() for tag in v if tag.strip()][:20]


class VideoUpdate(BaseModel):
    """Schema for updating a video."""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    tags: Optional[List[str]] = Field(None, max_items=20)
    
    @validator('tags')
    def validate_tags(cls, v):
        if v is None:
            return v
        return [tag.strip() for tag in v if tag.strip()][:20]


class VideoResponse(VideoBase):
    """Schema for video responses."""
    id: str
    tags: List[str] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class VideoWithNotes(VideoResponse):
    """Schema for video with notes."""
    notes: List[NoteResponse] = []


class TagResponse(BaseModel):
    """Schema for tag responses."""
    id: int
    name: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# Import/Migration schemas
class ImportNote(BaseModel):
    """Schema for importing notes from localStorage."""
    id: int
    timestamp: int = Field(ge=0)
    content: str = Field(min_length=1)
    createdAt: str  # ISO datetime string


class ImportVideo(BaseModel):
    """Schema for importing videos from localStorage."""
    id: str = Field(min_length=11, max_length=11)
    url: str
    title: str
    tags: List[str] = Field(default_factory=list)
    dateAdded: str  # ISO datetime string


class ImportRequest(BaseModel):
    """Schema for import request."""
    videos: List[ImportVideo]
    notesByVideoId: Dict[str, List[ImportNote]] = Field(default_factory=dict)


class ImportResponse(BaseModel):
    """Schema for import response."""
    success: bool
    message: str
    stats: Dict[str, int] = Field(default_factory=dict)
    errors: List[str] = Field(default_factory=list)