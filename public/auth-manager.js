import { auth, db, onAuthStateChanged, doc, getDoc, collection, query, where, getDocs } from './firebase.config.js';

let resolveAuthReady;
export const authReady = new Promise(resolve => {
    resolveAuthReady = resolve;
});

async function fetchUserProfile(uid) {
    try {
        const privatePlayersRef = collection(db, "players_private");
        const q = query(privatePlayersRef, where("authId", "==", uid));
        const privateQuerySnapshot = await getDocs(q);

        if (privateQuerySnapshot.empty) return null;

        const privateDoc = privateQuerySnapshot.docs[0];
        const publicPlayerId = privateDoc.id;
        const publicDocRef = doc(db, "players_public", publicPlayerId);
        const publicDocSnap = await getDoc(publicDocRef);

        if (!publicDocSnap.exists()) return null;

        return { 
            publicData: { publicId: publicPlayerId, ...publicDocSnap.data() }, 
            privateData: privateDoc.data() 
        };

    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}

async function updateTeamManagementLink(teamId) {
    const linkElement = document.getElementById('team-management-nav-link');
    if (!linkElement) return;
    linkElement.textContent = "Team Management"; // Default
    if (teamId) {
        const teamDocRef = doc(db, "teams", teamId);
        const teamDocSnap = await getDoc(teamDocRef);
        if (teamDocSnap.exists()) {
            linkElement.textContent = teamDocSnap.data().name;
        }
    }
}

document.addEventListener('htmlIncludesLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        let userProfile = null;
        if (user) {
            userProfile = await fetchUserProfile(user.uid);
            await updateTeamManagementLink(userProfile?.publicData?.teamId);
        } else {
            await updateTeamManagementLink(null);
        }
        
        // Resolve the promise with the final auth state and profile
        resolveAuthReady({ 
            user, 
            publicData: userProfile?.publicData,
            privateData: userProfile?.privateData
        });
    });
});
