import { auth, db } from './firebase.config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// --- HELPER FUNCTIONS ---
function formatDate(timestamp) {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
        return 'N/A';
    }
    const dateObj = timestamp.toDate();
    return dateObj.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function calculateAge(timestamp) {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
        return 'N/A';
    }
    const birthDate = timestamp.toDate();
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// --- TAB HANDLING ---
function setupTabs() {
    const tabLinks = document.querySelectorAll('.tabs-main .tab-link');
    const tabPanes = document.querySelectorAll('#tab-content-container .tab-pane');

    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tabId = link.dataset.tab;

            tabLinks.forEach(innerLink => innerLink.classList.remove('active'));
            link.classList.add('active');

            tabPanes.forEach(pane => {
                if (pane.id === `${tabId}-content`) {
                    pane.classList.add('active');
                } else {
                    pane.classList.remove('active');
                }
            });
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const privatePlayersRef = collection(db, "players_private");
                const q = query(privatePlayersRef, where("authId", "==", user.uid));
                const privateQuerySnapshot = await getDocs(q);

                if (!privateQuerySnapshot.empty) {
                    const privateDoc = privateQuerySnapshot.docs[0];
                    const privateData = privateDoc.data();
                    const publicPlayerId = privateDoc.id;

                    const publicDocRef = doc(db, "players_public", publicPlayerId);
                    const publicDocSnap = await getDoc(publicDocRef);

                    if (publicDocSnap.exists()) {
                        const publicData = publicDocSnap.data();
                        let teamName = 'N/A';
                        let teamId = null;

                        if (publicData.teamId) {
                            teamId = publicData.teamId;
                            const teamDocRef = doc(db, "teams", teamId);
                            const teamDocSnap = await getDoc(teamDocRef);
                            if (teamDocSnap.exists()) {
                                teamName = teamDocSnap.data().name || 'N/A';
                            }
                        }
                        
                        if (teamId && (publicData.role === 'Captain' || publicData.role === 'Vice Captain')) {
                            const tabsContainer = document.querySelector('.tabs-main');
                            const contentContainer = document.getElementById('tab-content-container');
                            const teamTabId = 'team-management';

                            const teamTab = document.createElement('button');
                            teamTab.className = 'tab-link';
                            teamTab.dataset.tab = teamTabId;
                            teamTab.textContent = teamName;
                            tabsContainer.appendChild(teamTab);

                            const teamPane = document.createElement('div');
                            teamPane.id = `${teamTabId}-content`;
                            teamPane.className = 'tab-pane';
                            teamPane.innerHTML = `<h3>Loading team players...</h3>`;
                            contentContainer.appendChild(teamPane);
                            
                            populateTeamManagementTab(teamId, teamPane);
                        }

                        setupTabs();
                        populatePublicInfo(publicData, teamName);
                        populatePrivateInfo(privateData);
                        populateRegistrationInfo(publicData);
                        populateConsentSection(privateData);

                    } else {
                        document.getElementById('profile-data').innerHTML = '<p>Could not find player profile.</p>';
                    }
                } else {
                    document.getElementById('profile-data').innerHTML = '<p>No player profile linked to this account.</p>';
                }
            } catch (error) {
                console.error("Error fetching player data:", error);
                document.getElementById('profile-data').innerHTML = '<p>Error loading profile data.</p>';
            }
        } else {
            window.location.href = 'create.html';
        }
    });
});

async function populateTeamManagementTab(teamId, container) {
    const playersRef = collection(db, "players_public");
    const q = query(playersRef, where("teamId", "==", teamId));
    const querySnapshot = await getDocs(q);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let registeredPlayers = [];
    let expiredPlayers = [];

    querySnapshot.forEach(doc => {
        const playerData = doc.data();
        const player = {
            name: `${playerData.firstName} ${playerData.lastName}`,
            expiryDate: playerData.registerExpiry ? playerData.registerExpiry.toDate() : null
        };

        if (player.expiryDate && player.expiryDate >= today) {
            registeredPlayers.push(player);
        } else {
            expiredPlayers.push(player);
        }
    });

    registeredPlayers.sort((a, b) => a.name.localeCompare(b.name));
    expiredPlayers.sort((a, b) => a.name.localeCompare(b.name));

    let html = `
        <div class="team-player-list">
            <h2>Registered Players</h2>
            ${registeredPlayers.length > 0 ? registeredPlayers.map(p => `
                <div class="player-item">
                    <span>${p.name}</span>
                    <span class="expiry-date">Expires: ${formatDate(p.expiryDate)}</span>
                </div>`).join('') : '<p>No currently registered players.</p>'}
        </div>
        <div class="team-player-list">
            <h2>Expired Players</h2>
            ${expiredPlayers.length > 0 ? expiredPlayers.map(p => `
                <div class="player-item expired">
                    <span>${p.name}</span>
                    <span class="expiry-date">Expired: ${p.expiryDate ? formatDate(p.expiryDate) : 'N/A'}</span>
                </div>`).join('') : '<p>No players with expired registrations.</p>'}
        </div>
    `;

    container.innerHTML = html;
}

