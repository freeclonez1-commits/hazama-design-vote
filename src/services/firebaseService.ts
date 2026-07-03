import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '../config/firebase';

// Determine if we should activate actual Firebase or run in Mock (Demo) mode
export const isFirebaseEnabled = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== '' && 
  !firebaseConfig.apiKey.startsWith('YOUR_');

let app;
let auth: any = null;
let db: any = null;

if (isFirebaseEnabled) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("🔥 Hazama Design Vote: Firebase service successfully initialized.");
  } catch (error) {
    console.error("🔥 Hazama Design Vote: Failed to initialize Firebase:", error);
  }
} else {
  console.warn("⚠️ Hazama Design Vote: Using Mock (Demo) Mode. Paste your configuration credentials in src/config/firebase.ts to connect to a live Firebase project.");
}

// Google Sign-In helper function
export const signInWithGoogleSNS = async (): Promise<{ email: string; uid: string; displayName: string | null } | null> => {
  if (!isFirebaseEnabled || !auth) {
    throw new Error("Firebase is not initialized or configured.");
  }
  
  const provider = new GoogleAuthProvider();
  // Force accounts list choice on sign in
  provider.setCustomParameters({
    prompt: 'select_account'
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    return {
      email: user.email || '',
      uid: user.uid,
      displayName: user.displayName
    };
  } catch (error) {
    console.error("Error during Google Sign-In pop-up:", error);
    throw error;
  }
};

export { auth, db };
