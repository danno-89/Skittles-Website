import { firebaseConfig } from './firebase.config.js';

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ... rest of the file
