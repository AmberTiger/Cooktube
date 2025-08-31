/**
 * Video helper utilities for consistent video ID handling and validation
 */

import { extractVideoId } from './youtube';
import { getVideosFromStorage } from './storage';

/**
 * Normalize video ID from route parameter
 * Handles cases where the ID might come from different sources
 * @param {string} routeId - Video ID from route parameter
 * @returns {string} - Normalized video ID
 */
export const normalizeVideoId = (routeId) => {
  if (!routeId) return null;
  
  // If it looks like a URL, extract the ID
  if (routeId.includes('youtube.com') || routeId.includes('youtu.be')) {
    return extractVideoId(routeId);
  }
  
  // If it's already an 11-character YouTube ID, return as-is
  if (/^[a-zA-Z0-9_-]{11}$/.test(routeId)) {
    return routeId;
  }
  
  return routeId;
};

/**
 * Find video by ID with fallback strategies
 * Tries multiple approaches to find the video in localStorage
 * @param {string} videoId - Video ID to search for
 * @returns {object|null} - Found video or null
 */
export const findVideoWithFallback = (videoId) => {
  const videos = getVideosFromStorage();
  
  if (!videos || videos.length === 0) {
    console.log('No videos found in storage');
    return null;
  }
  
  const normalizedId = normalizeVideoId(videoId);
  console.log('Searching for video with normalized ID:', normalizedId);
  console.log('Available video IDs:', videos.map(v => v.id));
  
  // Primary search: exact ID match
  let foundVideo = videos.find(video => video.id === normalizedId);
  
  if (foundVideo) {
    console.log('Found video by exact ID match');
    return foundVideo;
  }
  
  // Fallback 1: Search by extracting ID from stored URLs
  foundVideo = videos.find(video => {
    const extractedId = extractVideoId(video.url);
    return extractedId === normalizedId;
  });
  
  if (foundVideo) {
    console.log('Found video by URL extraction');
    return foundVideo;
  }
  
  // Fallback 2: Case-insensitive search
  foundVideo = videos.find(video => 
    video.id.toLowerCase() === normalizedId.toLowerCase()
  );
  
  if (foundVideo) {
    console.log('Found video by case-insensitive match');
    return foundVideo;
  }
  
  console.log('Video not found with any fallback method');
  return null;
};

/**
 * Validate that a video ID exists in storage
 * @param {string} videoId - Video ID to validate
 * @returns {boolean} - True if video exists
 */
export const videoExists = (videoId) => {
  return findVideoWithFallback(videoId) !== null;
};

/**
 * Get video title safely with fallback
 * @param {object} video - Video object
 * @returns {string} - Video title or fallback
 */
export const getVideoTitle = (video) => {
  if (!video) return 'Unknown Video';
  return video.title || video.name || 'Untitled Video';
};

/**
 * Debug function to log video storage state
 */
export const debugVideoStorage = () => {
  const videos = getVideosFromStorage();
  console.log('=== Video Storage Debug ===');
  console.log('Total videos:', videos.length);
  videos.forEach((video, index) => {
    console.log(`Video ${index + 1}:`, {
      id: video.id,
      title: video.title,
      url: video.url,
      extractedId: extractVideoId(video.url)
    });
  });
  console.log('=== End Debug ===');
};