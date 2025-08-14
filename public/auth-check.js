import { auth, db } from './firebase.config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is logged in, check if their account is linked.
        try {
            const playersRef = collection(db, 'players_private');
            const q = query(playersRef, where("authId", "==", user.uid));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                // No linked player found, redirect to the linking page.
                if (window.location.pathname !== '/link.html') {
                    window.location.href = 'link.html';
                }
            } else {
                // Player record is linked.
                // If they are on the link page, redirect them to their profile.
                if (window.location.pathname === '/link.html') {
                    window.location.href = 'profile.html';
                }
            }
        } catch (error) {
            console.error("Error checking for linked player:", error);
            // Optional: handle error, maybe show a message to the user
        }
    }
});
