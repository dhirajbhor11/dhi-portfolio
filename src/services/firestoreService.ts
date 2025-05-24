
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
  chatHistory?: Message[]; // Changed from promptHistory to chatHistory, type is Message[]
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
  if (!uid || !message) return;
  const userRef = doc(db, 'users', uid);
  const MAX_HISTORY_LENGTH = 20; // Store last 20 messages

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        console.warn("User profile does not exist for UID:", uid, "while trying to add message to history.");
        // If profile doesn't exist, we might initialize it here or rely on createUserProfileDocument
        // For now, we'll create it with the chat history if it's missing.
        // This is a fallback, ideally createUserProfileDocument handles all creations.
         transaction.set(userRef, { chatHistory: [message], uid: uid, createdAt: serverTimestamp(), role: DEFAULT_ROLE }, { merge: true });
        return;
      }

      const userData = userDoc.data() as UserProfile;
      const currentHistory = userData.chatHistory || [];
      
      // Add new message and keep only the most recent ones
      const newHistory = [...currentHistory, message].slice(-MAX_HISTORY_LENGTH);

      transaction.update(userRef, { chatHistory: newHistory });
    });
  } catch (error) {
    console.error("Error adding message to history:", error);
    // Optionally re-throw or handle as needed by the application
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
      return userData.chatHistory || [];
    }
    return [];
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return [];
  }
};

