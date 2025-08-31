"""Utility functions for the Cooktube backend."""

import re
from typing import Optional


def extract_video_id(url: str) -> Optional[str]:
    """
    Extract YouTube video ID from various YouTube URL formats.
    Handles URLs with query parameters like &t=7s, &list=..., etc.
    
    Args:
        url: YouTube URL
        
    Returns:
        Video ID or None if invalid
    """
    if not url:
        return None

    # Remove any whitespace
    url = url.strip()

    # Handle different YouTube URL formats
    patterns = [
        # Standard watch URLs: https://www.youtube.com/watch?v=VIDEO_ID&other=params
        r"(?:youtube\.com/watch\?v=)([a-zA-Z0-9_-]{11})",
        # Short URLs: https://youtu.be/VIDEO_ID?other=params
        r"(?:youtu\.be/)([a-zA-Z0-9_-]{11})",
        # Embed URLs: https://www.youtube.com/embed/VIDEO_ID?other=params
        r"(?:youtube\.com/embed/)([a-zA-Z0-9_-]{11})",
        # Mobile URLs: https://m.youtube.com/watch?v=VIDEO_ID&other=params
        r"(?:m\.youtube\.com/watch\?v=)([a-zA-Z0-9_-]{11})",
        # Gaming URLs: https://gaming.youtube.com/watch?v=VIDEO_ID&other=params
        r"(?:gaming\.youtube\.com/watch\?v=)([a-zA-Z0-9_-]{11})"
    ]

    for pattern in patterns:
        match = re.search(pattern, url)
        if match and match.group(1):
            return match.group(1)

    return None


def is_valid_youtube_url(url: str) -> bool:
    """
    Validate if a URL is a valid YouTube URL.
    
    Args:
        url: URL to validate
        
    Returns:
        True if valid YouTube URL
    """
    return extract_video_id(url) is not None


def clean_youtube_url(url: str) -> str:
    """
    Clean YouTube URL by removing query parameters except video ID.
    
    Args:
        url: YouTube URL
        
    Returns:
        Clean YouTube URL
    """
    video_id = extract_video_id(url)
    if not video_id:
        return url
    
    return f"https://www.youtube.com/watch?v={video_id}"


def validate_video_id(video_id: str) -> bool:
    """
    Validate YouTube video ID format.
    
    Args:
        video_id: Video ID to validate
        
    Returns:
        True if valid video ID format
    """
    if not video_id:
        return False
    
    # YouTube video IDs are 11 characters long and contain letters, numbers, hyphens, and underscores
    pattern = r"^[a-zA-Z0-9_-]{11}$"
    return bool(re.match(pattern, video_id))