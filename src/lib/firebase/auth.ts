
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  signInWithCustomToken,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  fetchSignInMethodsForEmail,
  getAuth,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import type { UserProfile, ChildProfile } from '@/lib/types';
import { populateInitialRewardTemplates } from './firestore';

// Admin Sign Up
export const signUpAdmin = async (name: string, email: string, password: string): Promise<UserProfile> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  await updateProfile(user, { displayName: name });

  const userProfile: UserProfile = {
    uid: user.uid,
    email: user.email,
    name: name,
    createdAt: serverTimestamp() as any,
    settings: {
      initialPage: 'heroes',
      rewardMode: 'automatic', // Default to automatic mode for new users
    },
  };
  await setDoc(doc(db, 'users', user.uid), userProfile);
  
  // Pre-populate the reward templates for the new user
  // This is no longer needed with the new architecture
  // await populateInitialRewardTemplates(user.uid);

  return userProfile;
};

// Admin Sign In
export const signInAdmin = async (email: string, password: string): Promise<UserProfile> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
  if (!userDoc.exists()) {
    throw new Error("User profile not found.");
  }
  return userDoc.data() as UserProfile;
};

// Sign In with Google
export const signInWithGoogle = async (): Promise<UserProfile> => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        avatarUrl: user.photoURL, // Salva a foto do perfil do Google
        createdAt: serverTimestamp() as any,
        settings: {
          initialPage: 'heroes',
          rewardMode: 'automatic',
        },
      };
      await setDoc(userDocRef, userProfile);
      return userProfile;
    }
    return userDocSnap.data() as UserProfile;

  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      // Silently ignore this error as it's a user action.
      console.log('Google sign-in popup closed by user.');
      // We need to re-throw something to be caught by the calling form's logic
      // so it can stop its loading state, but we don't want to show a toast.
      // A custom error type or just rethrowing a specific error code works.
      throw error; 
    }
    // Re-throw other errors to be handled by the UI
    throw error;
  }
};


// Sign Out
export const logout = async (): Promise<void> => {
  await signOut(auth);
};

// Password Reset
export const resetPassword = async (email: string): Promise<void> => {
  auth.languageCode = 'pt-BR';
  await sendPasswordResetEmail(auth, email);
};

// Delete User Account
export const deleteUserAccount = async (password: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("Usuário não está logado ou e-mail não encontrado.");
  }

  // Create credential for re-authentication
  const credential = EmailAuthProvider.credential(user.email, password);

  // Re-authenticate user
  await reauthenticateWithCredential(user, credential);

  // If re-authentication is successful, delete the user
  // NOTE: This only deletes the Firebase Auth user. Associated Firestore data
  // (profiles, missions, etc.) should be deleted via a Cloud Function for security
  // and completeness, triggered by the user deletion event.
  await deleteUser(user);

  // The onAuthStateChanged listener in AuthContext will handle redirecting the user.
};


// Child Login with Access Code (Simulated - calls a backend function ideally)
// This function represents the client-side initiation.
// The actual custom token generation MUST happen on a secure backend.
export const childLoginWithAccessCode = async (accessCode: string): Promise<{ token: string } | null> => {
  // In a real app, this would make an HTTPS call to a Cloud Function.
  // The Cloud Function would:
  // 1. Validate the accessCode against the 'children' collection.
  // 2. If valid, find the child's UID (which might be the document ID or a specific field).
  // 3. Generate a custom token for that child's UID using Firebase Admin SDK.
  // 4. Return the custom token to the client.

  // Simulating a backend call and response:
  // This is a placeholder and NOT secure for a real app.
  console.warn("Simulating child login. In production, call a secure backend function.");
  if (accessCode === "123456") { // Example valid code
    // Simulate finding a child and getting a placeholder token
    // In reality, this token would be a real Firebase Custom Token.
    return { token: "SIMULATED_CUSTOM_TOKEN_FOR_CHILD_UID_123" };
  }
  return null;
};

// Sign in with Custom Token (after childLoginWithAccessCode)
export const signInWithChildCustomToken = async (token: string): Promise<ChildProfile | null> => {
  // This part IS standard Firebase client SDK usage.
  const userCredential = await signInWithCustomToken(auth, token);
  const childUid = userCredential.user.uid; // This UID should match the child's ID in Firestore

  // Fetch child profile (assuming child UIDs are IDs of documents in 'children' collection)
  // Adjust if child UIDs are stored differently.
  const childDocRef = doc(db, 'children', childUid);
  const childDocSnap = await getDoc(childDocRef);

  if (childDocSnap.exists()) {
    return { id: childDocSnap.id, ...childDocSnap.data() } as ChildProfile;
  }
  // If the custom token is valid but no profile exists, this is an issue.
  // Or, child profiles might be identified differently.
  console.error("Child profile not found for UID:", childUid);
  return null;
};

// Get current user (wrapper around onAuthStateChanged or auth.currentUser)
export const getCurrentUser = (): UserProfile | null => {
  const fbUser = auth.currentUser;
  if (!fbUser) return null;
  // This is a simplified version. AuthContext provides a more complete UserProfile.
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    name: fbUser.displayName,
    createdAt: serverTimestamp() as any, // Placeholder,
  };
};
