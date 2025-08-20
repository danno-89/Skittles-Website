import { db } from './firebase.config.js';
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const playersContainer = document.getElementById('team-management-container');
const fixturesContainer = document.getElementById('fixtures-content');

document.addEventListener('authReady', ({ detail }) => {
    const { user, userProfile } = detail;
    if (user) {
        setupTabs();
        initializePageData(userProfile);
    } else {
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
        homeFixturesSnapshot.forEach(doc => allFixtures.push(doc.data()));
        awayFixturesSnapshot.forEach(doc => allFixtures.push(doc.data()));

        const validFixtures = allFixtures.filter(fixture => fixture.scheduledDate && typeof fixture.scheduledDate.toMillis === 'function');
        
        validFixtures.sort((a, b) => a.scheduledDate.toMillis() - b.scheduledDate.toMillis());

        if (validFixtures.length === 0) {
            fixturesContainer.innerHTML = "<p>No fixtures found for the current season.</p>";
            return;
        }

        let lastRenderedDate = null;
        const fixturesHtml = validFixtures.map(fixture => {
            const dateObj = fixture.scheduledDate.toDate();
            
            // Format the date and time using the 'Europe/London' timezone
            const date = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' });
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

async function loadTeamPlayers(teamId) {
    if (!playersContainer) return;

    try {
        const playersQuery = query(collection(db, "players_public"), where("teamId", "==", teamId));
        const playersSnapshot = await getDocs(playersQuery);

        let playersHtml = playersSnapshot.docs
            .map(doc => {
                const p = doc.data();
                return `<li>${p.firstName} ${p.lastName} ${p.role ? `<strong>(${p.role})</strong>` : ''}</li>`;
            })
            .join('');

        playersContainer.innerHTML = `
            <h3>Team Roster</h3>
            <ul class="player-list">${playersHtml}</ul>
        `;
    } catch (error) {
        console.error("Error loading team players:", error);
        playersContainer.innerHTML = '<p>An error occurred while loading the player roster.</p>';
    }
}

async function initializePageData(userProfile) {
    if (!userProfile) {
        document.body.innerHTML = '<p>Your player profile could not be found.</p>';
        return;
    }

    const { role, teamId } = userProfile;

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
    
    // Load data for all tabs
    loadTeamPlayers(teamId);
    loadTeamFixtures(teamId);
}
