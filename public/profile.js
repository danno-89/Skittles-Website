import { authReady } from './auth-manager.js';
import { db, doc, getDoc, collection, query, where, getDocs, orderBy } from './firebase.config.js';

// --- Helper Functions ---
const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return 'N/A';
    const date = timestamp.toDate();
    const day = date.getDate();
    const year = date.getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    return `${day} ${month} ${year}`;
};

const setupTabs = () => {
    const tabs = document.querySelectorAll('.tab-link');
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabPanes.forEach(pane => {
                if (pane) {
                    pane.id === `${tabName}-content` ? pane.classList.add('active') : pane.classList.remove('active');
                }
            });
        });
    });
};

// --- Statistics Functions ---
async function fetchPlayerStats(playerId) {
    const allScores = [];
    const matchResultsQuery = query(collection(db, "match_results"), where("status", "==", "completed"));
    const querySnapshot = await getDocs(matchResultsQuery);

    querySnapshot.forEach(doc => {
        const match = doc.data();
        const homePlayer = match.homeScores.find(s => s.playerId === playerId);
        const awayPlayer = match.awayScores.find(s => s.playerId === playerId);

        if (homePlayer) {
            allScores.push({ ...homePlayer, date: match.scheduledDate, opponent: match.awayTeamId, matchId: doc.id });
        }
        if (awayPlayer) {
            allScores.push({ ...awayPlayer, date: match.scheduledDate, opponent: match.homeTeamId, matchId: doc.id });
        }
    });

    allScores.sort((a, b) => b.date.toDate() - a.date.toDate());
    return allScores;
}

function calculateSummaryStats(scores) {
    if (scores.length === 0) {
        return { fixturesPlayed: 0, totalPins: 0, averageScore: 0, highScore: 0, totalSpares: 0 };
    }
    const totalPins = scores.reduce((acc, s) => acc + s.score, 0);
    const highScore = Math.max(...scores.map(s => s.score));
    const totalSpares = scores.reduce((acc, s) => acc + s.hands.filter(h => h >= 10).length, 0);
    
    return {
        fixturesPlayed: scores.length,
        totalPins,
        averageScore: (totalPins / scores.length).toFixed(2),
        highScore,
        totalSpares
    };
}

async function renderStatistics(playerId, playerName, teamName) {
    document.getElementById('stats-player-name').textContent = playerName;
    document.getElementById('stats-team-name').textContent = teamName;
    
    const scores = await fetchPlayerStats(playerId);
    const summary = calculateSummaryStats(scores);

    const summaryContainer = document.querySelector('.stats-summary-grid');
    summaryContainer.innerHTML = `
        <div class="stat-box"><h4>Fixtures Played</h4><p>${summary.fixturesPlayed}</p></div>
        <div class="stat-box"><h4>Total Pins</h4><p>${summary.totalPins}</p></div>
        <div class="stat-box"><h4>Average Score</h4><p>${summary.averageScore}</p></div>
        <div class="stat-box"><h4>High Score</h4><p>${summary.highScore}</p></div>
        <div class="stat-box"><h4>Spares</h4><p>${summary.totalSpares}</p></div>
    `;

    const tableContainer = document.querySelector('.stats-results-table');
    if (scores.length > 0) {
        const teamsMap = new Map();
        const teamIds = [...new Set(scores.map(s => s.opponent))];
        if (teamIds.length > 0) {
            const teamsQuery = query(collection(db, "teams"), where("__name__", "in", teamIds));
            const teamsSnapshot = await getDocs(teamsQuery);
            teamsSnapshot.forEach(doc => teamsMap.set(doc.id, doc.data().name));
        }

        tableContainer.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Opponent</th>
                            <th>H1</th><th>H2</th><th>H3</th><th>H4</th><th>H5</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${scores.map(s => `
                            <tr>
                                <td>${formatDate(s.date)}</td>
                                <td>${teamsMap.get(s.opponent) || 'Unknown'}</td>
                                ${s.hands.map(h => `<td>${h}</td>`).join('')}
                                <td><strong>${s.score}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else {
        tableContainer.innerHTML = '<p>No match results found for this player.</p>';
    }
}


// --- Main Profile Display ---
async function displayProfileData(user, publicData, privateData) {
    const populateField = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value || 'N/A';
    };

    let teamNameStr = 'N/A';
    if (publicData) {
        populateField('first-name', publicData.firstName);
        populateField('last-name', publicData.lastName);
        populateField('role', publicData.role);
        populateField('registration-date', formatDate(publicData.registerDate));
        populateField('recent-fixture', formatDate(publicData.recentFixture));
        populateField('division', publicData.division);

        if (publicData.teamId) {
            const teamDocSnap = await getDoc(doc(db, 'teams', publicData.teamId));
            if (teamDocSnap.exists()) {
                teamNameStr = teamDocSnap.data().name;
                populateField('team-name', teamNameStr);
            }
        }

        if (publicData.registerExpiry) {
            const expiryDate = publicData.registerExpiry.toDate();
            const daysRemaining = Math.ceil((expiryDate - new Date()) / (1000 * 3600 * 24));
            populateField('register-expiry', formatDate(publicData.registerExpiry));
            populateField('days-to-expiry', daysRemaining > 0 ? daysRemaining : 'Expired');
        }

        await renderStatistics(user.uid, `${publicData.firstName} ${publicData.lastName}`, teamNameStr);
    }
    
    if (privateData) {
        populateField('email', privateData.email);
        populateField('dob', formatDate(privateData.dob));
        populateField('mobile-no', privateData.mobileNo);
        populateField('home-no', privateData.homeNo);
        if (privateData.address) {
            populateField('address-line-1', privateData.address.line1);
            populateField('address-line-2', privateData.address.line2);
            populateField('address-line-3', privateData.address.line3);
            populateField('parish', privateData.address.parish);
            populateField('postcode', privateData.address.postCode);
        }
    }
}


// --- DOMContentLoaded Listener ---
document.addEventListener('DOMContentLoaded', () => {
    authReady.then(async ({ user, publicData, privateData }) => {
        const profileForm = document.getElementById('profile-form');
        if (!user) {
            profileForm.innerHTML = `<div class="page-header"><h1>My Profile</h1></div><div class="card"><p>Please log in to view your profile.</p><a href="/index.html" class="btn btn-primary">Log In</a></div>`;
            return;
        }

        if (publicData && privateData) {
            setupTabs();
            await displayProfileData(user, publicData, privateData);
        } else {
            const content = document.getElementById('personal-details-content');
            content.innerHTML = `<div class="card-no-hover"><h2 class="heading-border">Profile Not Found</h2><div class="profile-details"><p>We could not find a player profile linked to your user account.</p><p>Please contact a committee member if you believe this is an error.</p></div></div>`;
            document.getElementById('statistics-content').innerHTML = '';
        }
    }).catch(error => {
        console.error("Error initializing profile page:", error);
    });
});
