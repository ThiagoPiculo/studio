import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
// import { getFunctions, Functions } from 'firebase/functions'; // Uncomment if using Cloud Functions directly

// Your web app's Firebase configuration
// IMPORTANT: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDaZbI0YglL_s5-mHhhCAXqUcB2l7FhlgQ",
  authDomain: "miniheroes-habit-builder.firebaseapp.com",
  projectId: "miniheroes-habit-builder",
  storageBucket: "miniheroes-habit-builder.firebasestorage.app",
  messagingSenderId: "479524072547",
  appId: "1:479524072547:web:a33dc8d5b99e3b61721c56"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
// let functions: Functions; // Uncomment if using Cloud Functions

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

auth = getAuth(app);
db = getFirestore(app);
// functions = getFunctions(app); // Uncomment if using Cloud Functions

export { app, auth, db /*, functions */ };