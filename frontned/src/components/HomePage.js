import React from 'react';
import MigrationBanner from './MigrationBanner';
import AddVideoForm from './AddVideoForm';
import SearchBar from './SearchBar';
import VideoCard from './VideoCard';

const HomePage = ({
  user,
  logout,
  showMigrationBanner,
  onMigrationComplete,
  dataSourceInfo,
  addVideo,
  videos,
  searchTerm,
  onSearchChange,
  filteredVideos,
  deleteVideo,
  updateVideo,
}) => {
  return (
    <div className="container">
      {showMigrationBanner && (
        <MigrationBanner onMigrationComplete={onMigrationComplete} />
      )}

      <header className="header">
        <h1>🍳 Cooktube</h1>
        <p>Organize and watch your favorite YouTube cooking videos</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          {user && (
            <span className="data-source" style={{ background: '#eef', color: '#223', padding: '6px 10px', borderRadius: 6 }}>
              Signed in as {user.name || user.email}
            </span>
          )}
          {user && (
            <button className="btn" onClick={logout}>Sign out</button>
          )}
          {dataSourceInfo && (
            <div className="data-source-info">
              {dataSourceInfo.usingBackend ? (
                <span className="data-source data-source--backend">🌐 Using Backend</span>
              ) : (
                <span className="data-source data-source--local">💾 Using Local Storage</span>
              )}
            </div>
          )}
        </div>
      </header>

      <AddVideoForm onAddVideo={addVideo} />

      {videos.length > 0 && (
        <SearchBar 
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
        />
      )}

      <main>
        {filteredVideos.length > 0 ? (
          <div className="videos-grid">
            {filteredVideos.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                onDelete={deleteVideo}
                onUpdate={updateVideo}
              />
            ))}
          </div>
        ) : videos.length > 0 ? (
          <div className="no-videos">
            <h3>No videos found</h3>
            <p>Try adjusting your search terms</p>
          </div>
        ) : (
          <div className="no-videos">
            <h3>No cooking videos yet!</h3>
            <p>Add your first YouTube cooking video above to get started</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default React.memo(HomePage);
