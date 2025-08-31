"""CRUD operations for database models."""

from typing import List, Optional, Dict, Set
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app import models, schemas


def get_video(db: Session, user_id: str, video_id: str) -> Optional[models.Video]:
    """Get a video by ID for the given user."""
    return db.query(models.Video).filter(
        models.Video.id == video_id,
        models.Video.user_id == user_id,
    ).first()


def get_videos(db: Session, user_id: str, skip: int = 0, limit: int = 100) -> List[models.Video]:
    """Get all videos for the given user with pagination."""
    return (
        db.query(models.Video)
        .filter(models.Video.user_id == user_id)
        .order_by(models.Video.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_video(db: Session, user_id: str, video: schemas.VideoCreate, video_id: str) -> models.Video:
    """Create a new video for a user."""
    db_video = models.Video(
        id=video_id,
        user_id=user_id,
        url=video.url,
        title=video.title,
    )
    db.add(db_video)
    db.flush()  # Get the video ID
    
    # Add tags
    if video.tags:
        add_tags_to_video(db, db_video.id, video.tags)
    
    db.commit()
    db.refresh(db_video)
    return db_video


def update_video(db: Session, user_id: str, video_id: str, video_update: schemas.VideoUpdate) -> Optional[models.Video]:
    """Update an existing video for a user."""
    db_video = get_video(db, user_id, video_id)
    if not db_video:
        return None
    
    # Update basic fields
    if video_update.title is not None:
        db_video.title = video_update.title
    
    # Update tags if provided
    if video_update.tags is not None:
        # Remove existing tags
        db.query(models.VideoTag).filter(models.VideoTag.video_id == video_id).delete()
        # Add new tags
        if video_update.tags:
            add_tags_to_video(db, video_id, video_update.tags)
    
    db.commit()
    db.refresh(db_video)
    return db_video


def delete_video(db: Session, user_id: str, video_id: str) -> bool:
    """Delete a video and all associated data for a user."""
    db_video = get_video(db, user_id, video_id)
    if not db_video:
        return False
    
    db.delete(db_video)
    db.commit()
    return True


def get_or_create_tag(db: Session, tag_name: str) -> models.Tag:
    """Get existing tag or create new one (case-insensitive)."""
    tag_name = tag_name.strip()
    
    # Try to find existing tag (case-insensitive)
    db_tag = db.query(models.Tag).filter(func.lower(models.Tag.name) == func.lower(tag_name)).first()
    
    if not db_tag:
        db_tag = models.Tag(name=tag_name)
        db.add(db_tag)
        db.flush()
    
    return db_tag


def add_tags_to_video(db: Session, video_id: str, tag_names: List[str]):
    """Add tags to a video."""
    for tag_name in tag_names:
        if not tag_name.strip():
            continue
            
        tag = get_or_create_tag(db, tag_name)
        
        # Check if relationship already exists
        existing = db.query(models.VideoTag).filter(
            models.VideoTag.video_id == video_id,
            models.VideoTag.tag_id == tag.id
        ).first()
        
        if not existing:
            video_tag = models.VideoTag(video_id=video_id, tag_id=tag.id)
            db.add(video_tag)


def get_video_tags(db: Session, user_id: str, video_id: str) -> List[str]:
    """Get all tag names for a video for a user."""
    # Ensure the video belongs to the user; else return empty
    if not get_video(db, user_id, video_id):
        return []
    tags = db.query(models.Tag).join(models.VideoTag).filter(
        models.VideoTag.video_id == video_id
    ).all()
    return [tag.name for tag in tags]


def get_all_tags(db: Session, user_id: str) -> List[models.Tag]:
    """Get all tags used by the given user (derived via video relationships)."""
    # Tags are global, but we expose only those used by user's videos
    return (
        db.query(models.Tag)
        .join(models.VideoTag)
        .join(models.Video)
        .filter(models.Video.user_id == user_id)
        .order_by(models.Tag.name)
        .all()
    )


def get_video_notes(db: Session, user_id: str, video_id: str) -> List[models.Note]:
    """Get all notes for a video for a user."""
    if not get_video(db, user_id, video_id):
        return []
    return (
        db.query(models.Note)
        .filter(models.Note.video_id == video_id)
        .order_by(models.Note.timestamp_sec)
        .all()
    )


def create_note(db: Session, user_id: str, video_id: str, note: schemas.NoteCreate) -> Optional[models.Note]:
    """Create a new note for a user's video."""
    if not get_video(db, user_id, video_id):
        return None
    client_note_id = note.id or str(hash(f"{video_id}_{note.timestamp}_{note.content}"))
    
    db_note = models.Note(
        video_id=video_id,
        client_note_id=client_note_id,
        timestamp_sec=note.timestamp,
        content=note.content,
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note


def delete_note(db: Session, user_id: str, note_id: int) -> bool:
    """Delete a note if it belongs to a user's video."""
    db_note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not db_note:
        return False
    # Ensure the note's video belongs to user
    video = db.query(models.Video).filter(
        models.Video.id == db_note.video_id,
        models.Video.user_id == user_id,
    ).first()
    if not video:
        return False
    db.delete(db_note)
    db.commit()
    return True


def upsert_video_from_import(db: Session, user_id: str, import_video: schemas.ImportVideo) -> models.Video:
    """Upsert video from import data for a user."""
    db_video = get_video(db, user_id, import_video.id)
    
    if db_video:
        # Update existing video
        db_video.title = import_video.title
        db_video.url = import_video.url
        
        # Remove existing tags and add new ones
        db.query(models.VideoTag).filter(models.VideoTag.video_id == import_video.id).delete()
        if import_video.tags:
            add_tags_to_video(db, import_video.id, import_video.tags)
    else:
        # Create new video
        db_video = models.Video(
            id=import_video.id,
            user_id=user_id,
            url=import_video.url,
            title=import_video.title,
        )
        db.add(db_video)
        db.flush()
        
        if import_video.tags:
            add_tags_to_video(db, import_video.id, import_video.tags)
    
    return db_video


def upsert_note_from_import(db: Session, user_id: str, video_id: str, import_note: schemas.ImportNote) -> models.Note:
    """Upsert note from import data (idempotent) for a user's video."""
    client_note_id = str(import_note.id)
    
    # Check if note already exists
    existing_note = db.query(models.Note).join(models.Video).filter(
        models.Note.video_id == video_id,
        models.Note.client_note_id == client_note_id,
        models.Video.user_id == user_id,
    ).first()
    
    if existing_note:
        # Update existing note
        existing_note.timestamp_sec = import_note.timestamp
        existing_note.content = import_note.content
        return existing_note
    else:
        # Create new note
        db_note = models.Note(
            video_id=video_id,
            client_note_id=client_note_id,
            timestamp_sec=import_note.timestamp,
            content=import_note.content
        )
        db.add(db_note)
        return db_note