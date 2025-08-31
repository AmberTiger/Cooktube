"""API routes for Cooktube application."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.ai_utils import extract_ingredients_from_text
from app.database import get_db
from app.utils import extract_video_id

router = APIRouter()

# Import auth dependency to identify current user
from app.auth import get_current_user


@router.post("/import", response_model=schemas.ImportResponse)
def import_data(import_request: schemas.ImportRequest, request: Request, db: Session = Depends(get_db)):
    """Import videos and notes from localStorage."""
    try:
        stats = {
            "videos_created": 0,
            "videos_updated": 0,
            "notes_created": 0,
            "notes_updated": 0,
            "tags_created": 0
        }
        errors = []
        
        # Identify current user
        user = request.scope.get('user')  # will set shortly via dependency/ middleware; fallback below
        if not user:
            # Lightweight inline parse like in auth.get_current_user
            from app.auth import _verify_token
            token = request.cookies.get('access_token')
            payload = _verify_token(token) if token else None
            if not payload:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
            user = {"id": payload.get("sub")}
        current_user_id = user["id"]

        # Track existing tags count for this user
        existing_tags_count = len(crud.get_all_tags(db, current_user_id))
        
        # Import videos
        for import_video in import_request.videos:
            try:
                # Validate video ID
                extracted_id = extract_video_id(import_video.url)
                if not extracted_id or extracted_id != import_video.id:
                    errors.append(f"Invalid video ID/URL mismatch for {import_video.id}")
                    continue
                
                # Check if video exists
                existing_video = crud.get_video(db, current_user_id, import_video.id)
                
                # Upsert video
                crud.upsert_video_from_import(db, current_user_id, import_video)
                
                if existing_video:
                    stats["videos_updated"] += 1
                else:
                    stats["videos_created"] += 1
                    
            except Exception as e:
                errors.append(f"Error importing video {import_video.id}: {str(e)}")
        
        # Import notes
        for video_id, notes in import_request.notesByVideoId.items():
            # Verify video exists
            if not crud.get_video(db, current_user_id, video_id):
                errors.append(f"Cannot import notes for non-existent video {video_id}")
                continue
                
            for import_note in notes:
                try:
                    # Check if note exists
                    existing_note = db.query(models.Note).join(models.Video).filter(
                        models.Note.video_id == video_id,
                        models.Note.client_note_id == str(import_note.id),
                        models.Video.user_id == current_user_id,
                    ).first()
                    
                    # Upsert note
                    crud.upsert_note_from_import(db, current_user_id, video_id, import_note)
                    
                    if existing_note:
                        stats["notes_updated"] += 1
                    else:
                        stats["notes_created"] += 1
                        
                except Exception as e:
                    errors.append(f"Error importing note {import_note.id} for video {video_id}: {str(e)}")
        
        # Calculate new tags created
        new_tags_count = len(crud.get_all_tags(db, current_user_id))
        stats["tags_created"] = new_tags_count - existing_tags_count
        
        # Commit all changes
        db.commit()
        
        return schemas.ImportResponse(
            success=len(errors) == 0,
            message="Import completed successfully" if len(errors) == 0 else f"Import completed with {len(errors)} errors",
            stats=stats,
            errors=errors
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {str(e)}"
        )


@router.get("/videos", response_model=List[schemas.VideoResponse])
def get_videos(skip: int = 0, limit: int = 100, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all videos for the current user."""
    videos = crud.get_videos(db, current_user['id'], skip=skip, limit=limit)
    
    # Add tags to each video
    result = []
    for video in videos:
        video_dict = {
            "id": video.id,
            "url": video.url,
            "title": video.title,
            "created_at": video.created_at,
            "updated_at": video.updated_at,
            "tags": crud.get_video_tags(db, current_user['id'], video.id)
        }
        result.append(schemas.VideoResponse(**video_dict))
    
    return result


