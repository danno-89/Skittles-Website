import { auth, db, onAuthStateChanged, doc, getDoc, setDoc, collection, query, where, getDocs } from './firebase.config.js';
import { updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let resolveAuthReady;
export const authReady = new Promise(resolve => {
    resolveAuthReady = resolve;
});

// --- NEW EXPORTED FUNCTION ---
export async function getPublicData(uid) {
    const profile = await fetchUserProfile(uid);
    return profile ? profile.publicData : null;
}

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

            // If profile not found, try to link account
            if (!userProfile && user.email) {
                try {
                    const privatePlayersRef = collection(db, "players_private");
                    const q = query(privatePlayersRef, where("email", "==", user.email));
                    const privateQuerySnapshot = await getDocs(q);

                    if (!privateQuerySnapshot.empty) {
                        const privateDoc = privateQuerySnapshot.docs[0];
                        if (!privateDoc.data().authId) {
                            await updateDoc(privateDoc.ref, { authId: user.uid });
                            userProfile = await fetchUserProfile(user.uid); // Re-fetch profile
                        }
                    }
                } catch (error) {
                    console.error("Error trying to link account:", error);
                }
            }

            // If the user is a committee member, ensure their status is reflected
            // in the 'users' collection for security rule validation.
            if (userProfile?.publicData?.committee) {
                try {
                    const userDocRef = doc(db, "users", user.uid);
                    await setDoc(userDocRef, { committee: true }, { merge: true });
                } catch (error) {
                    console.error("Error synchronizing committee status to 'users' collection:", error);
                }
            }

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
