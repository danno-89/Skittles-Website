
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
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
    documentId
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { 
    getFunctions, 
    connectFunctionsEmulator, 
    httpsCallable 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

// Your web app's Firebase configuration
export const firebaseConfig = {
    apiKey: "[REMOVED]",
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

// If you are using the local emulator, uncomment the following line
// connectFunctionsEmulator(functions, "localhost", 5001);

// Export all the necessary services and functions
export {
    auth,
    db,
    functions,
    // Auth
    onAuthStateChanged,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    // Firestore
    collection,
    getDocs,
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
    // Functions
    httpsCallable
};
