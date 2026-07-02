import { createContext, useContext, useEffect, useReducer } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

const initialState = { user: null, loading: true };

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, loading: false };
    case 'LOGOUT':
      return { ...state, user: null, loading: false };
    default:
      return state;
  }
}

// /auth/me returns the raw user doc (`_id`), but /auth/login and
// /auth/register return a sanitized shape keyed by `id` instead — normalize
// here so every consumer can always rely on `user._id` being present.
const normalizeUser = (user) => (user ? { ...user, _id: user._id || user.id } : null);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const refreshUser = async () => {
    const { data } = await api.get('/auth/me');
    dispatch({ type: 'SET_USER', payload: normalizeUser(data.user) });
    return data.user;
  };

  useEffect(() => {
    refreshUser().catch(() => dispatch({ type: 'SET_USER', payload: null }));
  }, []);

  // Login/register only return a sanitized shape (no spacesJoined, bio, etc.) —
  // use setUser for an immediate optimistic update, refreshUser to backfill
  // the full document right after.
  const setUser = (user) => dispatch({ type: 'SET_USER', payload: normalizeUser(user) });

  const logout = async () => {
    await api.post('/auth/logout');
    dispatch({ type: 'LOGOUT' });
  };

  const value = { user: state.user, loading: state.loading, setUser, refreshUser, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