function populatePublicInfo(publicData, teamName) {
    const container = document.getElementById('public-info-container');
    container.innerHTML = `
        <h2>Public Information</h2>
        <div class="profile-field">
            <label>First Name</label>
            <p>${publicData?.firstName || 'N/A'}</p>
        </div>
        <div class="profile-field">
            <label>Last Name</label>
            <p>${publicData?.lastName || 'N/A'}</p>
        </div>
        <div class="profile-field">
            <label>Team Name</label>
            <p>${teamName || 'N/A'}</p>
        </div>
        <div class="profile-field">
            <label>Nickname</label>
            <p>${publicData?.nickname || '&nbsp;'}</p>
        </div>
        <div class="profile-field">
            <label>Role</label>
            <p>${publicData?.role || '&nbsp;'}</p>
        </div>
        <div class="profile-field">
            <label>Committee</label>
            <p>${publicData?.committee || '&nbsp;'}</p>
        </div>
    `;
}

function populatePrivateInfo(privateData) {
    const container = document.getElementById('private-info-container');
    
    let formattedAddress = '&nbsp;';
    if (privateData?.address) {
        const addressFields = ['line1', 'line2', 'line3', 'parish', 'postCode'];
        const addressParts = [];
        for (const field of addressFields) {
            if (privateData.address[field]) {
                addressParts.push(privateData.address[field]);
            }
        }
        if (addressParts.length > 0) {
            formattedAddress = addressParts.join('<br>');
        }
    }
    
    container.innerHTML = `
        <h2>Personal Information</h2>
        <div class="profile-field">
            <label>Email Address</label>
            <p>${privateData?.email || 'N/A'}</p>
        </div>
        <div class="profile-field">
            <label>Mobile Number</label>
            <p>${privateData?.mobileNo || '&nbsp;'}</p>
        </div>
        <div class="profile-field">
            <label>Home / Work Number</label>
            <p>${privateData?.homeNo || '&nbsp;'}</p>
        </div>
        <div class="profile-field-horizontal">
            <div class="profile-field">
                <label>Date of Birth</label>
                <p>${formatDate(privateData?.dob) || '&nbsp;'}</p>
            </div>
            <div class="profile-field">
                <label>Age</label>
                <p>${calculateAge(privateData?.dob) || '&nbsp;'}</p>
            </div>
        </div>
        <div class="profile-field">
            <label>Address</label>
            <p>${formattedAddress}</p>
        </div>
    `;
}

function populateRegistrationInfo(publicData) {
    const container = document.getElementById('registration-info-container');
    
    const registerDate = formatDate(publicData?.registerDate);
    const recentFixture = formatDate(publicData?.recentFixture);
    const registerExpiry = formatDate(publicData?.registerExpiry);

    let daysUntilExpiry = 'N/A';
    if (publicData?.registerExpiry?.toDate) {
        const expiryDate = publicData.registerExpiry.toDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        expiryDate.setHours(0, 0, 0, 0);

        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            daysUntilExpiry = '<span class="expired">Expired</span>';
        } else if (diffDays === 0) {
            daysUntilExpiry = 'Expires today';
        } else {
            daysUntilExpiry = `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
        }
    }

    container.innerHTML = `
        <h2>Registration Details</h2>
        <div class="profile-field">
            <label>Registration Date</label>
            <p>${registerDate}</p>
        </div>
        <div class="profile-field">
            <label>Recent Fixture</label>
            <p>${recentFixture}</p>
        </div>
        <div class="profile-field">
            <label>Registration Expiry</label>
            <p>${registerExpiry}</p>
        </div>
        <div class="profile-field">
            <label>Days until Expiry</label>
            <p>${daysUntilExpiry}</p>
        </div>
    `;
}

function populateConsentSection(privateData) {
    const container = document.getElementById('consent-section-container');
    const hasConsented = privateData?.consent === 'Yes';

    container.innerHTML = `
        <div class="consent-section">
            <div class="checkbox-group">
                <input type="checkbox" id="consent-checkbox" ${hasConsented ? 'checked' : ''} disabled>
                <label for="consent-checkbox">I consent to be notified by the league regarding any events, information, updates or statistics that are circulated from time to time.</label>
            </div>
            <p class="explanation">
                For the Club to be able to register you as a player, we need to collect and store some personal data. 
                This is a requirement of the local association and for the Club to be able to operate. 
                Please read our <a href="gdpr.html">GDPR Policy</a> for more details.
            </p>
        </div>
    `;
}
