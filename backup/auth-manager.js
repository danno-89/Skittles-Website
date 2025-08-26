import { auth, db, onAuthStateChanged, doc, getDoc, collection, query, where, getDocs } from './firebase.config.js';

const SESSION_KEY = 'user_session';

async function fetchUserProfile(uid) {
    try {
        // Find the private document using the authId
        const privatePlayersRef = collection(db, "players_private");
        const q = query(privatePlayersRef, where("authId", "==", uid));
        const privateQuerySnapshot = await getDocs(q);

        if (privateQuerySnapshot.empty) {
            console.log("No private player document found for this authId.");
            return null;
        }

        const privateDoc = privateQuerySnapshot.docs[0];
        const privateData = privateDoc.data();
        const publicPlayerId = privateDoc.id; // The ID is the same for both docs

        // Fetch the corresponding public document
        const publicDocRef = doc(db, "players_public", publicPlayerId);
        const publicDocSnap = await getDoc(publicDocRef);

        if (!publicDocSnap.exists()) {
            console.log("Found private doc, but no corresponding public player document.");
            return null;
        }
        
        const publicData = {
            publicId: publicPlayerId,
            ...publicDocSnap.data()
        };
        
        // Return both public and private data
        return { publicData, privateData };

    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}

async function updateTeamManagementLink(teamId) {
    const linkElement = document.getElementById('team-management-nav-link');
    if (!linkElement) return;

    if (teamId) {
        const teamDocRef = doc(db, "teams", teamId);
        const teamDocSnap = await getDoc(teamDocRef);
        if (teamDocSnap.exists()) {
            linkElement.textContent = teamDocSnap.data().name;
        } else {
            linkElement.textContent = "Team Management";
        }
    } else {
        linkElement.textContent = "Team Management";
    }
}

function dispatchAuthReady(user, userProfile) {
    const event = new CustomEvent('authReady', {
        detail: { 
            user, 
            publicData: userProfile?.publicData,
            privateData: userProfile?.privateData
        }
    });
    document.dispatchEvent(event);
}

onAuthStateChanged(auth, async (user) => {
    let userProfile = null;
    if (user) {
        userProfile = await fetchUserProfile(user.uid);
        if (userProfile && userProfile.publicData && userProfile.publicData.teamId) {
            await updateTeamManagementLink(userProfile.publicData.teamId);
        } else {
            await updateTeamManagementLink(null);
        }
    } else {
        await updateTeamManagementLink(null);
    }
    dispatchAuthReady(user, userProfile);
});