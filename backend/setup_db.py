#!/usr/bin/env python3
"""
Database setup script for Cooktube backend
"""

import os
import sys
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

def setup_database():
    """Setup database tables directly using SQLAlchemy"""
    try:
        from app.database import engine, Base
        from app import models  # Import models to register them
        
        print("🔧 Creating database tables...")
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        print("✅ Database tables created successfully")
        return True
        
    except Exception as e:
        print(f"❌ Error creating database: {e}")
        return False

def check_database():
    """Check if database is working"""
    try:
        from app.database import SessionLocal
        from app.models import Video
        
        db = SessionLocal()
        try:
            # Try a simple query
            count = db.query(Video).count()
            print(f"✅ Database connection successful. Found {count} videos.")
            return True
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Database check failed: {e}")
        return False

def main():
    """Main setup function"""
    print("🍳 Cooktube Database Setup")
    print("=" * 30)
    
    # Setup environment
    env_file = Path(".env")
    env_example = Path(".env.example")
    
    if not env_file.exists() and env_example.exists():
        print("📝 Creating .env file from template")
        import shutil
        shutil.copy(env_example, env_file)
    
    # Setup database
    if not setup_database():
        sys.exit(1)
    
    # Check database
    if not check_database():
        sys.exit(1)
    
    print("\n🎉 Database setup completed!")
    print("You can now start the server with: python run_dev.py")

if __name__ == "__main__":
    main()