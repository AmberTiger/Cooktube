#!/usr/bin/env python3
"""
Database inspector script for CookTube
This script helps you view and inspect your database data
"""

import sys
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

def inspect_database():
    """Inspect database contents"""
    try:
        from app.database import SessionLocal
        from app.models import Video, Tag, Note, VideoTag
        
        db = SessionLocal()
        try:
            print("🍳 CookTube Database Inspector")
            print("=" * 40)
            
            # Count records in each table
            video_count = db.query(Video).count()
            tag_count = db.query(Tag).count()
            note_count = db.query(Note).count()
            video_tag_count = db.query(VideoTag).count()
            
            print(f"\n📊 Record Counts:")
            print(f"  Videos: {video_count}")
            print(f"  Tags: {tag_count}")
            print(f"  Notes: {note_count}")
            print(f"  Video-Tag Relations: {video_tag_count}")
            
            # Show recent videos
            if video_count > 0:
                print(f"\n🎥 Recent Videos (last 5):")
                recent_videos = db.query(Video).order_by(Video.created_at.desc()).limit(5).all()
                for video in recent_videos:
                    print(f"  ID: {video.id}")
                    print(f"  Title: {video.title}")
                    print(f"  URL: {video.url}")
                    print(f"  Created: {video.created_at}")
                    print(f"  Notes: {len(video.notes)}")
                    print(f"  Tags: {len(video.video_tags)}")
                    print("  " + "-" * 30)
            
            # Show all tags
            if tag_count > 0:
                print(f"\n🏷️  All Tags:")
                tags = db.query(Tag).order_by(Tag.name).all()
                for tag in tags:
                    video_count_for_tag = len(tag.video_tags)
                    print(f"  {tag.name} ({video_count_for_tag} videos)")
            
            # Show recent notes
            if note_count > 0:
                print(f"\n📝 Recent Notes (last 5):")
                recent_notes = db.query(Note).order_by(Note.created_at.desc()).limit(5).all()
                for note in recent_notes:
                    print(f"  Video: {note.video.title[:50]}...")
                    print(f"  Time: {note.timestamp_sec}s")
                    print(f"  Content: {note.content[:100]}...")
                    print(f"  Created: {note.created_at}")
                    print("  " + "-" * 30)
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error inspecting database: {e}")
        return False
    
    return True

def show_video_details(video_id):
    """Show detailed information about a specific video"""
    try:
        from app.database import SessionLocal
        from app.models import Video
        
        db = SessionLocal()
        try:
            video = db.query(Video).filter(Video.id == video_id).first()
            if not video:
                print(f"❌ Video with ID '{video_id}' not found")
                return
            
            print(f"\n🎥 Video Details: {video.title}")
            print("=" * 50)
            print(f"ID: {video.id}")
            print(f"URL: {video.url}")
            print(f"Created: {video.created_at}")
            print(f"Updated: {video.updated_at}")
            
            print(f"\n🏷️  Tags ({len(video.video_tags)}):")
            for vt in video.video_tags:
                print(f"  - {vt.tag.name}")
            
            print(f"\n📝 Notes ({len(video.notes)}):")
            for note in sorted(video.notes, key=lambda n: n.timestamp_sec):
                print(f"  [{note.timestamp_sec}s] {note.content}")
                
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error showing video details: {e}")

def main():
    """Main function"""
    if len(sys.argv) > 1:
        # Show specific video details
        video_id = sys.argv[1]
        show_video_details(video_id)
    else:
        # Show general database overview
        inspect_database()

if __name__ == "__main__":
    main()