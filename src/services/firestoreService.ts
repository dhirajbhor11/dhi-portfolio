
'use client';
import type { User } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, runTransaction, updateDoc, arrayUnion, arrayRemove, collection, query, orderBy, limit, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DEFAULT_ROLE, type UserRole } from '@/config/roles';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  createdAt: any; // Firestore Timestamp
  photoURL?: string | null;
  promptHistory?: string[];
}

export const createUserProfileDocument = async (userAuth: User, additionalData?: Partial<UserProfile>): Promise<UserProfile | null> => {
  if (!userAuth) return null;

  const userRef = doc(db, `users/${userAuth.uid}`);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    const { uid, email, displayName, photoURL } = userAuth;
    const createdAt = serverTimestamp();
    const newUserProfile: UserProfile = {
      uid,
      email,
      displayName,
      role: additionalData?.role || DEFAULT_ROLE,
      createdAt,
      photoURL: photoURL || null,
      promptHistory: [], // Initialize prompt history
      ...additionalData,
    };
    try {
      await setDoc(userRef, newUserProfile);
      return newUserProfile;
    } catch (error) {
      console.error('Error creating user profile document:', error);
      throw error;
    }
  }
  return snapshot.data() as UserProfile;
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!uid) return null;
  const userRef = doc(db, `users/${uid}`);
  const snapshot = await getDoc(userRef);
  if (snapshot.exists()) {
    return snapshot.data() as UserProfile;
  }
  return null;
};

export const addPromptToHistory = async (uid: string, prompt: string): Promise<void> => {
  if (!uid || !prompt) return;

  const userRef = doc(db, 'users', uid);

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        // This case should ideally not happen if profiles are created on auth
        // For robustness, one might create a profile here or log an error
        console.error("User profile does not exist for UID:", uid);
        // Or throw new Error("User profile not found."); 
        // Depending on how strictly we want to enforce profile existence.
        // For now, we'll attempt to create a minimal history.
         transaction.set(userRef, { promptHistory: [prompt] }, { merge: true });
        return;
      }

      const currentData = userDoc.data() as UserProfile;
      const currentHistory = currentData.promptHistory || [];
      
      // Add new prompt to the beginning and keep only the last 10
      const newHistory = [prompt, ...currentHistory].slice(0, 10);

      transaction.update(userRef, { promptHistory: newHistory });
    });
  } catch (error) {
    console.error("Error adding prompt to history:", error);
    // Optionally re-throw or handle as needed by the application
  }
};

export const getPromptHistory = async (uid: string): Promise<string[]> => {
  if (!uid) return [];
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile;
      return userData.promptHistory || [];
    }
    return [];
  } catch (error) {
    console.error("Error fetching prompt history:", error);
    return [];
  }
};
