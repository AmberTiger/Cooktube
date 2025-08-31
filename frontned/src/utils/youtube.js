/**
 * Extract YouTube video ID from various YouTube URL formats
 * Handles URLs with query parameters like &t=7s, &list=..., etc.
 * @param {string} url - YouTube URL
 * @returns {string|null} - Video ID or null if invalid
 */
export const extractVideoId = (url) => {
  if (!url) return null;

  // Remove any whitespace
  url = url.trim();

  // Handle different YouTube URL formats
  const patterns = [
    // Standard watch URLs: https://www.youtube.com/watch?v=VIDEO_ID&other=params
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // Short URLs: https://youtu.be/VIDEO_ID?other=params
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // Embed URLs: https://www.youtube.com/embed/VIDEO_ID?other=params
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    // Mobile URLs: https://m.youtube.com/watch?v=VIDEO_ID&other=params
    /(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // Gaming URLs: https://gaming.youtube.com/watch?v=VIDEO_ID&other=params
    /(?:gaming\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

/**
 * Get video title from YouTube (using oEmbed API)
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<string>} - Video title
 */
export const getVideoTitle = async (videoId) => {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch video information');
    }
    
    const data = await response.json();
    return data.title || 'YouTube Video';
  } catch (error) {
    console.warn('Could not fetch video title:', error);
    throw new Error('Could not fetch video title');
  }
};

/**
 * Validate if a URL is a valid YouTube URL
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid YouTube URL
 */
export const isValidYouTubeUrl = (url) => {
  return extractVideoId(url) !== null;
};

/**
 * Clean YouTube URL by removing query parameters except video ID
 * @param {string} url - YouTube URL
 * @returns {string} - Clean YouTube URL
 */
export const cleanYouTubeUrl = (url) => {
  const videoId = extractVideoId(url);
  if (!videoId) return url;
  
  return `https://www.youtube.com/watch?v=${videoId}`;
};

/**
 * Extract timestamp from YouTube URL (if present)
 * @param {string} url - YouTube URL
 * @returns {number} - Timestamp in seconds, or 0 if not found
 */
export const extractTimestamp = (url) => {
  if (!url) return 0;
  
  // Look for t parameter in various formats
  const timePatterns = [
    /[?&]t=(\d+)s?/,           // ?t=123s or ?t=123
    /[?&]start=(\d+)/,         // ?start=123
    /[?&]time_continue=(\d+)/  // ?time_continue=123
  ];
  
  for (const pattern of timePatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }
  
  return 0;
};