/**
 * API client for communicating with the Cooktube backend
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Make an API request with error handling
 */
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    cache: 'no-store',
    credentials: 'include', // include http-only auth cookies
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      // Attempt transparent refresh on 401 (unauthorized)
      if (response.status === 401 && !options.__retry) {
        try {
          await fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
          // retry original request once
          return await apiRequest(endpoint, { ...options, __retry: true });
        } catch (e) {
          // fallthrough to error
        }
      }
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.detail || errorData.message || `HTTP ${response.status}`,
        response.status,
        errorData
      );
    }

    // Handle empty 204 responses
    if (response.status === 204) return null;

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or other errors
    throw new ApiError(
      'Network error or server unavailable',
      0,
      { originalError: error.message }
    );
  }
};

/**
 * Check if the backend is available
 */
export const checkBackendHealth = async () => {
  try {
    // Try common patterns: root /health (for external backends) then /api/health (for Vercel functions)
    const targets = [
      `${API_BASE_URL.replace(/\/api$/, '')}/health`,
    ];

    for (const url of targets) {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(url, { method: 'GET', credentials: 'include', signal: controller.signal });
        clearTimeout(id);

        const contentType = res.headers.get('content-type') || '';
        if (!res.ok || !contentType.includes('application/json')) continue;
        const data = await res.json().catch(() => null);
        if (data && data.status === "healthy") return true;
      } catch (_) {
        // try next target
      }
    }
    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Import data from localStorage to backend
 */
export const importData = async (importData) => {
  return apiRequest('/import', {
    method: 'POST',
    body: JSON.stringify(importData),
  });
};

/**
 * Get all videos
 */
export const getVideos = async (skip = 0, limit = 100) => {
  const params = new URLSearchParams({ skip: skip.toString(), limit: limit.toString() });
  return apiRequest(`/videos?${params}`);
};

/**
 * Get a specific video with notes
 */
export const getVideo = async (videoId) => {
  return apiRequest(`/videos/${videoId}`);
};

/**
 * Create a new video
 */
export const createVideo = async (videoData) => {
  return apiRequest('/videos', {
    method: 'POST',
    body: JSON.stringify(videoData),
  });
};

/**
 * Update an existing video
 */
export const updateVideo = async (videoId, updateData) => {
  return apiRequest(`/videos/${videoId}`, {
    method: 'PATCH',
    body: JSON.stringify(updateData),
  });
};

/**
 * Delete a video
 */
export const deleteVideo = async (videoId) => {
  return apiRequest(`/videos/${videoId}`, {
    method: 'DELETE',
  });
};

/**
 * Get notes for a video
 */
export const getVideoNotes = async (videoId) => {
  return apiRequest(`/videos/${videoId}/notes`);
};

/**
 * Create a new note
 */
export const createNote = async (videoId, noteData) => {
  return apiRequest(`/videos/${videoId}/notes`, {
    method: 'POST',
    body: JSON.stringify(noteData),
  });
};

/**
 * Delete a note
 */
export const deleteNote = async (noteId) => {
  return apiRequest(`/notes/${noteId}`, {
    method: 'DELETE',
  });
};

/**
 * Get all tags
 */
export const getTags = async () => {
  return apiRequest('/tags');
};

/**
 * Analyze subtitles for a specific video and return extracted tags
 */
export const analyzeSubtitles = async (videoId, subtitles) => {
  return apiRequest(`/videos/${videoId}/analyze_subtitles`, {
    method: 'POST',
    body: JSON.stringify({ subtitles })
  });
};

export { ApiError };