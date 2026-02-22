import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
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
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import {
    getFunctions,
    connectFunctionsEmulator,
    httpsCallable
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-functions.js";
import {
    getDatabase,
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js";

// Your web app's Firebase configuration
// keys are replaced with environment variables for security
export const firebaseConfig = {
    apiKey: "AIzaSyByuL3NC2ieRb-IXT9ZQE9BNvhrgS6Pnko",
    authDomain: "sarnia-skittles-club.firebaseapp.com",
    databaseURL: "https://sarnia-skittles-club-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "sarnia-skittles-club",
    storageBucket: "sarnia-skittles-club.appspot.com",
    messagingSenderId: "119131555624",
    appId: "1:119131555624:web:b8c3fa25e1182d5d5ef21d"
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
