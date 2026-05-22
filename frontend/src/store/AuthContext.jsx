import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      auth.getMe()
        .then(profile => {
          setUser({
            id: profile.id,
            email: profile.email,
            username: profile.username,
            firstName: profile.first_name,
            lastName: profile.last_name,
            preferredCurrency: profile.preferred_currency,
          });
        })
        .catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, username, firstName) => {
    const data = await auth.demoLogin({ email, username, first_name: firstName });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    setUser({
      id: data.user.id,
      email: data.user.email,
      username: data.user.username,
      firstName: data.user.first_name,
      lastName: data.user.last_name,
      preferredCurrency: 'EUR',
    });
    return data;
  };

  const loginWithGoogle = async (access_token) => {
    const data = await auth.googleLogin({ access_token });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    setUser({
      id: data.user.id,
      email: data.user.email,
      username: data.user.username,
      firstName: data.user.first_name,
      lastName: data.user.last_name,
      preferredCurrency: 'EUR',
    });
    return data;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
