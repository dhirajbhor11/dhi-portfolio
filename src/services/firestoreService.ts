
'use client';
import type { User } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, runTransaction, updateDoc, arrayUnion, arrayRemove, collection, query, orderBy, limit, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DEFAULT_ROLE, type UserRole } from '@/config/roles';
import type { Message } from '@/components/chat/ChatMessage'; // Import Message type

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  createdAt: any; // Firestore Timestamp
  photoURL?: string | null;
  chatHistory?: Message[];
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
      chatHistory: [], // Initialize chatHistory
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

export const addMessageToHistory = async (uid: string, message: Message): Promise<void> => {
  if (!uid || !message) {
    console.warn('addMessageToHistory: Aborted due to missing uid or message.');
    return;
  }
  const userRef = doc(db, 'users', uid);
  const MAX_HISTORY_LENGTH = 20; // Store last 20 messages (user + assistant)

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        console.warn(`User profile for UID: ${uid} does not exist. Creating a new profile with the current message.`);
        // Fallback: Create a new profile. Ideally, createUserProfileDocument handles all creations.
        const newUserProfile: UserProfile = {
          uid,
          email: null, // At this point, we don't have direct access to userAuth.email
          displayName: null, // Same for displayName
          role: DEFAULT_ROLE,
          createdAt: serverTimestamp(),
          photoURL: null,
          chatHistory: [message], // Start history with the current message
        };
        transaction.set(userRef, newUserProfile);
        return;
      }

      const userData = userDoc.data() as UserProfile;
      // Ensure chatHistory is an array, even if undefined/null or wrongly typed in Firestore
      const currentHistory = Array.isArray(userData.chatHistory) ? userData.chatHistory : [];
      
      const newHistory = [...currentHistory, message];
      
      // Slice to keep only the most recent messages
      // If newHistory.length is less than MAX_HISTORY_LENGTH, slice will just return newHistory.
      const trimmedHistory = newHistory.slice(-MAX_HISTORY_LENGTH);

      transaction.update(userRef, { chatHistory: trimmedHistory });
    });
  } catch (error) {
    console.error(`Error in addMessageToHistory for UID ${uid}:`, error);
    // Re-throw the error so the calling function can handle it (e.g., show a toast)
    throw error;
  }
};

export const getChatHistory = async (uid: string): Promise<Message[]> => {
  if (!uid) return [];
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile;
      // Ensure chatHistory is an array, default to empty if not.
      return Array.isArray(userData.chatHistory) ? userData.chatHistory : [];
    }
    return [];
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return [];
  }
};
