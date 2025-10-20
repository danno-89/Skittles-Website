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
async function fetchPlayerStats(playerId, teamId) {
    if (!teamId || !playerId) return [];
    const allScores = [];

    const homeQuery = query(collection(db, "match_results"), where("homeTeamId", "==", teamId), where("status", "==", "completed"));
    const awayQuery = query(collection(db, "match_results"), where("awayTeamId", "==", teamId), where("status", "==", "completed"));

    const [homeSnapshot, awaySnapshot] = await Promise.all([
        getDocs(homeQuery),
        getDocs(awayQuery)
    ]);

    const processSnapshot = (snapshot, isHomeTeam) => {
        snapshot.forEach(doc => {
            const match = doc.data();
            const teamScores = isHomeTeam ? match.homeScores : match.awayScores;
            const opponentTeamId = isHomeTeam ? match.awayTeamId : match.homeTeamId;
            const playerScore = teamScores.find(s => s.playerId === playerId);
            
            if (playerScore) {
                const allMatchScores = [...match.homeScores, ...match.awayScores].map(s => s.score);
                const teamPlayerScores = teamScores.map(s => s.score);

                allMatchScores.sort((a, b) => b - a);
                teamPlayerScores.sort((a, b) => b - a);

                const matchRank = allMatchScores.indexOf(playerScore.score) + 1;
                const teamRank = teamPlayerScores.indexOf(playerScore.score) + 1;

                allScores.push({ 
                    ...playerScore, 
                    date: match.scheduledDate, 
                    opponent: opponentTeamId, 
                    matchId: doc.id,
                    teamScore: isHomeTeam ? match.homeScore : match.awayScore,
                    opponentScore: isHomeTeam ? match.awayScore : match.homeScore,
                    competitionId: match.division,
                    teamRank,
                    matchRank
                });
            }
        });
    };

    processSnapshot(homeSnapshot, true);
    processSnapshot(awaySnapshot, false);

    allScores.sort((a, b) => b.date.toDate() - a.date.toDate());
    return allScores;
}


function calculateSummaryStats(scores) {
    if (scores.length === 0) {
        return { fixturesPlayed: 0, totalPins: 0, averageScore: 'N/A', leagueAverageScore: 'N/A', highScore: 0, totalSpares: 0 };
    }
    
    const totalPins = scores.reduce((acc, s) => acc + s.score, 0);
    const highScore = Math.max(...scores.map(s => s.score));
    const totalSpares = scores.reduce((acc, s) => acc + s.hands.filter(h => h >= 10).length, 0);
    
    const leagueScores = scores.filter(s => s.competitionId === 'premier-division' || s.competitionId === 'first-division');
    const leagueTotalPins = leagueScores.reduce((acc, s) => acc + s.score, 0);
    const leagueAverage = leagueScores.length > 0 ? (leagueTotalPins / leagueScores.length).toFixed(2) : 'N/A';

    return {
        fixturesPlayed: scores.length,
        totalPins,
        averageScore: (totalPins / scores.length).toFixed(2),
        leagueAverageScore: leagueAverage,
        highScore,
        totalSpares
    };
}

async function renderStatistics(playerId, playerName, teamId, teamName) {
    document.getElementById('stats-player-name').textContent = playerName;
    document.getElementById('stats-team-name').textContent = teamName;
    
    const scores = await fetchPlayerStats(playerId, teamId);
    const summary = calculateSummaryStats(scores);

    const summaryContainer = document.querySelector('.stats-summary-grid');
    summaryContainer.innerHTML = `
        <div class="stat-box"><h4>Fixtures Played</h4><p>${summary.fixturesPlayed}</p></div>
        <div class="stat-box"><h4>Total Pins</h4><p>${summary.totalPins}</p></div>
        <div class="stat-box"><h4>Overall Average</h4><p>${summary.averageScore}</p></div>
        <div class="stat-box"><h4>League Average</h4><p>${summary.leagueAverageScore}</p></div>
        <div class="stat-box"><h4>High Score</h4><p>${summary.highScore}</p></div>
        <div class="stat-box"><h4>Spares</h4><p>${summary.totalSpares}</p></div>
    `;

    const tableContainer = document.querySelector('.stats-results-table');
    if (scores.length > 0) {
        const teamsMap = new Map();
        const competitionsMap = new Map();
        const teamIds = [...new Set(scores.map(s => s.opponent))];
        const competitionIds = [...new Set(scores.map(s => s.competitionId))];

        if (teamIds.length > 0) {
            const teamsQuery = query(collection(db, "teams"), where("__name__", "in", teamIds));
            const teamsSnapshot = await getDocs(teamsQuery);
            teamsSnapshot.forEach(doc => teamsMap.set(doc.id, doc.data().name));
        }
        if (competitionIds.length > 0) {
            const competitionsQuery = query(collection(db, "competitions"), where("__name__", "in", competitionIds));
            const competitionsSnapshot = await getDocs(competitionsQuery);
            competitionsSnapshot.forEach(doc => competitionsMap.set(doc.id, doc.data().name));
        }
        
        const crownIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="currentColor" class="winner-icon"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"></path></svg>`;

        tableContainer.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th></th>
                            <th>Date</th>
                            <th>H1</th><th>H2</th><th>H3</th><th>H4</th><th>H5</th>
                            <th>Total</th>
                            <th>Team Rank</th>
                            <th>Match Rank</th>
                            <th>Opponent</th>
                            <th>Competition</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${scores.map(s => {
                            let resultClass = 'draw';
                            if (s.teamScore > s.opponentScore) resultClass = 'win';
                            if (s.teamScore < s.opponentScore) resultClass = 'loss';

                            return `
                                <tr>
                                    <td><span class="result-indicator ${resultClass}"></span></td>
                                    <td>${formatDate(s.date)}</td>
                                    ${s.hands.map(h => `<td><span class="${h >= 10 ? 'highlight-score' : ''}">${h}</span></td>`).join('')}
                                    <td><strong>${s.score}</strong></td>
                                    <td>${s.teamRank}${s.teamRank === 1 ? crownIcon : ''}</td>
                                    <td>${s.matchRank}${s.matchRank === 1 ? crownIcon : ''}</td>
                                    <td>${teamsMap.get(s.opponent) || 'Unknown'}</td>
                                    <td>${competitionsMap.get(s.competitionId) || 'N/A'}</td>
                                </tr>
                            `;
                        }).join('')}
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
    let teamId = null;
    if (publicData) {
        populateField('first-name', publicData.firstName);
        populateField('last-name', publicData.lastName);
        populateField('role', publicData.role);
        populateField('registration-date', formatDate(publicData.registerDate));
        populateField('recent-fixture', formatDate(publicData.recentFixture));
        populateField('division', publicData.division);

        if (publicData.teamId) {
            teamId = publicData.teamId;
            const teamDocSnap = await getDoc(doc(db, 'teams', teamId));
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

        await renderStatistics(publicData.publicId, `${publicData.firstName} ${publicData.lastName}`, teamId, teamNameStr);
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
