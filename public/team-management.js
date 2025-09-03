import { auth, db, doc, getDoc, collection, query, where, getDocs, onAuthStateChanged } from './firebase.config.js';
import { getPublicData } from './auth-manager.js';

const playersContainer = document.getElementById('team-management-container');
const fixturesContainer = document.getElementById('fixtures-content');
const resultsContainer = document.getElementById('results-content');

// --- NEW AUTHENTICATION HANDLING ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const publicData = await getPublicData(user.uid);
        if (publicData) {
            setupTabs();
            initializePageData(publicData);
        } else {
            document.body.innerHTML = '<p>Your player profile could not be found.</p>';
        }
    } else {
        // If no user is logged in, redirect to the login page
        window.location.href = 'create.html?form=login';
    }
});


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
                pane.classList.remove('active');
                if (pane.id === `${tabId}-content`) {
                    pane.classList.add('active');
                }
            });
        });
    });
}

function formatTeamName(teamName) {
    if (typeof teamName === 'string' && teamName.startsWith('Display[')) {
        const startIndex = teamName.indexOf('[') + 1;
        const endIndex = teamName.indexOf(']');
        if (startIndex > 0 && endIndex > startIndex) {
            const displayText = teamName.substring(startIndex, endIndex);
            return `<strong class="highlight-yellow">${displayText}</strong>`;
        }
    }
    return teamName;
}

function getTeamName(teamsMap, teamIdentifier) {
    if (typeof teamIdentifier === 'string' && teamIdentifier.startsWith('Display[')) {
        return teamIdentifier;
    }
    return teamsMap.get(teamIdentifier) || "Unknown Team";
}


// --- DATA LOADING ---

const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return 'N/A';
    const date = timestamp.toDate();
    const day = date.getDate();
    const year = date.getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    return `${day} ${month} ${year}`;
};

