import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Direct API usage (no local services wrapper)
const API_BASE = 'https://juescalate-api.vercel.app/api';

export type UserRole = 'student' | 'authority';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  hostelBlock?: string;
  roomNumber?: string;
  phoneNumber?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('hostel_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    const validateAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('hostel_user');
        
        if (!token || !savedUser) {
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('hostel_user');
          return;
        }

        // Set the user from localStorage immediately while we validate
        setUser(JSON.parse(savedUser));
        
        const res = await fetch(`${API_BASE}/auth/check`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        const data = await res.json();
        if (res.ok && (data.profile || data.user)) {
          const u = data.profile || data.user;
          setUser(u);
          localStorage.setItem('hostel_user', JSON.stringify(u));
        } else {
          // Only clear if the token is actually invalid
          if (res.status === 401) {
            setUser(null);
            localStorage.removeItem('token');
            localStorage.removeItem('hostel_user');
            window.location.href = '/login'; // Redirect to login page
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // Don't clear user on network errors to prevent unnecessary logouts
        if (error instanceof Response && error.status === 401) {
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('hostel_user');
          window.location.href = '/login';
        }
      }
    };

    validateAuth();
    // Set up periodic validation (every 45 minutes)
    const refreshInterval = setInterval(validateAuth, 45 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, []);

  const login = async (email: string, password: string, role: UserRole): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      
      if (res.ok && data.session?.access_token) {
        // First store the token
        localStorage.setItem('token', data.session.access_token);
        
        // Then store user data
        const userObj = data.user || data.profile;
        if (userObj) {
          setUser(userObj);
          localStorage.setItem('hostel_user', JSON.stringify(userObj));
          
          // Validate the token immediately after login
          const validateRes = await fetch(`${API_BASE}/auth/check`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${data.session.access_token}`,
            },
          });
          
          if (validateRes.ok) {
            return true;
          }
        }
        return true;
      }
      console.error('Login failed:', data.error || data);
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${API_BASE}/auth/signout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      localStorage.removeItem('token');
      localStorage.removeItem('hostel_user');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
