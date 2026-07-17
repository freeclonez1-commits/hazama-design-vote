import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types/models';
import { dbService, initializeMockData } from '../services/db';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { isFirebaseEnabled, auth, signInWithGoogleSNS } from '../services/firebaseService';

const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  return isMobile ? 'Mobile' : 'PC';
};

const fetchIpAddress = async (): Promise<string> => {
  // Service 1: ipify
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(id);
    const data = await res.json();
    if (data.ip) {
      console.log('[Auth] IP resolved via ipify:', data.ip);
      return data.ip;
    }
  } catch (error) {
    console.warn('[Auth] ipify failed, trying fallback 1 (ipapi):', error);
  }

  // Fallback 2: ipapi.co
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(id);
    const data = await res.json();
    if (data.ip) {
      console.log('[Auth] IP resolved via ipapi:', data.ip);
      return data.ip;
    }
  } catch (error) {
    console.warn('[Auth] ipapi failed, trying fallback 2 (ipinfo):', error);
  }

  // Fallback 3: ipinfo.io
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://ipinfo.io/json', { signal: controller.signal });
    clearTimeout(id);
    const data = await res.json();
    if (data.ip) {
      console.log('[Auth] IP resolved via ipinfo:', data.ip);
      return data.ip;
    }
  } catch (error) {
    console.warn('[Auth] ipinfo failed:', error);
  }

  console.warn('[Auth] All IP services failed, defaulting to Unknown');
  return 'Unknown';
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isSuperAdmin: boolean;
  login: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  completeProfile: (name: string, role: User['role']) => Promise<User>;
  updateUserPermission: (uid: string, permission: User['permission']) => Promise<void>;
  deleteUser: (uid: string) => Promise<void>;
  switchUser: (uid: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync user metadata (IP & Device) when logged in or switching accounts
  useEffect(() => {
    if (!user) return;

    const syncMetadata = async () => {
      try {
        const deviceType = getDeviceType();
        const ipAddress = await fetchIpAddress();
        
        if (user.deviceType !== deviceType || user.ipAddress !== ipAddress) {
          const updated = {
            ...user,
            deviceType,
            ipAddress,
            updatedAt: new Date().toISOString()
          };
          await dbService.saveUser(updated);
          setUser(updated);
        }
      } catch (e) {
        console.error('Error syncing user metadata:', e);
      }
    };

    syncMetadata();
  }, [user?.uid]);

  useEffect(() => {
    // Make sure initial mock data is set up
    initializeMockData();

    if (isFirebaseEnabled && auth) {
      // Firebase listener for real auth updates
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setLoading(true);
        if (firebaseUser) {
          try {
            const email = firebaseUser.email || '';
            const uid = firebaseUser.uid;
            
            // Check if user profile already exists in DB
            let foundUser = await dbService.getUser(uid);
            
            // Or look up by email (in case they were pre-registered by Admin)
            if (!foundUser && email) {
              foundUser = await dbService.getUserByEmail(email);
              if (foundUser) {
                // Link their pre-registered profile to their Firebase UID
                foundUser = { ...foundUser, uid, updatedAt: new Date().toISOString() };
                await dbService.saveUser(foundUser);
              }
            }

            if (!foundUser) {
              // Register new account with 'Pending' permission
              const isEmailAdmin = email.toLowerCase() === 'admin@hazama.com' || email.toLowerCase() === 'freeclonez2@gmail.com';
              const newUser: User = {
                uid,
                email,
                name: '', // Empty name triggers ProfileSetup page redirect
                role: 'Designer', // Default placeholder
                permission: isEmailAdmin ? 'Admin' : 'Pending', // Enforce Pending approval for others
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              await dbService.saveUser(newUser);
              foundUser = newUser;
            }

            // Auto-promote whitelisted admin emails if they exist but are not Admin
            if (email) {
              const isEmailAdmin = email.toLowerCase() === 'admin@hazama.com' || email.toLowerCase() === 'freeclonez2@gmail.com';
              if (isEmailAdmin && foundUser.permission !== 'Admin') {
                foundUser = { ...foundUser, permission: 'Admin', role: 'CEO', updatedAt: new Date().toISOString() };
                await dbService.saveUser(foundUser);
              }
            }

            setUser(foundUser);
            localStorage.setItem('hazama_current_user_uid', foundUser.uid);
          } catch (e) {
            console.error("Auth state synchronization error:", e);
          }
        } else {
          setUser(null);
          localStorage.removeItem('hazama_current_user_uid');
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Check local storage for mock auth session
      const savedUserUid = localStorage.getItem('hazama_current_user_uid');
      if (savedUserUid) {
        dbService.getUser(savedUserUid).then(foundUser => {
          if (foundUser) {
            setUser(foundUser);
          }
          setLoading(false);
        }).catch(() => {
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }
  }, []);

  const login = async (email: string): Promise<boolean> => {
    setLoading(true);
    try {
      if (isFirebaseEnabled && auth) {
        // Trigger real Google SNS login popup
        const snsUser = await signInWithGoogleSNS();
        return !!snsUser;
      } else {
        // Mock Login Flow
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) return false;

        let foundUser = await dbService.getUserByEmail(normalizedEmail);
        
        if (!foundUser) {
          const isEmailAdmin = normalizedEmail === 'admin@hazama.com' || normalizedEmail === 'freeclonez2@gmail.com';
          const newUid = `user_${Date.now()}`;
          const newUser: User = {
            uid: newUid,
            email: normalizedEmail,
            name: '', // Empty triggers profile setup page redirect
            role: 'Designer',
            permission: isEmailAdmin ? 'Admin' : 'Pending', // Enforce default Pending approval
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await dbService.saveUser(newUser);
          foundUser = newUser;
        }

        setUser(foundUser);
        localStorage.setItem('hazama_current_user_uid', foundUser.uid);
        return true;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (isFirebaseEnabled && auth) {
      try {
        await signOut(auth);
      } catch (e) {
        console.error('Logout error:', e);
      }
    } else {
      setUser(null);
      localStorage.removeItem('hazama_current_user_uid');
    }
  };

  const completeProfile = async (name: string, role: User['role']): Promise<User> => {
    if (!user) throw new Error('No user is currently authenticated.');

    const isEmailAdmin = user.email.toLowerCase() === 'admin@hazama.com' || user.email.toLowerCase() === 'freeclonez2@gmail.com';
    const updatedUser: User = {
      ...user,
      name: name.trim(),
      role,
      // FIXED: Only force 'Admin' for whitelisted emails.
      // For all others, PRESERVE existing permission (do NOT reset Voter -> Pending).
      // New users (permission === 'Pending') stay Pending until Admin approves them.
      permission: isEmailAdmin ? 'Admin' : user.permission,
      updatedAt: new Date().toISOString()
    };

    const saved = await dbService.saveUser(updatedUser);
    setUser(saved);
    return saved;
  };

  const updateUserPermission = async (uid: string, permission: User['permission']) => {
    // FIXED: Use getUser(uid) directly instead of loading all users
    const targetUser = await dbService.getUser(uid);
    if (targetUser) {
      const updated = { ...targetUser, permission, updatedAt: new Date().toISOString() };
      await dbService.saveUser(updated);
      
      // If we updated ourselves, sync local state
      if (user && user.uid === uid) {
        setUser(updated);
      }
    }
  };

  const deleteUser = async (uid: string) => {
    // SECURITY: Only Super Admin can delete users
    const isSuperAdminCheck = user?.email.toLowerCase() === 'admin@hazama.com' || user?.email.toLowerCase() === 'freeclonez2@gmail.com';
    if (!isSuperAdminCheck) {
      throw new Error('Chỉ có admin tổng mới có quyền xóa thành viên.');
    }
    await dbService.deleteUser(uid);
  };

  const switchUser = async (uid: string) => {
    // SECURITY: Only Admin can switch users (used for testing/impersonation in demo mode)
    if (user?.permission !== 'Admin') {
      console.warn('switchUser: Only Admin can switch users.');
      return;
    }
    setLoading(true);
    const target = await dbService.getUser(uid);
    if (target) {
      setUser(target);
      localStorage.setItem('hazama_current_user_uid', target.uid);
    }
    setLoading(false);
  };

  const isSuperAdmin = !!user && (user.email.toLowerCase() === 'admin@hazama.com' || user.email.toLowerCase() === 'freeclonez2@gmail.com');

  return (
    <AuthContext.Provider value={{ user, loading, isSuperAdmin, login, logout, completeProfile, updateUserPermission, deleteUser, switchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
