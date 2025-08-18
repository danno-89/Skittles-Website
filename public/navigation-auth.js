import { auth, db } from './firebase.config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

function setupAuth() {
    const skittlesHubTitle = document.getElementById('skittles-hub-title');
    const dataInputLink = document.getElementById('data-input-link');
    const profileLink = document.getElementById('profile-link');
    const loginLink = document.getElementById('login-link');
    const logoutLink = document.getElementById('logout-link'); // Corrected from signOutBtn
    const signOutBtn = document.getElementById('sign-out-btn'); // For profile page

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in
            if (loginLink) loginLink.style.display = 'none';
            if (logoutLink) logoutLink.style.display = 'list-item'; // Show logout
            if (dataInputLink) dataInputLink.style.display = 'list-item';
            if (profileLink) profileLink.style.display = 'list-item';
            if (signOutBtn) signOutBtn.style.display = 'block'; // Show on profile page

            // Fetch user's first name
            try {
                const privatePlayersRef = collection(db, "players_private");
                const q = query(privatePlayersRef, where("authId", "==", user.uid));
                const privateQuerySnapshot = await getDocs(q);

                if (!privateQuerySnapshot.empty) {
                    const privateDoc = privateQuerySnapshot.docs[0];
                    const publicPlayerId = privateDoc.id;
                    
                    const publicDocRef = doc(db, "players_public", publicPlayerId);
                    const publicDocSnap = await getDoc(publicDocRef);

                    if (publicDocSnap.exists()) {
                        const publicData = publicDocSnap.data();
                        if (publicData && publicData.firstName) {
                            if (skittlesHubTitle) skittlesHubTitle.textContent = `${publicData.firstName}'s Skittles Hub`;
                        } else {
                            if (skittlesHubTitle) skittlesHubTitle.textContent = 'Your Skittles Hub';
                        }
                    } else {
                        if (skittlesHubTitle) skittlesHubTitle.textContent = `Your Skittles Hub`;
                    }
                } else {
                    if (skittlesHubTitle) skittlesHubTitle.textContent = `Skittles Hub`;
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
                if (skittlesHubTitle) skittlesHubTitle.textContent = `Skittles Hub`;
            }

        } else {
            // User is signed out
            if (loginLink) loginLink.style.display = 'list-item';
            if (logoutLink) logoutLink.style.display = 'none'; // Hide logout
            if (dataInputLink) dataInputLink.style.display = 'none';
            if (profileLink) profileLink.style.display = 'none';
            if (signOutBtn) signOutBtn.style.display = 'none';
            if (skittlesHubTitle) skittlesHubTitle.textContent = 'Skittles Hub';
        }
    });

    // Handle sign-out from navigation
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior
            signOut(auth).then(() => {
                window.location.href = '/index.html';
            }).catch((error) => {
                console.error("Sign out error:", error);
            });
        });
    }

    // Handle sign-out from profile page button
    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                window.location.href = '/index.html';
            }).catch((error) => {
                console.error("Sign out error:", error);
            });
        });
    }
}

// Wait for navigation to be loaded before setting up authentication logic.
const waitForNav = setInterval(() => {
    if (document.getElementById('login-link') && document.getElementById('logout-link')) {
        clearInterval(waitForNav);
        setupAuth();
    }
}, 100);
