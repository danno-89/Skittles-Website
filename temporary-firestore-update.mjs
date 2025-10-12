// temporary-firestore-update.mjs
import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

// This config needs to be filled in with your actual Firebase project details
const firebaseConfig = {
    apiKey: "[REMOVED]",
    authDomain: "sarnia-skittles-club.firebaseapp.com",
    databaseURL: "https://sarnia-skittles-club-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "sarnia-skittles-club",
    storageBucket: "sarnia-skittles-club.appspot.com",
    messagingSenderId: "119131555624",
    appId: "1:119131555624:web:b8c3fa25e1182d5d5ef21d"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const updateTeamAverages = async () => {
    const docRef = doc(db, "ssc_cup", "2025-26");
    try {
        await updateDoc(docRef, {
            "Group_A.standings": [
                { "teamName": "wizards", "played": 0, "won": 0, "drawn": 0, "lost": 0, "points": 0 },
                { "teamName": "ott", "played": 0, "won": 0, "drawn": 0, "lost": 0, "points": 0 },
                { "teamName": "les-pins", "played": 0, "won": 0, "drawn": 0, "lost": 0, "points": 0 },
                { "teamName": "ufos", "played": 0, "won": 0, "drawn": 0, "lost": 0, "points": 0 },
                { "teamName": "technocrats", "played": 0, "won": 0, "drawn": 0, "lost": 0, "points": 0 }
            ],
            "Group_B.standings": [
                { "teamName": "oberlands", "played": 0, "won": 0, "drawn": 0, "lost": 0, "points": 0 },
                { "teamName": "p-ds", "played": 0, "won": 0, "drawn": 0, "lost": 0, "points": 0 },
                { "teamName": "sappers", "played": 0, "won": 0, "drawn": 0, "lost": 0, "points": 0 },
                { "teamName": "titons", "played": 0, "won": 0, "drawn": 0, "lost": 0, "points": 0 },
                { "teamName": "irregulars", "played": 0, "won": 0, "drawn": 0, "lost": 0, "points": 0 }
            ],
            "Group_C.standings": [
                { "teamName": "wild-stallions", "played": 0, "won": 0, "drawn": 0, "lost": 0, "points": 0 },
                { "teamName": "dolphins", "played": 0, "won": 0, "drawn": 0, "lost": 0, "points": 0 },
                { "teamName": "taste-the-rainbow", "played": 0, "won": 0, "drawn": 0, "lost": 0, "points": 0 },
                { "teamName": "canaccord-pinvestors", "played": 0, "won": 0, "drawn": 0, "lost": 0, "points": 0 },
                { "teamName": "clippers", "played": 0, "won": 0, "drawn": 0, "lost": 0, "points": 0 }
            ],
            "Group_D.standings": [
                { "teamName": "longshots", "played": 0, "won": 0, "drawn": 0, "lost": 0, "points": 0 },
                { "teamName": "chalkers", "played": 0, "won": 0, "drawn": 0, "lost": 0, "points": 0 },
                { "teamName": "johnnie-walkers", "played": 0, "won": 0, "drawn": 0, "lost": 0, "points": 0 },
                { "teamName": "desperados", "played": 0, "won": 0, "drawn": 0, "lost": 0, "points": 0 }
            ]
        });
        console.log("Document successfully updated with full standings data.");
    } catch (error) {
        console.error("Error updating document: ", error);
    }
};

updateTeamAverages();
