
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  incrementClientPromptsUsed: () => void; // New function
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | Error | null>(null);
  const router = useRouter();

  const clearError = useCallback(() => setError(null), []);

  const handleAuthError = (err: unknown) => {
    console.error("Auth Error:", err);
    if (err instanceof Error) {
      setError(err as AuthError);
    } else {
      setError(new Error('An unexpected error occurred. Check console for details.') as AuthError);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
      setLoading(true);
      setError(null);
      if (userAuth) {
        setCurrentUser(userAuth);
        try {
          const profile = await createUserProfileDocument(userAuth);
          setUserProfile(profile);
        } catch (e) {
            handleAuthError(e);
            setUserProfile(null);
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
      // onAuthStateChanged will handle profile loading and navigation if router.push('/') is removed here
      // Forcing navigation might be preferred by some, but letting onAuthStateChanged handle it is cleaner
      // router.push('/');
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
      // onAuthStateChanged handles profile and should lead to navigation.
      // router.push('/'); // Let onAuthStateChanged and profile logic handle navigation
    } catch (creationError: any) {
      if (creationError.code === 'auth/email-already-in-use') {
        setError(null); 
        try {
          await signInWithEmail(email, password); 
        } catch (signInFailureError: any) {
          let autoLoginFailedMessage = "This email is already registered. Automatic login failed.";
          if (signInFailureError.code === 'auth/wrong-password') {
            autoLoginFailedMessage = "This email is already registered. We tried to log you in, but the password was incorrect. Please try logging in manually.";
          } else if (signInFailureError.message) {
            autoLoginFailedMessage = `This email is already registered. Automatic login failed: ${signInFailureError.message}`;
          }
          setError({ name: "AuthError", code: "auth/auto-login-failed", message: autoLoginFailedMessage } as AuthError);
        }
      } else {
        handleAuthError(creationError);
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged handles profile update, router.push('/') can be here or handled by useEffect in page
      router.push('/'); 
    } catch (err) {
      handleAuthError(err);
      throw err; 
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
      sessionStorage.removeItem("chatMessages"); // Consider removing if fully reliant on Firestore history
      router.push('/login');
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = useCallback((rolesToCheck: UserRole | UserRole[]): boolean => {
    if (!userProfile || !userProfile.role) return false;
    const rolesArray = Array.isArray(rolesToCheck) ? rolesToCheck : [rolesToCheck];
    return rolesArray.includes(userProfile.role);
  }, [userProfile]);

  const incrementClientPromptsUsed = useCallback(() => {
    setUserProfile(prevProfile => {
      if (!prevProfile) return null;
      // Ensure promptsUsed is treated as a number, defaulting to 0 if undefined/null
      const currentPromptsUsed = typeof prevProfile.promptsUsed === 'number' ? prevProfile.promptsUsed : 0;
      return { ...prevProfile, promptsUsed: currentPromptsUsed + 1 };
    });
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading, error, signInWithGoogle, signUpWithEmail, signInWithEmail, signOut, clearError, hasRole, incrementClientPromptsUsed }}>
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