@router.get("/videos/{video_id}", response_model=schemas.VideoWithNotes)
def get_video(video_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get a specific video with notes for the current user."""
    db_video = crud.get_video(db, current_user['id'], video_id)
    if not db_video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Get tags and notes
    tags = crud.get_video_tags(db, current_user['id'], video_id)
    notes = crud.get_video_notes(db, current_user['id'], video_id)
    
    # Convert notes to response format
    note_responses = []
    for note in notes:
        note_responses.append(schemas.NoteResponse(
            id=note.id,
            client_note_id=note.client_note_id,
            video_id=note.video_id,
            timestamp=note.timestamp_sec,
            content=note.content,
            created_at=note.created_at
        ))
    
    return schemas.VideoWithNotes(
        id=db_video.id,
        url=db_video.url,
        title=db_video.title,
        tags=tags,
        created_at=db_video.created_at,
        updated_at=db_video.updated_at,
        notes=note_responses
    )


@router.post("/videos", response_model=schemas.VideoResponse)
def create_video(video: schemas.VideoCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new video for the current user."""
    # Extract video ID from URL
    video_id = extract_video_id(video.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")
    
    # Check if video already exists for this user
    if crud.get_video(db, current_user['id'], video_id):
        raise HTTPException(status_code=400, detail="Video already exists")
    
    db_video = crud.create_video(db, current_user['id'], video, video_id)
    tags = crud.get_video_tags(db, current_user['id'], video_id)
    
    return schemas.VideoResponse(
        id=db_video.id,
        url=db_video.url,
        title=db_video.title,
        tags=tags,
        created_at=db_video.created_at,
        updated_at=db_video.updated_at
    )


@router.patch("/videos/{video_id}", response_model=schemas.VideoResponse)
def update_video(video_id: str, video_update: schemas.VideoUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update an existing video for the current user."""
    db_video = crud.update_video(db, current_user['id'], video_id, video_update)
    if not db_video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    tags = crud.get_video_tags(db, current_user['id'], video_id)
    
    return schemas.VideoResponse(
        id=db_video.id,
        url=db_video.url,
        title=db_video.title,
        tags=tags,
        created_at=db_video.created_at,
        updated_at=db_video.updated_at
    )


@router.delete("/videos/{video_id}")
def delete_video(video_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a video for the current user."""
    if not crud.delete_video(db, current_user['id'], video_id):
        raise HTTPException(status_code=404, detail="Video not found")
    
    return {"message": "Video deleted successfully"}


@router.get("/videos/{video_id}/notes", response_model=List[schemas.NoteResponse])
def get_video_notes(video_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all notes for a video (current user only)."""
    # Verify video exists for this user
    if not crud.get_video(db, current_user['id'], video_id):
        raise HTTPException(status_code=404, detail="Video not found")
    
    notes = crud.get_video_notes(db, current_user['id'], video_id)
    
    return [
        schemas.NoteResponse(
            id=note.id,
            client_note_id=note.client_note_id,
            video_id=note.video_id,
            timestamp=note.timestamp_sec,
            content=note.content,
            created_at=note.created_at
        )
        for note in notes
    ]


@router.post("/videos/{video_id}/notes", response_model=schemas.NoteResponse)
def create_note(video_id: str, note: schemas.NoteCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new note for a user's video."""
    # Verify video exists for this user
    if not crud.get_video(db, current_user['id'], video_id):
        raise HTTPException(status_code=404, detail="Video not found")
    
    db_note = crud.create_note(db, current_user['id'], video_id, note)
    if not db_note:
        raise HTTPException(status_code=404, detail="Video not found")
    
    return schemas.NoteResponse(
        id=db_note.id,
        client_note_id=db_note.client_note_id,
        video_id=db_note.video_id,
        timestamp=db_note.timestamp_sec,
        content=db_note.content,
        created_at=db_note.created_at
    )


@router.delete("/notes/{note_id}")
def delete_note(note_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a note for the current user (owned video only)."""
    if not crud.delete_note(db, current_user['id'], note_id):
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {"message": "Note deleted successfully"}


@router.get("/tags", response_model=List[schemas.TagResponse])
def get_tags(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all tags for the current user."""
    tags = crud.get_all_tags(db, current_user['id'])
    return [
        schemas.TagResponse(
            id=tag.id,
            name=tag.name,
            created_at=tag.created_at
        )
        for tag in tags
    ]


@router.post("/videos/{video_id}/analyze_subtitles")
def analyze_subtitles(video_id: str, body: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Analyze provided subtitle text to extract ingredient-like tags and attach them to the video.

    Request JSON body: { "subtitles": string }
    Response JSON body: { "tags": ["salt", "tomato", ...] }
    """
    # Verify video exists and belongs to user
    db_video = crud.get_video(db, current_user['id'], video_id)
    if not db_video:
        raise HTTPException(status_code=404, detail="Video not found")

    subtitles = (body or {}).get("subtitles", "")
    if not isinstance(subtitles, str) or not subtitles.strip():
        raise HTTPException(status_code=400, detail="'subtitles' is required and must be a non-empty string")

    try:
        tags = extract_ingredients_from_text(subtitles)
        # Merge with existing tags, dedupe, cap to 20 as per schema
        existing = set(crud.get_video_tags(db, current_user['id'], video_id))
        to_add = [t for t in tags if t not in existing]
        if to_add:
            crud.add_tags_to_video(db, video_id, to_add)
            db.commit()
        return {"tags": list(existing.union(tags))[:20]}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to analyze subtitles: {str(e)}")
