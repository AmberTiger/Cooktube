# 🍳 Cooktube - YouTube Cooking Video Organizer

A React-based web application for organizing and watching YouTube cooking videos. Save your favorite cooking tutorials, categorize them with custom tags, and easily search through your collection.

## Features

- **Add YouTube Videos**: Paste any YouTube cooking video URL to add it to your collection
- **Auto-fetch Titles**: Automatically retrieves video titles from YouTube, or use custom titles
- **Custom Categories**: Organize videos with custom tags (e.g., "Dessert", "Italian", "Quick Recipe")
- **Search Functionality**: Search through your videos by title or tags
- **Local Storage**: All data is saved locally in your browser
- **Responsive Design**: Works great on desktop and mobile devices
- **Video Playback**: Watch videos directly in the app with embedded YouTube player

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Navigate to the project directory
2. Install dependencies: `npm install`
3. Start the development server: `npm start`
4. Open [http://localhost:3000](http://localhost:3000) to view the app

## Usage

### Adding Videos
1. Paste a YouTube video URL in the "YouTube Video URL" field
2. Optionally add a custom title (if left empty, the title will be fetched automatically)
3. Add categories/tags separated by commas (e.g., "Dessert, Italian, Quick Recipe")
4. Click "Add Video" to save it to your collection

### Searching Videos
- Use the search bar to find videos by title or tags
- Search is case-insensitive and matches partial text

## Technical Details

- **Frontend**: React 18 with functional components and hooks
- **State Management**: React useState and useEffect hooks
- **Data Persistence**: Browser localStorage
- **Styling**: Pure CSS with responsive design
- **YouTube Integration**: YouTube oEmbed API for fetching video titles

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production