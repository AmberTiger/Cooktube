/**
 * Migration banner component to handle localStorage to backend migration
 */

import React, { useState, useEffect } from 'react';
import { getMigrationStatus, performMigration } from '../utils/migration';
import { checkBackendHealth } from '../utils/api';

const MigrationBanner = ({ onMigrationComplete }) => {
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [isBackendAvailable, setIsBackendAvailable] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);
  const [error, setError] = useState(null);
  const [isCheckingBackend, setIsCheckingBackend] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        setIsCheckingBackend(true);
        
        // Check migration status
        const status = getMigrationStatus();
        setMigrationStatus(status);
        
        // Check backend availability if migration is needed
        if (status.isNeeded && !status.isCompleted) {
          const backendStatus = await checkBackendHealth();
          setIsBackendAvailable(backendStatus);
        }
      } catch (err) {
        console.error('Error checking migration status:', err);
        setError('Failed to check migration status');
      } finally {
        setIsCheckingBackend(false);
      }
    };

    checkStatus();
  }, []);

  const handleMigrate = async () => {
    setIsMigrating(true);
    setError(null);
    setMigrationResult(null);

    try {
      const result = await performMigration();
      setMigrationResult(result);
      
      // Update migration status
      const newStatus = getMigrationStatus();
      setMigrationStatus(newStatus);
      
      // Notify parent component
      if (onMigrationComplete) {
        onMigrationComplete(result);
      }
    } catch (err) {
      console.error('Migration error:', err);
      setError(err.message || 'Migration failed');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDismiss = () => {
    // Hide the banner (parent should handle this)
    if (onMigrationComplete) {
      onMigrationComplete({ dismissed: true });
    }
  };

  // Don't show banner if migration is completed or not needed
  if (!migrationStatus || migrationStatus.isCompleted || !migrationStatus.isNeeded) {
    return null;
  }

  // Show loading state
  if (isCheckingBackend) {
    return (
      <div className="migration-banner migration-banner--loading">
        <div className="migration-content">
          <div className="migration-icon">⏳</div>
          <div className="migration-text">
            <h3>Checking system status...</h3>
            <p>Please wait while we check if migration is needed.</p>
          </div>
        </div>
      </div>
    );
  }

  // Show success state
  if (migrationResult && migrationResult.success) {
    return (
      <div className="migration-banner migration-banner--success">
        <div className="migration-content">
          <div className="migration-icon">✅</div>
          <div className="migration-text">
            <h3>Migration completed successfully!</h3>
            <p>
              Migrated {migrationResult.stats.videos_created + migrationResult.stats.videos_updated} videos 
              and {migrationResult.stats.notes_created + migrationResult.stats.notes_updated} notes to the backend.
            </p>
            {migrationResult.errors && migrationResult.errors.length > 0 && (
              <details className="migration-warnings">
                <summary>⚠️ {migrationResult.errors.length} warnings</summary>
                <ul>
                  {migrationResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
          <button className="migration-btn migration-btn--secondary" onClick={handleDismiss}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="migration-banner migration-banner--error">
        <div className="migration-content">
          <div className="migration-icon">❌</div>
          <div className="migration-text">
            <h3>Migration failed</h3>
            <p>{error}</p>
            {!isBackendAvailable && (
              <p className="migration-help">
                Make sure the backend server is running on <code>http://localhost:8000</code>
              </p>
            )}
          </div>
          <div className="migration-actions">
            <button 
              className="migration-btn migration-btn--primary" 
              onClick={handleMigrate}
              disabled={isMigrating}
            >
              Retry Migration
            </button>
            <button className="migration-btn migration-btn--secondary" onClick={handleDismiss}>
              Continue Offline
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show migration prompt
  return (
    <div className="migration-banner migration-banner--info">
      <div className="migration-content">
        <div className="migration-icon">🚀</div>
        <div className="migration-text">
          <h3>Upgrade to Backend Storage</h3>
          <p>
            We found {migrationStatus.videoCount} videos and {migrationStatus.noteCount} notes 
            in your local storage. Migrate them to our new backend for better performance and reliability.
          </p>
          {!isBackendAvailable && (
            <p className="migration-warning">
              ⚠️ Backend server is not available. Please start the server first.
            </p>
          )}
        </div>
        <div className="migration-actions">
          <button 
            className="migration-btn migration-btn--primary" 
            onClick={handleMigrate}
            disabled={isMigrating || !isBackendAvailable}
          >
            {isMigrating ? 'Migrating...' : 'Migrate Now'}
          </button>
          <button className="migration-btn migration-btn--secondary" onClick={handleDismiss}>
            Continue Offline
          </button>
        </div>
      </div>
    </div>
  );
};

export default MigrationBanner;