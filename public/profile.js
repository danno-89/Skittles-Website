
import { auth, db } from './firebase.config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const userName = document.getElementById('user-name');
    const userTeam = document.getElementById('user-team');
    const signOutBtn = document.getElementById('sign-out-btn');
    const publicProfileData = document.getElementById('public-profile-data');
    const privateProfileData = document.getElementById('private-profile-data');
    const privateInfoCard = document.getElementById('private-info-card');
    const dataInputLinkContainer = document.getElementById('data-input-link-container');

    const createDetailItem = (label, value) => { /* ... (helper function) ... */ };
    const parseDate = (dateStr) => { /* ... (helper function) ... */ };
    const formatDate = (dateInput) => { /* ... (helper function) ... */ };
    const calculateExpiry = (expiryDateStr) => { /* ... (helper function) ... */ };

    // --- Main Logic ---
    const urlParams = new URLSearchParams(window.location.search);
    const profileId = urlParams.get('id'); // Get player ID from URL

    onAuthStateChanged(auth, async (user) => {
        if (profileId) {
            // --- Viewing ANOTHER player's profile ---
            if (signOutBtn) signOutBtn.style.display = 'none'; // Hide sign out button
            if (privateInfoCard) privateInfoCard.style.display = 'none'; // Hide private info card
            await displayPublicProfile(profileId);
        } else if (user) {
            // --- Viewing YOUR OWN profile ---
            if (signOutBtn) signOutBtn.style.display = 'block';
            await displayOwnProfile(user.uid);
        } else {
            // --- Not logged in and no profile ID specified ---
            window.location.href = 'index.html';
        }
    });
    
    async function displayPublicProfile(playerId) {
        const publicDocRef = doc(db, "players_public", playerId);
        const publicDocSnap = await getDoc(publicDocRef);

        if (publicDocSnap.exists()) {
            const publicData = publicDocSnap.data();
            populatePublicCard(publicData);
        } else {
            if (userName) userName.textContent = "Player Not Found";
        }
    }

    async function displayOwnProfile(userId) {
        const privatePlayersRef = collection(db, "players_private");
        const privateQuery = query(privatePlayersRef, where("authId", "==", userId));
        const privateSnapshot = await getDocs(privateQuery);

        if (!privateSnapshot.empty) {
            const privateDoc = privateSnapshot.docs[0];
            const privateData = privateDoc.data();
            const publicDocRef = doc(db, "players_public", privateDoc.id);
            const publicDocSnap = await getDoc(publicDocRef);

            if (publicDocSnap.exists()) {
                const publicData = publicDocSnap.data();
                populatePublicCard(publicData);
                if (publicData.committee) {
                    dataInputLinkContainer.innerHTML = `<a href="data_input.html" class="committee-link">Data Input</a>`;
                }
            }
            populatePrivateCard(privateData);
            if (privateInfoCard) privateInfoCard.style.display = 'block';
        } else {
            if (userName) userName.textContent = "Profile Not Linked";
        }
    }

    async function populatePublicCard(publicData) {
        let teamNameStr = "No Team Assigned";
        if (publicData.team && publicData.team.path) {
            const teamDocSnap = await getDoc(publicData.team);
            if (teamDocSnap.exists()) {
                teamNameStr = teamDocSnap.data().name || "Unknown Team";
            }
        }
        if (userName) userName.textContent = `${publicData.firstName} ${publicData.lastName}`;
        if (userTeam) userTeam.textContent = teamNameStr;
        if (publicProfileData) {
            publicProfileData.innerHTML = '';
            publicProfileData.appendChild(createDetailItem('Handicap', publicData.handicap));
            const expiryInfo = calculateExpiry(publicData.registerExpiry);
            const daysUntilExpiry = expiryInfo.daysUntilExpiry < 0 ? 'Expired' : `${expiryInfo.daysUntilExpiry} days`;
            publicProfileData.appendChild(createDetailItem('Registration Date', formatDate(publicData.registerDate)));
            publicProfileData.appendChild(createDetailItem('Expiry Date', formatDate(publicData.registerExpiry)));
            publicProfileData.appendChild(createDetailItem('Expires In', daysUntilExpiry));
        }
    }
    
    function populatePrivateCard(privateData) {
        if (privateProfileData) {
            privateProfileData.innerHTML = '';
            privateProfileData.appendChild(createDetailItem('Email', privateData.email));
            privateProfileData.appendChild(createDetailItem('Date of Birth', privateData.dob));
            privateProfileData.appendChild(createDetailItem('Mobile No', privateData.mobileNo));
        }
    }

    // --- Re-add helper function definitions that were removed for brevity ---
    createDetailItem = (label, value) => {
        const item = document.createElement('div');
        item.classList.add('detail-item');
        item.innerHTML = `<span class="detail-label">${label}</span><span class="detail-value">${value || 'N/A'}</span>`;
        return item;
    };
    parseDate = (dateStr) => {
        if (!dateStr || typeof dateStr !== 'string') return null;
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const [day, month, year] = parts.map(Number);
            return new Date(year, month - 1, day);
        }
        return null;
    };
    formatDate = (dateInput) => {
        const date = parseDate(dateInput);
        if (!date) return 'N/A';
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/ /g, ' ');
    };
    calculateExpiry = (expiryDateStr) => {
        if (!expiryDateStr) return { daysUntilExpiry: Infinity };
        const expiryDate = parseDate(expiryDateStr);
        if (!expiryDate) return { daysUntilExpiry: Infinity };
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const timeDiff = expiryDate.getTime() - today.getTime();
        return { daysUntilExpiry: Math.ceil(timeDiff / (1000 * 3600 * 24)) };
    };

    if (signOutBtn) {
        signOutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Sign out error', error);
            }
        });
    }
});
