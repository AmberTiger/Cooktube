/**
 * Debug utilities for localStorage issues
 */

import { STORAGE_KEYS } from './storage';

/**
 * Debug localStorage contents
 */
export const debugLocalStorage = () => {
  console.log('=== localStorage Debug ===');
  
  // Check videos
  const videosData = localStorage.getItem(STORAGE_KEYS.VIDEOS);
  console.log('Videos key:', STORAGE_KEYS.VIDEOS);
  console.log('Videos raw data:', videosData);
  
  if (videosData) {
    try {
      const videos = JSON.parse(videosData);
      console.log('Videos parsed:', videos.length, 'videos');
      videos.forEach((video, index) => {
        console.log(`Video ${index + 1}:`, {
          id: video.id,
          title: video.title?.substring(0, 50) + '...',
          url: video.url
        });
      });
    } catch (error) {
      console.error('Error parsing videos data:', error);
    }
  } else {
    console.log('No videos data found');
  }
  
  // Check notes
  const allKeys = Object.keys(localStorage);
  const noteKeys = allKeys.filter(key => key.startsWith(STORAGE_KEYS.NOTES_PREFIX));
  console.log('Note keys found:', noteKeys.length);
  
  noteKeys.forEach(key => {
    const notesData = localStorage.getItem(key);
    try {
      const notes = JSON.parse(notesData);
      console.log(`Notes for ${key}:`, notes.length, 'notes');
    } catch (error) {
      console.error(`Error parsing notes for ${key}:`, error);
    }
  });
  
  console.log('=== End localStorage Debug ===');
};

/**
 * Check if localStorage is available and working
 */
export const testLocalStorage = () => {
  try {
    const testKey = 'cooktube-test';
    const testValue = 'test-data';
    
    localStorage.setItem(testKey, testValue);
    const retrieved = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    
    if (retrieved === testValue) {
      console.log('✅ localStorage is working correctly');
      return true;
    } else {
      console.error('❌ localStorage test failed - data mismatch');
      return false;
    }
  } catch (error) {
    console.error('❌ localStorage is not available:', error);
    return false;
  }
};

/**
 * Backup localStorage data to console (for manual recovery)
 */
export const backupLocalStorageData = () => {
  const backup = {};
  
  try {
    // Backup videos
    const videosData = localStorage.getItem(STORAGE_KEYS.VIDEOS);
    if (videosData) {
      backup.videos = videosData;
    }
    
    // Backup all notes
    const allKeys = Object.keys(localStorage);
    const noteKeys = allKeys.filter(key => key.startsWith(STORAGE_KEYS.NOTES_PREFIX));
    
    backup.notes = {};
    noteKeys.forEach(key => {
      backup.notes[key] = localStorage.getItem(key);
    });
    
    console.log('=== localStorage Backup ===');
    console.log('Copy this data to restore if needed:');
    console.log(JSON.stringify(backup, null, 2));
    console.log('=== End Backup ===');
    
    return backup;
  } catch (error) {
    console.error('Error creating backup:', error);
    return null;
  }
};

/**
 * Restore localStorage data from backup
 */
export const restoreLocalStorageData = (backup) => {
  try {
    if (backup.videos) {
      localStorage.setItem(STORAGE_KEYS.VIDEOS, backup.videos);
      console.log('✅ Videos restored');
    }
    
    if (backup.notes) {
      Object.entries(backup.notes).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
      console.log('✅ Notes restored');
    }
    
    console.log('✅ Data restoration completed');
    return true;
  } catch (error) {
    console.error('❌ Error restoring data:', error);
    return false;
  }
};