
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type AuthError
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUserProfileDocument, getUserProfile, type UserProfile } from '@/services/firestoreService';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/config/roles';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: AuthError | Error | null;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | Error | null>(null);
  const router = useRouter();

  const clearError = () => setError(null);

  const handleAuthError = (err: any) => {
    console.error("Auth Error:", err);
    setError(err as AuthError);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
      setLoading(true);
      setError(null);
      if (userAuth) {
        setCurrentUser(userAuth);
        try {
          const profile = await createUserProfileDocument(userAuth); // Ensures profile exists
          if (profile) {
            setUserProfile(profile);
          } else {
            // This case should ideally not happen if createUserProfileDocument works correctly
             const fetchedProfile = await getUserProfile(userAuth.uid);
             setUserProfile(fetchedProfile);
          }
        } catch (e) {
            handleAuthError(e instanceof Error ? e : new Error('Failed to load user profile'));
            setUserProfile(null); // Clear profile on error
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle setting user and profile
      router.push('/');
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user and profile
      router.push('/');
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user and profile
      router.push('/');
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
      router.push('/login');
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (rolesToCheck: UserRole | UserRole[]): boolean => {
    if (!userProfile || !userProfile.role) return false;
    const rolesArray = Array.isArray(rolesToCheck) ? rolesToCheck : [rolesToCheck];
    return rolesArray.includes(userProfile.role);
  };

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading, error, signInWithGoogle, signUpWithEmail, signInWithEmail, signOut, clearError, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
