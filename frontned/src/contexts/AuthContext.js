import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

const AUTH_API_BASE = (process.env.REACT_APP_API_URL || '/api') + '/auth';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check current session on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        let res = await fetch(`${AUTH_API_BASE}/me`, { credentials: 'include' });

        // If unauthorized, try a silent refresh and retry once
        if (res.status === 401) {
          try {
            await fetch(`${AUTH_API_BASE}/refresh`, { method: 'POST', credentials: 'include' });
            res = await fetch(`${AUTH_API_BASE}/me`, { credentials: 'include' });
          } catch (_) {
            // ignore and fall through
          }
        }

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setInitialized(true);
      }
    };
    loadSession();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${AUTH_API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Invalid email or password');
      }
      const data = await res.json();
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${AUTH_API_BASE}/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {
      // ignore
    } finally {
      setUser(null);
    }
  };

  const value = useMemo(() => ({ user, initialized, loading, error, login, logout }), [user, initialized, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
