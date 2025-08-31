/**
 * Utility functions for localStorage operations
 */

// Keys for localStorage
export const STORAGE_KEYS = {
  VIDEOS: 'cooktube-videos',
  NOTES_PREFIX: 'cooktube-notes-'
};

/**
 * Get all videos from localStorage
 */
export const getVideosFromStorage = () => {
  try {
    const savedVideos = localStorage.getItem(STORAGE_KEYS.VIDEOS);
    if (savedVideos) {
      return JSON.parse(savedVideos);
    }
    return [];
  } catch (error) {
    console.error('Error loading videos from localStorage:', error);
    return [];
  }
};

/**
 * Save videos to localStorage
 */
export const saveVideosToStorage = (videos) => {
  try {
    localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(videos));
  } catch (error) {
    console.error('Error saving videos to localStorage:', error);
  }
};

/**
 * Get notes for a specific video from localStorage
 */
export const getNotesFromStorage = (videoId) => {
  try {
    const notesKey = `${STORAGE_KEYS.NOTES_PREFIX}${videoId}`;
    const savedNotes = localStorage.getItem(notesKey);
    if (savedNotes) {
      return JSON.parse(savedNotes);
    }
    return [];
  } catch (error) {
    console.error('Error loading notes from localStorage:', error);
    return [];
  }
};

/**
 * Save notes for a specific video to localStorage
 */
export const saveNotesToStorage = (videoId, notes) => {
  try {
    const notesKey = `${STORAGE_KEYS.NOTES_PREFIX}${videoId}`;
    localStorage.setItem(notesKey, JSON.stringify(notes));
  } catch (error) {
    console.error('Error saving notes to localStorage:', error);
  }
};

/**
 * Delete notes for a specific video
 */
export const deleteNotesFromStorage = (videoId) => {
  try {
    const notesKey = `${STORAGE_KEYS.NOTES_PREFIX}${videoId}`;
    localStorage.removeItem(notesKey);
    console.log('Notes deleted for video:', videoId);
  } catch (error) {
    console.error('Error deleting notes from localStorage:', error);
  }
};

/**
 * Get a specific video by ID
 */
export const getVideoById = (videoId) => {
  const videos = getVideosFromStorage();
  return videos.find(video => video.id === videoId) || null;
};