
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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
export const auth = getAuth(app);
export const db = getFirestore(app);
