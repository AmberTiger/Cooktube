"""SQLAlchemy models for Cooktube application."""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Video(Base):
    """Video model representing YouTube cooking videos.
    NOTE: id is the YouTube video ID and is globally unique in this schema.
    Data access is scoped by user_id in queries to enforce per-user isolation.
    """
    
    __tablename__ = "videos"
    
    id = Column(String(11), primary_key=True, index=True)  # YouTube video ID (global uniqueness)
    user_id = Column(String(128), nullable=False, index=True)  # Owner (from auth: payload.sub)
    url = Column(String(255), nullable=False)
    title = Column(String(500), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    notes = relationship("Note", back_populates="video", cascade="all, delete-orphan")
    video_tags = relationship("VideoTag", back_populates="video", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('ix_videos_title_lower', func.lower(title)),
        Index('ix_videos_created_at', 'created_at'),
        Index('ix_videos_user_created_at', 'user_id', 'created_at'),
    )


class Tag(Base):
    """Tag model for categorizing videos."""
    
    __tablename__ = "tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    video_tags = relationship("VideoTag", back_populates="tag", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('ix_tags_name_lower', func.lower(name)),
    )


class VideoTag(Base):
    """Many-to-many relationship between videos and tags.
    The relationship is implicitly scoped by the owning video's user_id.
    """
    
    __tablename__ = "video_tags"
    
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(String(11), ForeignKey("videos.id"), nullable=False)
    tag_id = Column(Integer, ForeignKey("tags.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    video = relationship("Video", back_populates="video_tags")
    tag = relationship("Tag", back_populates="video_tags")
    
    # Ensure unique video-tag combinations
    __table_args__ = (
        Index('ix_video_tags_unique', 'video_id', 'tag_id', unique=True),
    )


class Note(Base):
    """Note model for time-based video annotations.
    Scoped by the owning video's user_id via the relationship.
    """
    
    __tablename__ = "notes"
    
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(String(11), ForeignKey("videos.id"), nullable=False)
    client_note_id = Column(String(50), nullable=False)  # Original client-side ID for idempotency
    timestamp_sec = Column(Integer, nullable=False, default=0)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    video = relationship("Video", back_populates="notes")
    
    # Indexes
    __table_args__ = (
        Index('ix_notes_video_timestamp', 'video_id', 'timestamp_sec'),
        Index('ix_notes_client_id', 'video_id', 'client_note_id', unique=True),
    )