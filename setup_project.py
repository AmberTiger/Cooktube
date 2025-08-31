#!/usr/bin/env python3
"""
Setup script for the complete Cooktube project
"""

import os
import sys
import subprocess
from pathlib import Path

def run_command(cmd, cwd=None, description=""):
    """Run a command and handle errors"""
    if description:
        print(f"🔧 {description}")
    
    try:
        result = subprocess.run(cmd, shell=True, cwd=cwd, check=True, 
                              capture_output=True, text=True)
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {e}")
        print(f"Output: {e.stdout}")
        print(f"Error: {e.stderr}")
        return False, e.stderr

def setup_backend():
    """Setup the backend"""
    print("\n🐍 Setting up Backend...")
    
    backend_dir = Path("backend")
    if not backend_dir.exists():
        print("❌ Backend directory not found")
        return False
    
    # Install Python dependencies
    success, output = run_command(
        "pip install -r requirements.txt", 
        cwd=backend_dir,
        description="Installing Python dependencies"
    )
    if not success:
        return False
    
    # Setup environment file
    env_file = backend_dir / ".env"
    env_example = backend_dir / ".env.example"
    
    if not env_file.exists() and env_example.exists():
        print("📝 Creating .env file from template")
        import shutil
        shutil.copy(env_example, env_file)
    
    # Setup database
    success, output = run_command(
        "python setup_db.py",
        cwd=backend_dir,
        description="Setting up database"
    )
    if not success:
        return False
    
    print("✅ Backend setup completed")
    return True

def setup_frontend():
    """Setup the frontend"""
    print("\n⚛️ Setting up Frontend...")
    
    frontend_dir = Path("frontned")  # Note: keeping original typo for consistency
    if not frontend_dir.exists():
        print("❌ Frontend directory not found")
        return False
    
    # Install Node.js dependencies
    success, output = run_command(
        "npm install",
        cwd=frontend_dir,
        description="Installing Node.js dependencies"
    )
    if not success:
        return False
    
    print("✅ Frontend setup completed")
    return True

def check_prerequisites():
    """Check if required tools are installed"""
    print("🔍 Checking prerequisites...")
    
    # Check Python
    try:
        result = subprocess.run([sys.executable, "--version"], 
                              capture_output=True, text=True)
        print(f"✅ Python: {result.stdout.strip()}")
    except:
        print("❌ Python not found")
        return False
    
    # Check Node.js
    try:
        result = subprocess.run(["node", "--version"], 
                              capture_output=True, text=True)
        print(f"✅ Node.js: {result.stdout.strip()}")
    except:
        print("❌ Node.js not found - please install Node.js 16+")
        return False
    
    # Check npm
    try:
        result = subprocess.run(["npm", "--version"], 
                              capture_output=True, text=True)
        print(f"✅ npm: {result.stdout.strip()}")
    except:
        print("❌ npm not found")
        return False
    
    return True

def print_next_steps():
    """Print instructions for running the project"""
    print("\n🎉 Setup completed successfully!")
    print("\n📋 Next steps:")
    print("\n1. Start the backend server:")
    print("   cd backend")
    print("   python run_dev.py")
    print("   # Or manually: python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    print("\n   Note: Using SQLite database (no additional setup required)")
    
    print("\n2. In a new terminal, start the frontend:")
    print("   cd frontned")
    print("   npm start")
    
    print("\n3. Open your browser:")
    print("   Frontend: http://localhost:3000")
    print("   Backend API docs: http://localhost:8000/docs")
    
    print("\n4. Test the migration:")
    print("   - Add some videos in the frontend")
    print("   - Restart the frontend")
    print("   - You should see a migration banner")
    print("   - Click 'Migrate Now' to move data to backend")

def main():
    """Main setup function"""
    print("🍳 Cooktube Project Setup")
    print("=" * 50)
    
    # Check prerequisites
    if not check_prerequisites():
        print("\n❌ Prerequisites check failed")
        sys.exit(1)
    
    # Setup backend
    if not setup_backend():
        print("\n❌ Backend setup failed")
        sys.exit(1)
    
    # Setup frontend
    if not setup_frontend():
        print("\n❌ Frontend setup failed")
        sys.exit(1)
    
    # Print next steps
    print_next_steps()

if __name__ == "__main__":
    main()