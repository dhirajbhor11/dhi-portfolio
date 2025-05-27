import admin from 'firebase-admin';

// Ensure this file is only processed on the server
if (typeof window === 'undefined') {
  if (!admin.apps.length) {
    try {
      // When deployed to Firebase (e.g., Cloud Functions, App Hosting),
      // GOOGLE_APPLICATION_CREDENTIALS is often set automatically.
      // For local development, you MUST set the GOOGLE_APPLICATION_CREDENTIALS
      // environment variable to the path of your service account key JSON file.
      // You can download this file from Firebase Project Settings > Service accounts.
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
        }),
      });
      console.log('Firebase Admin SDK initialized');
    } catch (error: any) {
      console.error('Firebase Admin SDK initialization error:', error.stack);
      // Avoid crashing the app if admin SDK fails to initialize,
      // but log the error prominently. Routes using adminAuth will fail.
    }
  }
}

let authInstance = null;
if (admin.apps.length) {
  authInstance = admin.auth();
} else if (typeof window !== 'undefined') {
  // This is a client-side context, admin SDK is not available.
  // console.warn("Firebase Admin SDK is not available on the client-side.");
} else {
  // This is a server-side context, but admin SDK failed to initialize.
  console.error("Firebase Admin SDK not initialized. Auth operations on the backend will fail.");
}


export const adminAuth = authInstance;
