import { initializeApp } from "firebase/app";
import {
    getAuth,
    onAuthStateChanged,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "firebase/auth";
import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    doc,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    updateDoc,
    setDoc,
    deleteDoc,
    onSnapshot,
    Timestamp,
    documentId,
    writeBatch,
    serverTimestamp,
    runTransaction
} from "firebase/firestore";
import {
    getFunctions,
    connectFunctionsEmulator,
    httpsCallable
} from "firebase/functions";
import {
    getDatabase,
    ref,
    onValue
} from "firebase/database";

// Your web app's Firebase configuration
// keys are replaced with environment variables for security
export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'europe-west1');
const rtdb = getDatabase(app);

// If you are using the local emulator, uncomment the following line
// connectFunctionsEmulator(functions, "localhost", 5001);

// Export all the necessary services and functions
export {
    app,
    auth,
    db,
    functions,
    rtdb,
    // Auth
    onAuthStateChanged,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    // Firestore
    collection,
    getDocs,
    addDoc,
    doc,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    updateDoc,
    setDoc,
    deleteDoc,
    onSnapshot,
    Timestamp,
    documentId,
    writeBatch,
    serverTimestamp,
    runTransaction,
    // Functions
    httpsCallable,
    // Realtime DB
    ref,
    onValue
};