async function loadTeamFixtures(teamId) {
    if (!fixturesContainer) return;

    try {
        const seasonsQuery = query(collection(db, "seasons"), where("status", "==", "current"));
        const seasonsSnapshot = await getDocs(seasonsQuery);
        if (seasonsSnapshot.empty) {
            fixturesContainer.innerHTML = "<p>Could not determine the current season.</p>";
            return;
        }
        const currentSeasonName = seasonsSnapshot.docs[0].data().name || seasonsSnapshot.docs[0].id;

        const teamsSnapshot = await getDocs(collection(db, "teams"));
        const teamsMap = new Map();
        teamsSnapshot.forEach(doc => teamsMap.set(doc.id, doc.data().name));

        const competitionsSnapshot = await getDocs(collection(db, "competitions"));
        const competitionsMap = new Map();
        competitionsSnapshot.forEach(doc => competitionsMap.set(doc.id, doc.data().name));

        const homeFixturesQuery = query(collection(db, "match_results"), where("season", "==", currentSeasonName), where("homeTeamId", "==", teamId));
        const awayFixturesQuery = query(collection(db, "match_results"), where("season", "==", currentSeasonName), where("awayTeamId", "==", teamId));
        
        const [homeFixturesSnapshot, awayFixturesSnapshot] = await Promise.all([
            getDocs(homeFixturesQuery),
            getDocs(awayFixturesQuery)
        ]);

        let allFixtures = [];
        homeFixturesSnapshot.forEach(doc => allFixtures.push({ id: doc.id, ...doc.data() }));
        awayFixturesSnapshot.forEach(doc => allFixtures.push({ id: doc.id, ...doc.data() }));

        const upcomingFixtures = allFixtures.filter(fixture => {
            return fixture.scheduledDate && typeof fixture.scheduledDate.toDate === 'function' && (!fixture.homeScore || !fixture.awayScore);
        });
        
        upcomingFixtures.sort((a, b) => a.scheduledDate.toDate() - b.scheduledDate.toDate());

        if (upcomingFixtures.length === 0) {
            fixturesContainer.innerHTML = "<p>No fixtures found for the current season.</p>";
            return;
        }

        let lastRenderedDate = null;
        const fixturesHtml = upcomingFixtures.map(fixture => {
            const dateObj = fixture.scheduledDate.toDate();
            
            const date = formatDate(fixture.scheduledDate);
            const time = dateObj.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' });

            const homeTeamName = formatTeamName(getTeamName(teamsMap, fixture.homeTeamId));
            const awayTeamIdentifier = fixture.awayTeamId || fixture.awayTeamis;
            const awayTeamName = formatTeamName(getTeamName(teamsMap, awayTeamIdentifier));
            const competitionName = competitionsMap.get(fixture.division) || fixture.division;
            const round = fixture.round || '';
            
            const dateCell = (date === lastRenderedDate) ? '' : date;
            if (date !== lastRenderedDate) {
                lastRenderedDate = date;
            }

            return `
                <tr>
                    <td>${dateCell}</td>
                    <td>${time}</td>
                    <td class="${fixture.homeTeamId === teamId ? 'highlight-green' : ''}">${homeTeamName}</td>
                    <td class="centered-cell">vs</td>
                    <td class="${fixture.awayTeamId === teamId ? 'highlight-green' : ''}">${awayTeamName}</td>
                    <td>${competitionName}</td>
                    <td>${round}</td>
                </tr>
            `;
        }).join('');

        fixturesContainer.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Home</th>
                            <th></th>
                            <th>Away</th>
                            <th>Competition</th>
                            <th>Round</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${fixturesHtml}
                    </tbody>
                </table>
            </div>
        `;

    } catch (error) {
        console.error("Error loading team fixtures:", error);
        fixturesContainer.innerHTML = "<p>An error occurred while loading team fixtures.</p>";
    }
}

async function loadTeamResults(teamId) {
    if (!resultsContainer) return;

    try {
        const seasonsQuery = query(collection(db, "seasons"), where("status", "==", "current"));
        const seasonsSnapshot = await getDocs(seasonsQuery);
        if (seasonsSnapshot.empty) {
            resultsContainer.innerHTML = "<p>Could not determine the current season.</p>";
            return;
        }
        const currentSeasonName = seasonsSnapshot.docs[0].data().name || seasonsSnapshot.docs[0].id;

        const teamsSnapshot = await getDocs(collection(db, "teams"));
        const teamsMap = new Map();
        teamsSnapshot.forEach(doc => teamsMap.set(doc.id, doc.data().name));

        const competitionsSnapshot = await getDocs(collection(db, "competitions"));
        const competitionsMap = new Map();
        competitionsSnapshot.forEach(doc => competitionsMap.set(doc.id, doc.data().name));

        const homeFixturesQuery = query(collection(db, "match_results"), where("season", "==", currentSeasonName), where("homeTeamId", "==", teamId));
        const awayFixturesQuery = query(collection(db, "match_results"), where("season", "==", currentSeasonName), where("awayTeamId", "==", teamId));
        
        const [homeFixturesSnapshot, awayFixturesSnapshot] = await Promise.all([
            getDocs(homeFixturesQuery),
            getDocs(awayFixturesQuery)
        ]);

        let allFixtures = [];
        homeFixturesSnapshot.forEach(doc => allFixtures.push({ id: doc.id, ...doc.data() }));
        awayFixturesSnapshot.forEach(doc => allFixtures.push({ id: doc.id, ...doc.data() }));

        const playedFixtures = allFixtures.filter(fixture => {
            return fixture.scheduledDate && typeof fixture.scheduledDate.toDate === 'function' && fixture.homeScore && fixture.awayScore;
        });
        
        playedFixtures.sort((a, b) => b.scheduledDate.toDate() - a.scheduledDate.toDate());

        if (playedFixtures.length === 0) {
            resultsContainer.innerHTML = "<p>No results found for the current season.</p>";
            return;
        }

        let lastRenderedDate = null;
        const resultsHtml = playedFixtures.map(fixture => {
            const date = formatDate(fixture.scheduledDate);

            const homeTeamName = formatTeamName(getTeamName(teamsMap, fixture.homeTeamId));
            const awayTeamIdentifier = fixture.awayTeamId || fixture.awayTeamis;
            const awayTeamName = formatTeamName(getTeamName(teamsMap, awayTeamIdentifier));
            const competitionName = competitionsMap.get(fixture.division) || fixture.division;
            const round = fixture.round || '';
            
            const dateCell = (date === lastRenderedDate) ? '' : date;
            if (date !== lastRenderedDate) {
                lastRenderedDate = date;
            }

            let resultIndicator = '<span class="result-indicator draw"></span>';
            if (fixture.homeTeamId === teamId) {
                if (fixture.homeScore > fixture.awayScore) {
                    resultIndicator = '<span class="result-indicator win"></span>';
                } else if (fixture.homeScore < fixture.awayScore) {
                    resultIndicator = '<span class="result-indicator loss"></span>';
                }
            } else {
                if (fixture.awayScore > fixture.homeScore) {
                    resultIndicator = '<span class="result-indicator win"></span>';
                } else if (fixture.awayScore < fixture.homeScore) {
                    resultIndicator = '<span class="result-indicator loss"></span>';
                }
            }

            return `
                <tr>
                    <td>${resultIndicator}</td>
                    <td>${dateCell}</td>
                    <td class="team-name ${fixture.homeTeamId === teamId ? 'highlight-green' : ''}">${homeTeamName}</td>
                    <td class="score-cell">${fixture.homeScore} - ${fixture.awayScore}</td>
                    <td class="team-name ${fixture.awayTeamId === teamId ? 'highlight-green' : ''}">${awayTeamName}</td>
                    <td>${competitionName}</td>
                    <td>${round}</td>
                    <td><a href="match_details.html?matchId=${fixture.id}&from=team-management" class="btn-details">View Details</a></td>
                </tr>
            `;
        }).join('');

        resultsContainer.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th></th>
                            <th>Date</th>
                            <th>Home</th>
                            <th>Score</th>
                            <th>Away</th>
                            <th>Competition</th>
                            <th>Round</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${resultsHtml}
                    </tbody>
                </table>
            </div>
        `;

    } catch (error) {
        console.error("Error loading team results:", error);
        resultsContainer.innerHTML = "<p>An error occurred while loading team results.</p>";
    }
}

