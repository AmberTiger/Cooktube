/**
 * Data migration utilities to fix inconsistent video IDs
 */

import { extractVideoId } from './youtube';
import { getVideosFromStorage, saveVideosToStorage, STORAGE_KEYS } from './storage';

/**
 * Migrate existing videos to ensure consistent ID usage
 * This fixes any videos that might have been stored with inconsistent IDs
 */
export const migrateVideoData = () => {
  try {
    const videos = getVideosFromStorage();
    let hasChanges = false;
    
    const migratedVideos = videos.map(video => {
      // Re-extract video ID from URL to ensure consistency
      const correctId = extractVideoId(video.url);
      
      if (correctId && correctId !== video.id) {
        console.log(`Migrating video ID from ${video.id} to ${correctId}`);
        
        // Migrate notes if they exist
        migrateNotesForVideo(video.id, correctId);
        
        hasChanges = true;
        return {
          ...video,
          id: correctId
        };
      }
      
      return video;
    });
    
    if (hasChanges) {
      saveVideosToStorage(migratedVideos);
      console.log('Video data migration completed');
      return migratedVideos;
    }
    
    return videos;
  } catch (error) {
    console.error('Error during video data migration:', error);
    return getVideosFromStorage(); // Return original data if migration fails
  }
};

/**
 * Migrate notes from old video ID to new video ID
 */
const migrateNotesForVideo = (oldId, newId) => {
  try {
    const oldNotesKey = `${STORAGE_KEYS.NOTES_PREFIX}${oldId}`;
    const newNotesKey = `${STORAGE_KEYS.NOTES_PREFIX}${newId}`;
    
    const oldNotes = localStorage.getItem(oldNotesKey);
    if (oldNotes) {
      // Copy notes to new key
      localStorage.setItem(newNotesKey, oldNotes);
      // Remove old notes
      localStorage.removeItem(oldNotesKey);
      console.log(`Migrated notes from ${oldId} to ${newId}`);
    }
  } catch (error) {
    console.error('Error migrating notes:', error);
  }
};

/**
 * Clean up any orphaned note entries
 * Removes notes that don't have corresponding videos
 */
export const cleanupOrphanedNotes = () => {
  try {
    const videos = getVideosFromStorage();
    const videoIds = new Set(videos.map(v => v.id));
    
    // Get all localStorage keys
    const allKeys = Object.keys(localStorage);
    const noteKeys = allKeys.filter(key => key.startsWith(STORAGE_KEYS.NOTES_PREFIX));
    
    let cleanedCount = 0;
    
    noteKeys.forEach(noteKey => {
      const videoId = noteKey.replace(STORAGE_KEYS.NOTES_PREFIX, '');
      if (!videoIds.has(videoId)) {
        localStorage.removeItem(noteKey);
        cleanedCount++;
        console.log(`Removed orphaned notes for video: ${videoId}`);
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} orphaned note entries`);
    }
  } catch (error) {
    console.error('Error cleaning up orphaned notes:', error);
  }
};

/**
 * Run all data migrations
 */
export const runDataMigrations = () => {
  try {
    const migratedVideos = migrateVideoData();
    cleanupOrphanedNotes();
    return migratedVideos;
  } catch (error) {
    console.error('Error during data migrations:', error);
    // Fallback to direct storage read if migration fails
    return getVideosFromStorage();
  }
};