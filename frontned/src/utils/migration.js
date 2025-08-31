/**
 * Migration utilities for moving data from localStorage to backend
 */

import { getVideosFromStorage, STORAGE_KEYS } from './storage';
import { importData, checkBackendHealth } from './api';

// Migration status key
const MIGRATION_STATUS_KEY = 'cooktube.migrated';

/**
 * Check if migration has been completed
 */
export const isMigrationCompleted = () => {
  try {
    return localStorage.getItem(MIGRATION_STATUS_KEY) === 'true';
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
};

/**
 * Mark migration as completed
 */
export const markMigrationCompleted = () => {
  try {
    localStorage.setItem(MIGRATION_STATUS_KEY, 'true');
    return true;
  } catch (error) {
    console.error('Error marking migration as completed:', error);
    return false;
  }
};

/**
 * Reset migration status (for testing)
 */
export const resetMigrationStatus = () => {
  try {
    localStorage.removeItem(MIGRATION_STATUS_KEY);
    return true;
  } catch (error) {
    console.error('Error resetting migration status:', error);
    return false;
  }
};

/**
 * Collect all localStorage data for migration
 */
export const collectLocalStorageData = () => {
  try {
    // Get all videos
    const videos = getVideosFromStorage();
    
    // Get all notes organized by video ID
    const notesByVideoId = {};
    
    // Find all note keys in localStorage
    const allKeys = Object.keys(localStorage);
    const noteKeys = allKeys.filter(key => key.startsWith(STORAGE_KEYS.NOTES_PREFIX));
    
    noteKeys.forEach(noteKey => {
      const videoId = noteKey.replace(STORAGE_KEYS.NOTES_PREFIX, '');
      try {
        const notesData = localStorage.getItem(noteKey);
        if (notesData) {
          const notes = JSON.parse(notesData);
          if (Array.isArray(notes) && notes.length > 0) {
            notesByVideoId[videoId] = notes;
          }
        }
      } catch (error) {
        console.warn(`Error parsing notes for video ${videoId}:`, error);
      }
    });
    
    return {
      videos,
      notesByVideoId
    };
  } catch (error) {
    console.error('Error collecting localStorage data:', error);
    throw new Error('Failed to collect localStorage data for migration');
  }
};

/**
 * Create backup of localStorage data before migration
 */
export const createBackup = () => {
  try {
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const backupData = collectLocalStorageData();
    
    // Store backup with timestamp
    const backupKey = `cooktube.backup.${timestamp}`;
    localStorage.setItem(backupKey, JSON.stringify(backupData));
    
    // Also backup individual keys with .backup suffix
    const videos = getVideosFromStorage();
    if (videos.length > 0) {
      localStorage.setItem(`${STORAGE_KEYS.VIDEOS}.backup.${timestamp}`, 
        localStorage.getItem(STORAGE_KEYS.VIDEOS));
    }
    
    // Backup note keys
    const allKeys = Object.keys(localStorage);
    const noteKeys = allKeys.filter(key => key.startsWith(STORAGE_KEYS.NOTES_PREFIX));
    
    noteKeys.forEach(noteKey => {
      const noteData = localStorage.getItem(noteKey);
      if (noteData) {
        localStorage.setItem(`${noteKey}.backup.${timestamp}`, noteData);
      }
    });
    
    console.log(`✅ Backup created with timestamp: ${timestamp}`);
    return backupKey;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw new Error('Failed to create backup');
  }
};

/**
 * Perform the migration from localStorage to backend
 */
export const performMigration = async () => {
  try {
    console.log('🚀 Starting migration...');
    
    // Check if backend is available
    const isBackendAvailable = await checkBackendHealth();
    if (!isBackendAvailable) {
      throw new Error('Backend is not available. Please ensure the server is running.');
    }
    
    // Collect data to migrate
    const migrationData = collectLocalStorageData();
    
    if (migrationData.videos.length === 0) {
      console.log('ℹ️ No videos found to migrate');
      markMigrationCompleted();
      return {
        success: true,
        message: 'No data to migrate',
        stats: { videos_created: 0, notes_created: 0 }
      };
    }
    
    console.log(`📊 Found ${migrationData.videos.length} videos and notes for ${Object.keys(migrationData.notesByVideoId).length} videos`);
    
    // Create backup before migration
    const backupKey = createBackup();
    
    // Perform the import
    const result = await importData(migrationData);
    
    if (result.success) {
      // Mark migration as completed
      markMigrationCompleted();
      console.log('✅ Migration completed successfully');
      console.log('📈 Stats:', result.stats);
      
      if (result.errors && result.errors.length > 0) {
        console.warn('⚠️ Migration completed with warnings:', result.errors);
      }
      
      return {
        ...result,
        backupKey
      };
    } else {
      throw new Error(`Migration failed: ${result.message}`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

/**
 * Check if migration is needed
 */
export const isMigrationNeeded = () => {
  // If already migrated, no need to migrate again
  if (isMigrationCompleted()) {
    return false;
  }
  
  // Check if there's any data to migrate
  const videos = getVideosFromStorage();
  return videos.length > 0;
};

/**
 * Get migration status information
 */
export const getMigrationStatus = () => {
  const isCompleted = isMigrationCompleted();
  const isNeeded = isMigrationNeeded();
  const data = collectLocalStorageData();
  
  return {
    isCompleted,
    isNeeded,
    videoCount: data.videos.length,
    noteCount: Object.values(data.notesByVideoId).reduce((total, notes) => total + notes.length, 0),
    hasData: data.videos.length > 0
  };
};