/**
 * Data service that abstracts between localStorage and backend API
 * Provides offline fallback functionality
 */

import { 
  getVideosFromStorage, 
  getNotesFromStorage
} from './storage';
import { 
  getVideos as apiGetVideos,
  getVideo as apiGetVideo,
  createVideo as apiCreateVideo,
  updateVideo as apiUpdateVideo,
  deleteVideo as apiDeleteVideo,
  getVideoNotes as apiGetVideoNotes,
  createNote as apiCreateNote,
  deleteNote as apiDeleteNote,
  checkBackendHealth,
} from './api';

// Track backend availability
let isBackendAvailable = false;
let lastBackendCheck = 0;
const BACKEND_CHECK_INTERVAL = 30000; // 30 seconds

/**
 * Check if backend is available (with caching)
 */
const checkBackendAvailability = async () => {
  const now = Date.now();
  if (now - lastBackendCheck < BACKEND_CHECK_INTERVAL) {
    return isBackendAvailable;
  }
  
  try {
    isBackendAvailable = await checkBackendHealth();
    lastBackendCheck = now;
    return isBackendAvailable;
  } catch (error) {
    isBackendAvailable = false;
    lastBackendCheck = now;
    return false;
  }
};

/**
 * Determine if we should use backend or localStorage
 */
const shouldUseBackend = async () => {
  // Use backend whenever it's available
  return await checkBackendAvailability();
};

/**
 * Get all videos
 */
export const getVideos = async () => {
  const useBackend = await shouldUseBackend();
  
  if (useBackend) {
    try {
      return await apiGetVideos();
    } catch (error) {
      console.warn('Backend unavailable, falling back to localStorage:', error.message);
      // Fall back to localStorage
    }
  }
  
  // Use localStorage
  return getVideosFromStorage();
};

/**
 * Get a specific video
 */
export const getVideo = async (videoId) => {
  const useBackend = await shouldUseBackend();
  
  if (useBackend) {
    try {
      return await apiGetVideo(videoId);
    } catch (error) {
      if (error.status === 404) {
        return null;
      }
      console.warn('Backend unavailable, falling back to localStorage:', error.message);
      // Fall back to localStorage
    }
  }
  
  // Use localStorage
  const videos = getVideosFromStorage();
  const video = videos.find(v => v.id === videoId);
  if (!video) {
    return null;
  }
  
  // Add notes to video
  const notes = getNotesFromStorage(videoId);
  return {
    ...video,
    notes: notes.map(note => ({
      id: note.id,
      client_note_id: note.id.toString(),
      video_id: videoId,
      timestamp: note.timestamp,
      content: note.content,
      created_at: note.createdAt
    }))
  };
};

/**
 * Create a new video
 */
export const createVideo = async (videoData) => {
  const useBackend = await shouldUseBackend();
  
  if (useBackend) {
    try {
      return await apiCreateVideo(videoData);
    } catch (error) {
      console.warn('Backend unavailable, falling back to localStorage:', error.message);
      // Fall back to localStorage
    }
  }
  
  // Use localStorage - this will be handled by the existing App.js logic
  throw new Error('FALLBACK_TO_LOCALSTORAGE');
};

/**
 * Update a video
 */
export const updateVideo = async (videoId, updateData) => {
  const useBackend = await shouldUseBackend();
  
  if (useBackend) {
    try {
      return await apiUpdateVideo(videoId, updateData);
    } catch (error) {
      console.warn('Backend unavailable, falling back to localStorage:', error.message);
      // Fall back to localStorage
    }
  }
  
  // Use localStorage - this will be handled by the existing App.js logic
  throw new Error('FALLBACK_TO_LOCALSTORAGE');
};

/**
 * Delete a video
 */
export const deleteVideo = async (videoId) => {
  const useBackend = await shouldUseBackend();
  
  if (useBackend) {
    try {
      await apiDeleteVideo(videoId);
      return true;
    } catch (error) {
      console.warn('Backend unavailable, falling back to localStorage:', error.message);
      // Fall back to localStorage
    }
  }
  
  // Use localStorage - this will be handled by the existing App.js logic
  throw new Error('FALLBACK_TO_LOCALSTORAGE');
};

/**
 * Get notes for a video
 */
export const getVideoNotes = async (videoId) => {
  const useBackend = await shouldUseBackend();
  
  if (useBackend) {
    try {
      return await apiGetVideoNotes(videoId);
    } catch (error) {
      console.warn('Backend unavailable, falling back to localStorage:', error.message);
      // Fall back to localStorage
    }
  }
  
  // Use localStorage
  const notes = getNotesFromStorage(videoId);
  return notes.map(note => ({
    id: note.id,
    client_note_id: note.id.toString(),
    video_id: videoId,
    timestamp: note.timestamp,
    content: note.content,
    created_at: note.createdAt
  }));
};

/**
 * Create a new note
 */
export const createNote = async (videoId, noteData) => {
  const useBackend = await shouldUseBackend();
  
  if (useBackend) {
    try {
      return await apiCreateNote(videoId, {
        id: noteData.id?.toString(),
        timestamp: noteData.timestamp,
        content: noteData.content
      });
    } catch (error) {
      console.warn('Backend unavailable, falling back to localStorage:', error.message);
      // Fall back to localStorage
    }
  }
  
  // Use localStorage - this will be handled by the existing VideoDetail.js logic
  throw new Error('FALLBACK_TO_LOCALSTORAGE');
};

/**
 * Delete a note
 */
export const deleteNote = async (noteId, videoId) => {
  const useBackend = await shouldUseBackend();
  
  if (useBackend) {
    try {
      await apiDeleteNote(noteId);
      return true;
    } catch (error) {
      console.warn('Backend unavailable, falling back to localStorage:', error.message);
      // Fall back to localStorage
    }
  }
  
  // Use localStorage - this will be handled by the existing VideoDetail.js logic
  throw new Error('FALLBACK_TO_LOCALSTORAGE');
};

/**
 * Get current data source info
 */
export const getDataSourceInfo = async () => {
  const backendAvailable = await checkBackendAvailability();
  
  return {
    backendAvailable,
    usingBackend: backendAvailable,
    usingLocalStorage: !backendAvailable
  };
};