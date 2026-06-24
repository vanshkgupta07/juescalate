import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Direct API usage (no local services wrapper)
const API_BASE = import.meta.env.VITE_API_URL || 'http:///api/api';

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
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('hostel_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    const validateAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('hostel_user');
        const currentPath = window.location.pathname;
        
        // Don't validate on login page
        if (currentPath === '/login') {
          return;
        }
        
        if (!token || !savedUser) {
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('hostel_user');
          if (currentPath !== '/') {
            window.location.href = '/login';
          }
          return;
        }

        // Set the user from localStorage immediately while we validate
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        
        // Add retry logic for token validation
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            const res = await fetch(`${API_BASE}/auth/check`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache',
              },
            });
            
            if (res.ok) {
              const data = await res.json();
              if (data.profile || data.user) {
                const u = data.profile || data.user;
                setUser(u);
                localStorage.setItem('hostel_user', JSON.stringify(u));
                break; // Success, exit retry loop
              }
            } else if (res.status === 401) {
              // Token is invalid
              setUser(null);
              localStorage.removeItem('token');
              localStorage.removeItem('hostel_user');
              if (currentPath !== '/') {
                window.location.href = '/login';
              }
              break;
            }
            // If we get here, try again
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          } catch (error) {
            console.error(`Auth check attempt ${retryCount + 1} failed:`, error);
            retryCount++;
            if (retryCount === maxRetries) {
              // On network errors, keep the user logged in
              console.log('Using cached user data due to network issues');
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      } catch (error) {
        console.error('Auth validation error:', error);
        // On JSON parse or other errors, clear everything to be safe
        if (error instanceof SyntaxError) {
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

  useEffect(() => {
    setIsLoading(false);
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isLoading }}>
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
