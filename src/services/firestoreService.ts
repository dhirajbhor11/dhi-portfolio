
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
  const MAX_HISTORY_LENGTH = 20;

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      let userData: UserProfile;

      if (!userDoc.exists()) {
        console.warn(`User profile for UID: ${uid} does not exist. Cannot add message to history or update prompt count.`);
        // Optionally, you could attempt to create a basic profile here, but it's better handled at login/signup
        // For now, we'll just return to prevent errors.
        // If this happens, it indicates an issue with the user creation flow.
        const tempProfile: UserProfile = {
             uid,
             email: null, 
             displayName: null,
             role: DEFAULT_ROLE,
             createdAt: serverTimestamp(),
             photoURL: null,
             chatHistory: [message],
             promptLimit: 10,
             promptsUsed: message.role === 'user' ? 1 : 0,
        };
        transaction.set(userRef, tempProfile);
        userData = tempProfile;
        // return; // If strictly only updating existing users
      } else {
        userData = userDoc.data() as UserProfile;
      }
      
      const currentHistory = Array.isArray(userData.chatHistory) ? userData.chatHistory : [];
      const newHistory = [...currentHistory, message];
      const trimmedHistory = newHistory.slice(-MAX_HISTORY_LENGTH);
      
      const updateData: Partial<UserProfile> & { promptsUsed?: any } = { chatHistory: trimmedHistory };

      if (message.role === 'user') {
        // Atomically increment promptsUsed
        // Ensure promptsUsed is a number before incrementing
        const currentPromptsUsed = typeof userData.promptsUsed === 'number' ? userData.promptsUsed : 0;
        if ((currentPromptsUsed < (userData.promptLimit ?? 10)) || message.bypassLimitCheck) { // Allow saving even if over limit, check happens in UI
             updateData.promptsUsed = increment(1);
        } else if (currentPromptsUsed >= (userData.promptLimit ?? 10) && !message.bypassLimitCheck) {
            // If promptsUsed is already at or over the limit, and this isn't a bypass, don't increment.
            // The UI should prevent this message from being sent, but this is a server-side safeguard.
            // We still save the message to history for record keeping if it somehow got here.
            console.warn(`User ${uid} is over prompt limit, but message saving was attempted.`)
        }
      }
      transaction.update(userRef, updateData);
    });
  } catch (error) {
    console.error(`Error in addMessageToHistory for UID ${uid}:`, error);
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
    return [];
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
  } catch (error) {
    console.error(`Error updating prompt limit for UID ${uid}:`, error);
    throw error;
  }
};

