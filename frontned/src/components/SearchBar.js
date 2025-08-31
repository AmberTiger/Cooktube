import React from 'react';

const SearchBar = ({ searchTerm, onSearchChange }) => {
  return (
    <section className="search-section">
      <input
        type="text"
        className="search-input"
        placeholder="Search videos by title or tags..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </section>
  );
};

export default SearchBar;