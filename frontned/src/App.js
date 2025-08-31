import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import OAuthCallback from './components/OAuthCallback';
import HomePage from './components/HomePage';
import VideoDetail from './components/VideoDetail';
import { extractVideoId, getVideoTitle, cleanYouTubeUrl } from './utils/youtube';
import { saveVideosToStorage, deleteNotesFromStorage } from './utils/storage';
import { runDataMigrations } from './utils/dataMigration';
import { useAuth } from './contexts/AuthContext';
import { testLocalStorage } from './utils/storageDebug';
import { getVideos as getVideosFromService, getDataSourceInfo, createVideo as createVideoInService, updateVideo as updateVideoInService, deleteVideo as deleteVideoInService } from './utils/dataService';
import { isMigrationNeeded, isMigrationCompleted } from './utils/migration';

function App() {
  const { user, logout } = useAuth();
  const [videos, setVideos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showMigrationBanner, setShowMigrationBanner] = useState(false);
  const [dataSourceInfo, setDataSourceInfo] = useState(null);

  // Load videos and check migration status on component mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Test localStorage functionality
        const isLocalStorageWorking = testLocalStorage();
        if (!isLocalStorageWorking) {
          console.error('localStorage is not working properly');
          setIsInitialized(true);
          return;
        }
        
        // Check migration status
        const migrationNeeded = isMigrationNeeded();
        const migrationCompleted = isMigrationCompleted();
        
        // Show migration banner if needed
        setShowMigrationBanner(migrationNeeded && !migrationCompleted);
        
        // Get data source info
        const sourceInfo = await getDataSourceInfo();
        setDataSourceInfo(sourceInfo);
        
        // Load videos - try backend first (if available), then fall back to localStorage
        try {
          const backendVideos = await getVideosFromService();
          setVideos(backendVideos);
          setFilteredVideos(backendVideos);
        } catch (error) {
          console.warn('Failed to load from backend, using localStorage:', error);
          // Run data migrations first to fix any ID inconsistencies
          const migratedVideos = runDataMigrations();
          setVideos(migratedVideos);
          setFilteredVideos(migratedVideos);
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing app data:', error);
        setIsInitialized(true); // Still mark as initialized to prevent infinite loading
      }
    };

    initializeData();
  }, []);

  // Save videos to localStorage whenever videos array changes (but only after initialization and if not using backend)
  useEffect(() => {
    if (isInitialized && (!dataSourceInfo || !dataSourceInfo.usingBackend)) {
      saveVideosToStorage(videos);
    }
  }, [videos, isInitialized, dataSourceInfo]);

  // Filter videos based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredVideos(videos);
    } else {
      const filtered = videos.filter(video => 
        video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredVideos(filtered);
    }
  }, [searchTerm, videos]);

  const addVideo = async (videoData) => {
    const videoId = extractVideoId(videoData.url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Check if video already exists locally
    const existingVideo = videos.find(v => v.id === videoId);
    if (existingVideo) {
      throw new Error('This video has already been added');
    }

    // ALWAYS resolve a non-empty title before calling backend (backend requires title)
    let title = (videoData.title || '').trim();
    if (!title) {
      try {
        title = await getVideoTitle(videoId);
      } catch (error) {
        title = 'YouTube Video'; // Fallback title
      }
    }

    // Try backend first via dataService with clean URL and resolved title
    try {
      const created = await createVideoInService({
        url: cleanYouTubeUrl(videoData.url),
        title,
        tags: videoData.tags
      });
      // If backend succeeded, update UI with server response
      setVideos(prev => [created, ...prev]);
      return;
    } catch (err) {
      if (err.message !== 'FALLBACK_TO_LOCALSTORAGE') {
        console.warn('Backend create failed, falling back to local:', err.message || err);
      }
      // Fall through to local-only behavior
    }

    // Local-only behavior
    const newVideo = {
      id: videoId,
      url: cleanYouTubeUrl(videoData.url),
      title,
      tags: videoData.tags.filter(tag => tag.trim() !== ''),
      dateAdded: new Date().toISOString()
    };

    setVideos(prevVideos => [newVideo, ...prevVideos]);
  };

  const handleMigrationComplete = async (result) => {
    if (result.dismissed) {
      setShowMigrationBanner(false);
      return;
    }
    
    if (result.success) {
      setShowMigrationBanner(false);
      
      // Refresh data source info
      const sourceInfo = await getDataSourceInfo();
      setDataSourceInfo(sourceInfo);
      
      // Reload videos from backend
      try {
        const backendVideos = await getVideosFromService();
        setVideos(backendVideos);
        setFilteredVideos(backendVideos);
      } catch (error) {
        console.warn('Failed to reload from backend after migration:', error);
      }
    }
  };

  const deleteVideo = async (videoId) => {
    const previous = videos;
    // Optimistic UI update
    setVideos(prevVideos => prevVideos.filter(video => video.id !== videoId));
    try {
      await deleteVideoInService(videoId);
      // Also delete associated notes locally
      deleteNotesFromStorage(videoId);
    } catch (err) {
      console.error('Delete failed, rolling back:', err);
      // Rollback UI
      setVideos(previous);
      alert(`Delete failed: ${err.message || err}`);
    }
  };

  const updateVideo = async (videoId, updatedData) => {
    const previous = videos;
    try {
      const updated = await updateVideoInService(videoId, updatedData);
      setVideos(prevVideos => prevVideos.map(video => video.id === videoId ? updated : video));
    } catch (err) {
      console.error('Update failed, rolling back:', err);
      setVideos(previous);
      alert(`Update failed: ${err.message || err}`);
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route element={<ProtectedRoute />}>
          <Route 
            path="/" 
            element={
              <HomePage
                user={user}
                logout={logout}
                showMigrationBanner={showMigrationBanner}
                onMigrationComplete={handleMigrationComplete}
                dataSourceInfo={dataSourceInfo}
                addVideo={addVideo}
                videos={videos}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filteredVideos={filteredVideos}
                deleteVideo={deleteVideo}
                updateVideo={updateVideo}
              />
            } 
          />
          <Route path="/video/:id" element={<VideoDetail />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
