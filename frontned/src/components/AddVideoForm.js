import React, { useState } from 'react';

const AddVideoForm = ({ onAddVideo }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Parse tags from comma-separated input
      const tags = tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag !== '');

      await onAddVideo({
        url: url.trim(),
        title: title.trim(),
        tags
      });

      // Reset form on success
      setUrl('');
      setTitle('');
      setTagsInput('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="add-video-section">
      <h2>Add New Cooking Video</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="url">YouTube Video URL *</label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="title">Custom Title (optional)</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Leave empty to auto-fetch from YouTube"
          />
        </div>

        <div className="input-group">
          <label htmlFor="tags">Categories/Tags</label>
          <textarea
            id="tags"
            className="tags-input"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="Enter tags separated by commas (e.g., Dessert, Italian, Quick Recipe)"
          />
        </div>

        <button 
          type="submit" 
          className="btn"
          disabled={isLoading || !url.trim()}
        >
          {isLoading ? 'Adding Video...' : 'Add Video'}
        </button>
      </form>
    </section>
  );
};

export default AddVideoForm;