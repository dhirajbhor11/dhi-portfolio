
'use client';
import type { User } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DEFAULT_ROLE, type UserRole } from '@/config/roles';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  createdAt: any; // Firestore Timestamp
  photoURL?: string | null;
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
