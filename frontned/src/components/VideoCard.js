import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const VideoCard = ({ video, onDelete, onUpdate }) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(video.title);
  const [editTags, setEditTags] = useState(video.tags.join(', '));
  
  const embedUrl = `https://www.youtube.com/embed/${video.id}`;

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      onDelete(video.id);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditTitle(video.title);
    setEditTags(video.tags.join(', '));
  };

  const handleSave = () => {
    const updatedTags = editTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag !== '');
    
    onUpdate(video.id, {
      title: editTitle.trim(),
      tags: updatedTags
    });
    
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditTitle(video.title);
    setEditTags(video.tags.join(', '));
  };

  const handleViewDetails = () => {
    navigate(`/video/${video.id}`);
  };

  return (
    <div className="video-card">
      <div className="video-embed-container" onClick={handleViewDetails}>
        <iframe
          width="560"
          height="315"
          style={{ width: '100%', height: '100%' }}
          className="video-embed"
          src={embedUrl}
          title={video.title}
          allowFullScreen
        />
        <div className="video-overlay">
          <span className="view-details-text">Click to view details & add notes</span>
        </div>
      </div>
      <div className="video-info">
        {isEditing ? (
          <div className="edit-form">
            <div className="edit-field">
              <label htmlFor={`title-${video.id}`}>Title:</label>
              <input
                id={`title-${video.id}`}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="edit-title-input"
              />
            </div>
            <div className="edit-field">
              <label htmlFor={`tags-${video.id}`}>Tags:</label>
              <textarea
                id={`tags-${video.id}`}
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="Enter tags separated by commas"
                className="edit-tags-input"
              />
            </div>
            <div className="edit-buttons">
              <button 
                className="save-btn"
                onClick={handleSave}
                disabled={!editTitle.trim()}
              >
                Save
              </button>
              <button 
                className="cancel-btn"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="video-title">{video.title}</h3>
            {video.tags.length > 0 && (
              <div className="video-tags">
                {video.tags.map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="video-actions">
              <button 
                className="view-btn"
                onClick={handleViewDetails}
              >
                View Details
              </button>
              <button 
                className="edit-btn"
                onClick={handleEdit}
              >
                Edit
              </button>
              <button 
                className="delete-btn"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VideoCard;