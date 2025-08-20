import { auth, db } from './firebase.config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const SESSION_KEY = 'user_session';

async function fetchUserProfile(uid) {
    try {
        const privatePlayersRef = collection(db, "players_private");
        const q = query(privatePlayersRef, where("authId", "==", uid));
        const privateQuerySnapshot = await getDocs(q);

        if (!privateQuerySnapshot.empty) {
            const publicPlayerId = privateQuerySnapshot.docs[0].id;
            const publicDocRef = doc(db, "players_public", publicPlayerId);
            const publicDocSnap = await getDoc(publicDocRef);

            if (publicDocSnap.exists()) {
                const userProfile = publicDocSnap.data();
                if (userProfile.teamId) {
                    const teamDocRef = doc(db, "teams", userProfile.teamId);
                    const teamDocSnap = await getDoc(teamDocRef);
                    if (teamDocSnap.exists()) {
                        userProfile.teamName = teamDocSnap.data().name;
                    }
                }
                return { uid, ...userProfile };
            }
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
    }
    return null;
}

function dispatchAuthReady(session) {
    const event = new CustomEvent('authReady', { detail: session });
    document.dispatchEvent(event);
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        let session = JSON.parse(sessionStorage.getItem(SESSION_KEY));
        if (!session || session.uid !== user.uid) {
            const userProfile = await fetchUserProfile(user.uid);
            session = { user, userProfile };
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        }
        dispatchAuthReady(session);
    } else {
        sessionStorage.removeItem(SESSION_KEY);
        dispatchAuthReady({ user: null, userProfile: null });
    }
});

// Function to get the current session, to be used by other scripts
export function getCurrentSession() {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
}
