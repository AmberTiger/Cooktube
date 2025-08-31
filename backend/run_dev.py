#!/usr/bin/env python3
"""
Development server runner for Cooktube backend
"""

import os
import sys
import subprocess
from pathlib import Path

def check_requirements():
    """Check if all requirements are installed"""
    try:
        import fastapi
        import uvicorn
        import sqlalchemy
        import alembic
        print("✅ All required packages are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing package: {e}")
        print("Run: pip install -r requirements.txt")
        return False

def setup_database():
    """Setup database with direct table creation"""
    print("🔧 Setting up database...")
    
    # Check if .env exists
    if not Path(".env").exists():
        print("📝 Creating .env from .env.example...")
        if Path(".env.example").exists():
            import shutil
            shutil.copy(".env.example", ".env")
        else:
            print("❌ .env.example not found")
            return False
    
    # Setup database tables directly
    try:
        # Import here to avoid issues if dependencies aren't installed
        sys.path.insert(0, str(Path.cwd()))
        from app.database import engine, Base
        from app import models  # Import models to register them
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully")
        return True
        
    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        print("Trying alternative setup method...")
        
        # Try running the setup script
        try:
            result = subprocess.run([
                sys.executable, "setup_db.py"
            ], check=True, capture_output=True, text=True)
            print("✅ Database setup completed via setup script")
            return True
        except subprocess.CalledProcessError as setup_error:
            print(f"❌ Setup script also failed: {setup_error}")
            return False

def start_server():
    """Start the development server"""
    print("🚀 Starting development server...")
    print("📖 API docs will be available at: http://localhost:8000/docs")
    print("🔍 Health check: http://localhost:8000/health")
    print("Press Ctrl+C to stop the server")
    
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "app.main:app", 
            "--reload", 
            "--host", "0.0.0.0", 
            "--port", "8000"
        ], check=True)
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
    except subprocess.CalledProcessError as e:
        print(f"❌ Server failed to start: {e}")

def main():
    """Main function"""
    print("🍳 Cooktube Backend Development Server")
    print("=" * 40)
    
    # Change to backend directory if not already there
    if not Path("app").exists():
        backend_dir = Path(__file__).parent
        os.chdir(backend_dir)
        print(f"📁 Changed to directory: {backend_dir}")
    
    # Check requirements
    if not check_requirements():
        sys.exit(1)
    
    # Setup database
    if not setup_database():
        sys.exit(1)
    
    # Start server
    start_server()

if __name__ == "__main__":
    main()