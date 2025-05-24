
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
      // Successful creation: onAuthStateChanged handles profile and should lead to navigation.
      // router.push('/'); // Let onAuthStateChanged and profile logic handle navigation
    } catch (creationError: any) {
      if (creationError.code === 'auth/email-already-in-use') {
        setError(null); // Clear the "email-already-in-use" error message
        try {
          await signInWithEmail(email, password); // This will push to '/' on success
          // If signInWithEmail is successful, navigation happens within it.
        } catch (signInFailureError: any) {
          // signInWithEmail re-threw an error (e.g., auth/wrong-password)
          let autoLoginFailedMessage = "This email is already registered. Automatic login failed.";
          if (signInFailureError.code === 'auth/wrong-password') {
            autoLoginFailedMessage = "This email is already registered. We tried to log you in, but the password was incorrect. Please try logging in manually.";
          } else if (signInFailureError.message) {
            autoLoginFailedMessage = `This email is already registered. Automatic login failed: ${signInFailureError.message}`;
          }
          setError({ name: "AuthError", code: "auth/auto-login-failed", message: autoLoginFailedMessage } as AuthError);
        }
      } else {
        // Other signup errors
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
      router.push('/');
    } catch (err) {
      handleAuthError(err);
      throw err; // Re-throw the error to be caught by the caller if needed (e.g., signUpWithEmail)
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
      sessionStorage.removeItem("chatMessages");
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