async function loadTeamPlayers(teamId) {
    if (!playersContainer) return;
    playersContainer.innerHTML = '<p>Loading roster...</p>';

    try {
        const playersQuery = query(collection(db, "players_public"), where("teamId", "==", teamId));
        const playersSnapshot = await getDocs(playersQuery);
        let allPlayers = playersSnapshot.docs.map(doc => doc.data());

        const upcomingFixtures = await getUpcomingFixtures(teamId);
        const now = new Date();

        allPlayers = allPlayers.map(p => {
            const daysLeft = p.registerExpiry ? Math.ceil((p.registerExpiry.toDate() - now) / (1000 * 60 * 60 * 24)) : null;
            let highlightClass = '';
            const hasFixtureBeforeExpiry = p.registerExpiry && upcomingFixtures.some(f => f.scheduledDate.toDate() < p.registerExpiry.toDate());

            if (!p.recentFixture && p.registerDate && p.registerDate.toDate() > new Date(new Date().setDate(now.getDate() - 30))) {
                highlightClass = 'player-new';
            } else if (daysLeft !== null && daysLeft <= 30) {
                highlightClass = 'player-expiring-soon';
            }

            if (!hasFixtureBeforeExpiry && p.registerExpiry) {
                 if (daysLeft <= 30) {
                    highlightClass = 'player-no-fixtures-danger';
                } else {
                    highlightClass = 'player-no-fixtures-warn';
                }
            }

            return { ...p, daysLeft, highlightClass };
        });

        const activePlayers = allPlayers.filter(p => !p.registerExpiry || p.registerExpiry.toDate() >= now);
        const expiredPlayers = allPlayers.filter(p => p.registerExpiry && p.registerExpiry.toDate() < now);

        const roleOrder = { "Captain": 1, "Vice Captain": 2, "Player": 3 };
        const sortPlayers = (players) => players.sort((a, b) => (roleOrder[a.role] || 4) - (roleOrder[b.role] || 4));
        
        sortPlayers(activePlayers);
        sortPlayers(expiredPlayers);

        const createActiveTable = (players) => {
            if (players.length === 0) return '<h3>Active Players</h3><p>No active players found.</p>';
            return `
                <h3>Active Players</h3>
                <div class="table-container">
                    <table class="player-roster-table">
                        <thead>
                            <tr>
                                <th>Player</th>
                                <th>Role</th>
                                <th>Reg. Date</th>
                                <th>Last Game</th>
                                <th>Expiry</th>
                                <th>Days Left</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${players.map(p => `
                                <tr class="${p.highlightClass}">
                                    <td>${p.firstName} ${p.lastName}</td>
                                    <td>${p.role !== 'Player' ? p.role : ''}</td>
                                    <td>${formatDate(p.registerDate)}</td>
                                    <td>${formatDate(p.recentFixture)}</td>
                                    <td>${formatDate(p.registerExpiry)}</td>
                                    <td>${p.daysLeft !== null ? p.daysLeft : 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        };
        
        const createExpiredTable = (players) => {
            if (players.length === 0) return '';
            return `
                <h3>Expired Players</h3>
                <div class="table-container">
                    <table class="player-roster-table">
                        <thead>
                            <tr>
                                <th>Player</th>
                                <th>Role</th>
                                <th>Reg. Date</th>
                                <th>Last Game</th>
                                <th>Expiry</th>
                                <th>Days Left</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${players.map(p => `
                                <tr>
                                    <td>${p.firstName} ${p.lastName}</td>
                                    <td>${p.role !== 'Player' ? p.role : ''}</td>
                                    <td>${formatDate(p.registerDate)}</td>
                                    <td>${formatDate(p.recentFixture)}</td>
                                    <td>${formatDate(p.registerExpiry)}</td>
                                    <td>Expired</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        };
        
        let pageHtml = createActiveTable(activePlayers);
        pageHtml += createExpiredTable(expiredPlayers);

        playersContainer.innerHTML = pageHtml;

    } catch (error) {
        console.error("Error loading team players:", error);
        playersContainer.innerHTML = `<p>An error occurred while loading the player roster.</p>`;
    }
}

async function getUpcomingFixtures(teamId) {
    const fixtures = [];
    const now = new Date();
    
    const homeQuery = query(collection(db, "match_results"), where("homeTeamId", "==", teamId), where("scheduledDate", ">=", now));
    const awayQuery = query(collection(db, "match_results"), where("awayTeamId", "==", teamId), where("scheduledDate", ">=", now));

    const [homeSnapshot, awaySnapshot] = await Promise.all([getDocs(homeQuery), getDocs(awayQuery)]);
    
    homeSnapshot.forEach(doc => fixtures.push(doc.data()));
    awaySnapshot.forEach(doc => fixtures.push(doc.data()));

    return fixtures;
}

async function initializePageData(publicData) { // Updated to accept publicData
    if (!publicData) {
        document.body.innerHTML = '<p>Your player profile could not be found.</p>';
        return;
    }

    const { role, teamId } = publicData; // Destructure from publicData

    if (role !== 'Captain' && role !== 'Vice Captain') {
        document.body.innerHTML = '<p>You do not have permission to view this page.</p>';
        return;
    }
    if (!teamId) {
        playersContainer.innerHTML = '<p>You are not currently assigned to a team.</p>';
        return;
    }

    const teamDocRef = doc(db, "teams", teamId);
    const teamDocSnap = await getDoc(teamDocRef);
    if (teamDocSnap.exists()) {
        document.querySelector('.page-header h1').textContent = teamDocSnap.data().name || "Team Management";
    }
    
    loadTeamPlayers(teamId);
    loadTeamFixtures(teamId);
    loadTeamResults(teamId);
}
