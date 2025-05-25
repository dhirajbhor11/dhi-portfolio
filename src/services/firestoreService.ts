
'use client';
import type { User } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, runTransaction, updateDoc, arrayUnion, arrayRemove, collection, query, orderBy, limit, writeBatch, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DEFAULT_ROLE, type UserRole } from '@/config/roles';
import type { Message } from '@/components/chat/ChatMessage';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  createdAt: any; // Firestore Timestamp
  photoURL?: string | null;
  chatHistory?: Message[];
  promptLimit: number;
  promptsUsed: number;
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
      chatHistory: [],
      promptLimit: additionalData?.promptLimit || 10, // Default prompt limit
      promptsUsed: additionalData?.promptsUsed || 0,   // Default prompts used
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
  const existingData = snapshot.data() as UserProfile;
  // Ensure new fields have default values if missing from old profiles
  return {
    ...existingData,
    promptLimit: existingData.promptLimit ?? 10,
    promptsUsed: existingData.promptsUsed ?? 0,
    chatHistory: Array.isArray(existingData.chatHistory) ? existingData.chatHistory : [],
  };
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!uid) return null;
  const userRef = doc(db, `users/${uid}`);
  const snapshot = await getDoc(userRef);
  if (snapshot.exists()) {
    const data = snapshot.data() as UserProfile;
    // Ensure new fields have default values if missing from old profiles
    return {
        ...data,
        promptLimit: data.promptLimit ?? 10,
        promptsUsed: data.promptsUsed ?? 0,
        chatHistory: Array.isArray(data.chatHistory) ? data.chatHistory : [],
    };
  }
  return null;
};

export const addMessageToHistory = async (uid: string, message: Message): Promise<void> => {
  if (!uid || !message) {
    console.warn('addMessageToHistory: Aborted due to missing uid or message.');
    return;
  }
  const userRef = doc(db, 'users', uid);
  const MAX_HISTORY_LENGTH = 20; // Covers 10 user prompts and 10 assistant replies

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      let userData: UserProfile;

      if (!userDoc.exists()) {
        console.warn(`User profile for UID: ${uid} does not exist. Attempting to create a basic profile.`);
        // This scenario should ideally be rare if createUserProfileDocument runs correctly on signup/login
        const tempProfile: UserProfile = {
             uid,
             email: message.role === 'user' ? (message.name || null) : null, // Attempt to get email if it's a user message
             displayName: message.role === 'user' ? message.name : null,
             role: DEFAULT_ROLE,
             createdAt: serverTimestamp(),
             photoURL: null,
             chatHistory: [message],
             promptLimit: 10, // Default limit for newly created profile
             promptsUsed: (message.role === 'user' && !message.bypassLimitCheck) ? 1 : 0,
        };
        transaction.set(userRef, tempProfile);
        userData = tempProfile;
      } else {
        userData = userDoc.data() as UserProfile;
      }
      
      const currentHistory = Array.isArray(userData.chatHistory) ? userData.chatHistory : [];
      const newHistory = [...currentHistory, message];
      const trimmedHistory = newHistory.slice(-MAX_HISTORY_LENGTH);
      
      // Prepare data for Firestore update
      const updateData: { chatHistory: Message[]; promptsUsed?: any } = { 
        chatHistory: trimmedHistory 
      };

      // Increment promptsUsed in Firestore only for user messages that are not bypassed
      if (message.role === 'user' && !message.bypassLimitCheck) {
        updateData.promptsUsed = increment(1);
      }
      
      transaction.update(userRef, updateData);
    });
  } catch (error) {
    console.error(`Error in addMessageToHistory for UID ${uid}:`, error);
    // Propagate the error so the caller (ChatLayout) can handle it, e.g., show a toast
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
      return Array.isArray(userData.chatHistory) ? userData.chatHistory : [];
    }
    return [];
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return []; // Return empty array on error to prevent breaking UI
  }
};

// Optional: Function to reset prompts for a user (e.g., for a subscription cycle)
export const resetPromptsUsed = async (uid: string): Promise<void> => {
  if (!uid) return;
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, {
      promptsUsed: 0
    });
    // If you have local state for userProfile in AuthContext, you'd want to update it here too.
  } catch (error) {
    console.error(`Error resetting prompts used for UID ${uid}:`, error);
    throw error;
  }
};

// Optional: Function for an admin to update a user's prompt limit
export const updateUserPromptLimit = async (uid: string, newLimit: number): Promise<void> => {
  if (!uid || typeof newLimit !== 'number' || newLimit < 0) {
    console.error('Invalid parameters for updateUserPromptLimit.');
    return;
  }
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, {
      promptLimit: newLimit
    });
    // If you have local state for userProfile in AuthContext, you'd want to update it here too.
  } catch (error) {
    console.error(`Error updating prompt limit for UID ${uid}:`, error);
    throw error;
  }
};

