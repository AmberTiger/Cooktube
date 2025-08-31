import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import YouTube from 'react-youtube';
import { getNotesFromStorage, saveNotesToStorage } from '../utils/storage';
import { findVideoWithFallback, normalizeVideoId } from '../utils/videoHelpers';
import { getVideo as getVideoFromService, createNote as createNoteInService, deleteNote as deleteNoteInService } from '../utils/dataService';
import { analyzeSubtitles as apiAnalyzeSubtitles } from '../utils/api';

const VideoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const playerRef = useRef(null);
  
  const [video, setVideo] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFlexibleLayout, setIsFlexibleLayout] = useState(false);
  const [subtitlesInput, setSubtitlesInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);

  // Load video data and notes (backend-first, fallback to localStorage)
  useEffect(() => {
    const loadVideoData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const normalizedId = normalizeVideoId(id);
        // Try backend first
        const serverVideo = await getVideoFromService(normalizedId);
        if (serverVideo) {
          setVideo({ id: serverVideo.id, title: serverVideo.title, tags: serverVideo.tags || [], url: serverVideo.url });
          setNotes((serverVideo.notes || []).map(n => ({
            id: n.id,
            timestamp: n.timestamp,
            content: n.content,
            createdAt: n.created_at
          })));
        } else {
          // Video not found on backend — fallback to local
          const foundVideo = findVideoWithFallback(normalizedId);
          if (foundVideo) {
            setVideo(foundVideo);
            setNotes(getNotesFromStorage(normalizedId));
          } else {
            setError(`Video with ID "${id}" not found. It may have been deleted.`);
          }
        }
      } catch (err) {
        // Backend failed — fallback local
        const normalizedId = normalizeVideoId(id);
        const foundVideo = findVideoWithFallback(normalizedId);
        if (foundVideo) {
          setVideo(foundVideo);
          setNotes(getNotesFromStorage(normalizedId));
        } else {
          setError(`Video with ID "${id}" not found. It may have been deleted.`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      loadVideoData();
    }
  }, [id]);

  // Save notes to localStorage whenever notes change
  useEffect(() => {
    // Only save if we have loaded the video and we're not in the initial loading state
    if (video && !isLoading) {
      const normalizedId = normalizeVideoId(id);
      saveNotesToStorage(normalizedId, notes);
    }
  }, [notes, id, video, isLoading]);

  // Update current time periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlayerReady && playerRef.current) {
        try {
          const time = playerRef.current.getCurrentTime();
          if (typeof time === 'number' && !isNaN(time)) {
            setCurrentTime(time);
          }
        } catch (error) {
          console.warn('Error getting current time:', error);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlayerReady]);

  // Handle window resize for responsive player
  useEffect(() => {
    const handleResize = () => {
      setPlayerOpts(getPlayerOpts());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const normalizedId = normalizeVideoId(id);

    // Try backend first
    try {
      const created = await createNoteInService(normalizedId, {
        id: Date.now().toString(),
        timestamp: Math.floor(currentTime),
        content: newNote.trim()
      });
      setNotes(prev => [...prev, { id: created.id, timestamp: created.timestamp, content: created.content, createdAt: created.created_at }].sort((a, b) => a.timestamp - b.timestamp));
      setNewNote('');
      return;
    } catch (err) {
      console.warn('Create note via backend failed, fallback to local:', err);
    }

    // Fallback local
    const note = {
      id: Date.now(),
      timestamp: currentTime,
      content: newNote.trim(),
      createdAt: new Date().toISOString()
    };
    setNotes(prevNotes => [...prevNotes, note].sort((a, b) => a.timestamp - b.timestamp));
    setNewNote('');
  };

  const handleJumpToTime = (timestamp) => {
    if (!isPlayerReady || !playerRef.current) {
      console.warn('Player not ready for seeking');
      return;
    }

    try {
      // Ensure timestamp is a valid number
      const timeInSeconds = parseFloat(timestamp);
      if (isNaN(timeInSeconds) || timeInSeconds < 0) {
        console.warn('Invalid timestamp:', timestamp);
        return;
      }

      // Use seekTo with allowSeekAhead parameter
      playerRef.current.seekTo(timeInSeconds, true);
      
      // Update current time display immediately for better UX
      setCurrentTime(timeInSeconds);
    } catch (error) {
      console.error('Error seeking to timestamp:', error);
    }
  };

  const handleDeleteNote = async (noteId) => {
    const previous = notes;
    setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
    try {
      await deleteNoteInService(noteId);
    } catch (err) {
      console.warn('Delete note via backend failed, rolling back:', err);
      setNotes(previous);
    }
  };

  const handleAnalyzeSubtitles = async () => {
    if (!subtitlesInput.trim()) return;
    setIsAnalyzing(true);
    setAnalyzeError(null);
    try {
      const normalizedId = normalizeVideoId(id);
      const res = await apiAnalyzeSubtitles(normalizedId, subtitlesInput.trim());
      const newTags = Array.isArray(res?.tags) ? res.tags : [];
      if (newTags.length) {
        setVideo(prev => prev ? { ...prev, tags: Array.from(new Set([...(prev.tags || []), ...newTags])) } : prev);
      }
    } catch (err) {
      setAnalyzeError(err?.message || 'Failed to analyze subtitles');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    setIsPlayerReady(true);
  };

  const onPlayerStateChange = (event) => {
    // Handle player state changes
    // States: -1=unstarted, 0=ended, 1=playing, 2=paused, 3=buffering, 5=cued
  };

  // Dynamic player options based on container size
  const getPlayerOpts = () => {
    const containerWidth = window.innerWidth;
    const isMobile = containerWidth <= 768;
    
    // Calculate responsive dimensions
    const maxWidth = Math.min(containerWidth - 40, 800); // 40px for padding
    const height = Math.floor(maxWidth * 0.5625); // 16:9 aspect ratio
    
    return {
      height: isMobile ? '250' : Math.min(height, 450).toString(),
      width: '100%',
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        showinfo: 0,
        modestbranding: 1,
        enablejsapi: 1,
        origin: window.location.origin,
        responsive: 1
      }
    };
  };

  const [playerOpts, setPlayerOpts] = useState(getPlayerOpts());

  // Loading state
  if (isLoading) {
    return (
      <div className="container">
        <div className="video-detail-loading">
          <h2>Loading video...</h2>
          <p>Please wait while we load your video.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !video) {
    return (
      <div className="container">
        <div className="video-detail-error">
          <h2>Video not found</h2>
          <p>{error || 'The requested video could not be found.'}</p>
          <button className="btn" onClick={() => navigate('/')}>
            Back to Videos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="video-detail">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back to Videos
        </button>
        
        <div className="video-detail-controls">
          <button 
            className="layout-toggle-btn"
            onClick={() => setIsFlexibleLayout(!isFlexibleLayout)}
            title={isFlexibleLayout ? "Switch to side-by-side layout" : "Switch to stacked layout"}
          >
            {isFlexibleLayout ? "📱 Stacked" : "💻 Side-by-side"}
          </button>
        </div>

        <div className={`video-detail-content ${isFlexibleLayout ? 'flexible' : ''}`}>
          <div className="video-player-section">
            <div className={`video-player-wrapper ${isFlexibleLayout ? 'flexible' : ''}`}>
              <YouTube
                videoId={id}
                opts={playerOpts}
                onReady={onPlayerReady}
                onStateChange={onPlayerStateChange}
                className="youtube-player"
                iframeClassName="youtube-iframe"
              />
            </div>
            
            <div className="video-info-detail">
              <h1>{video.title}</h1>
              {video.tags.length > 0 && (
                <div className="video-tags">
                  {video.tags.map((tag, index) => (
                    <span key={index} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="subtitles-analyze" style={{ marginTop: 16 }}>
                <h3>Extract ingredients from subtitles</h3>
                {analyzeError && (
                  <div className="error-message" style={{ marginBottom: 8 }}>{analyzeError}</div>
                )}
                <textarea
                  value={subtitlesInput}
                  onChange={(e) => setSubtitlesInput(e.target.value)}
                  placeholder="Paste video subtitles or transcript here..."
                  className="note-input"
                  rows="6"
                />
                <button
                  onClick={handleAnalyzeSubtitles}
                  disabled={isAnalyzing || !subtitlesInput.trim()}
                  className="btn"
                  style={{ marginTop: 8 }}
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Subtitles'}
                </button>
                <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                  Resulting tags will be attached to this video. Format: tags = ["apple", "banana"].
                </p>
              </div>
            </div>
          </div>

          <div className="notes-section">
            <h2>Time-based Notes</h2>
            
            <div className="add-note-form">
              <div className="current-time">
                Current time: <strong>{formatTime(currentTime)}</strong>
              </div>
              <div className="note-input-group">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note at the current timestamp..."
                  className="note-input"
                  rows="3"
                />
                <button 
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="btn add-note-btn"
                >
                  Add Note at {formatTime(currentTime)}
                </button>
              </div>
            </div>

            <div className="notes-list">
              {notes.length === 0 ? (
                <p className="no-notes">No notes yet. Add your first note above!</p>
              ) : (
                notes.map(note => (
                  <div key={note.id} className="note-item">
                    <div className="note-header">
                      <button 
                        className="timestamp-btn"
                        onClick={() => handleJumpToTime(note.timestamp)}
                        title="Jump to this time"
                      >
                        {formatTime(note.timestamp)}
                      </button>
                      <button 
                        className="delete-note-btn"
                        onClick={() => handleDeleteNote(note.id)}
                        title="Delete note"
                      >
                        ×
                      </button>
                    </div>
                    <div className="note-content">
                      {note.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDetail;