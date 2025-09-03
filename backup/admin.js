import { db, collection, doc, getDocs, updateDoc, query, where, orderBy, getDoc, auth, Timestamp } from './firebase.config.js';
import { authReady } from './auth-manager.js';

// --- Globals for Admin Page Data ---
const teamsMap = new Map();
let allFixtures = [];

// --- Authorization and Initialization ---

authReady.then(({ user, publicData }) => {
    if (user && publicData?.committee) {
        initializeAdminPage();
    } else {
        const tabContentContainer = document.getElementById('tab-content-container');
        if (tabContentContainer) {
            tabContentContainer.innerHTML = '<p>You do not have the necessary permissions to view this page.</p>';
        }
    }
});

async function initializeAdminPage() {
    await fetchTeams();
    await fetchScheduledFixtures();
    initializeTabs();
    initializeResultsInput();
    initializePostponeFixture();
}

// --- Data Fetching ---

async function fetchTeams() {
    try {
        const teamsSnapshot = await getDocs(collection(db, "teams"));
        teamsSnapshot.forEach(doc => teamsMap.set(doc.id, doc.data().name));
    } catch (error) {
        console.error("Error fetching teams:", error);
    }
}

async function fetchScheduledFixtures() {
    try {
        const fixturesQuery = query(collection(db, "match_results"), where("status", "==", "scheduled"), orderBy("scheduledDate"));
        const fixturesSnapshot = await getDocs(fixturesQuery);
        allFixtures = fixturesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching scheduled fixtures:", error);
    }
}


// --- Tab Management ---

function initializeTabs() {
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
}

// --- Postpone Fixture Tab ---

function initializePostponeFixture() {
    const form = document.getElementById('postpone-fixture-form');
    if (!form) return; 

    const fixtureSelect = document.getElementById('fixture-to-postpone-select');
    const teamSelect = document.getElementById('postponing-team-select');
    const dateInput = document.getElementById('postponement-date-input');
    const statusDiv = document.getElementById('postpone-fixture-status');

    fixtureSelect.addEventListener('change', () => {
        teamSelect.innerHTML = '<option value="">Which team postponed?</option>';
        teamSelect.disabled = true;
        const fixture = allFixtures.find(f => f.id === fixtureSelect.value);
        if (fixture) {
            const homeTeamName = teamsMap.get(fixture.homeTeamId) || 'Unknown';
            const awayTeamName = teamsMap.get(fixture.awayTeamId) || 'Unknown';
            teamSelect.innerHTML += `<option value="${fixture.homeTeamId}">${homeTeamName}</option>`;
            teamSelect.innerHTML += `<option value="${fixture.awayTeamId}">${awayTeamName}</option>`;
            teamSelect.disabled = false;
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { value: fixtureId } = fixtureSelect;
        const { value: postponedBy } = teamSelect;
        const { value: postponedDateStr } = dateInput;

        if (!fixtureId || !postponedBy || !postponedDateStr) {
            statusDiv.textContent = 'Please fill out all fields.';
            statusDiv.className = 'status-error';
            return;
        }
        
        try {
            await updateDoc(doc(db, "match_results", fixtureId), {
                status: 'postponed',
                postponedBy,
                postponedDate: Timestamp.fromDate(new Date(postponedDateStr))
            });
            statusDiv.textContent = 'Fixture successfully postponed!';
            statusDiv.className = 'status-success';
            form.reset();
            teamSelect.disabled = true;
            await fetchScheduledFixtures(); 
            populateFixturePostponeSelect(); 
        } catch (error) {
            console.error("Error postponing fixture:", error);
            statusDiv.textContent = 'An error occurred. Please try again.';
            statusDiv.className = 'status-error';
        }
    });
    
    populateFixturePostponeSelect();
}

function populateFixturePostponeSelect() {
    const fixtureSelect = document.getElementById('fixture-to-postpone-select');
    if(!fixtureSelect) return;

    fixtureSelect.innerHTML = '<option value="">Select a fixture to postpone</option>';
    allFixtures.forEach(fixture => {
        const homeTeamName = teamsMap.get(fixture.homeTeamId) || 'Unknown';
        const awayTeamName = teamsMap.get(fixture.awayTeamId) || 'Unknown';
        const date = fixture.scheduledDate.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const option = document.createElement('option');
        option.value = fixture.id;
        option.textContent = `${date} - ${homeTeamName} vs ${awayTeamName}`;
        fixtureSelect.appendChild(option);
    });
}

// --- Results Input Tab ---

function initializeResultsInput() {
    const dateSelect = document.getElementById('date-select');
    if(!dateSelect) return;

    const matchSelect = document.getElementById('match-select');
    const resultsFormContainer = document.getElementById('results-form-container');
    let allPlayers = new Map();

    const fetchPlayers = async () => {
        try {
            const playersSnapshot = await getDocs(collection(db, "players_public"));
            playersSnapshot.forEach(doc => allPlayers.set(doc.id, { id: doc.id, ...doc.data() }));
        } catch(error) {
            console.error("Error fetching players:", error);
        }
    };

    const populateDateSelect = () => {
        dateSelect.innerHTML = '<option value="">Select a date</option>';
        const uniqueDates = [...new Set(allFixtures.map(f => f.scheduledDate.toDate().toISOString().split('T')[0]))];
        uniqueDates.sort((a,b) => new Date(a) - new Date(b));
        uniqueDates.forEach(dateStr => {
            const option = document.createElement('option');
            option.value = dateStr;
            option.textContent = new Date(dateStr).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
            dateSelect.appendChild(option);
        });
    };

    dateSelect.addEventListener('change', () => {
        matchSelect.innerHTML = '<option value="">Select a match</option>';
        matchSelect.disabled = true;
        resultsFormContainer.style.display = 'none';
        const matchesOnDate = allFixtures.filter(f => f.scheduledDate.toDate().toISOString().split('T')[0] === dateSelect.value);
        matchesOnDate.forEach(fixture => {
            const homeTeamName = teamsMap.get(fixture.homeTeamId);
            const awayTeamName = teamsMap.get(fixture.awayTeamId);
            const time = fixture.scheduledDate.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            const option = document.createElement('option');
            option.value = fixture.id;
            option.textContent = `${homeTeamName} vs ${awayTeamName} (${time})`;
            matchSelect.appendChild(option);
        });
        matchSelect.disabled = false;
    });

    matchSelect.addEventListener('change', () => {
        resultsFormContainer.style.display = 'none';
        const fixture = allFixtures.find(f => f.id === matchSelect.value);
        if (fixture) {
            document.getElementById('home-team-name-header').textContent = teamsMap.get(fixture.homeTeamId);
            document.getElementById('away-team-name-header').textContent = teamsMap.get(fixture.awayTeamId);
            
            document.getElementById('home-bowled-first').value = fixture.homeTeamId;
            document.getElementById('away-bowled-first').value = fixture.awayTeamId;
            
            const homeScorecard = document.getElementById('home-team-scorecard');
            const awayScorecard = document.getElementById('away-team-scorecard');
            renderScorecard(fixture.homeTeamId, homeScorecard, allPlayers);
            renderScorecard(fixture.awayTeamId, awayScorecard, allPlayers);
            resultsFormContainer.style.display = 'block';
        }
    });

    document.getElementById('submit-results-btn').addEventListener('click', async () => {
        const fixtureId = matchSelect.value;
        const getScores = (containerId) => {
            return Array.from(document.querySelectorAll(`#${containerId} tbody tr`)).map(row => ({
                playerId: row.querySelector('.player-select').value,
                hands: Array.from(row.querySelectorAll('.hand-score')).map(input => parseInt(input.value) || 0),
                score: parseInt(row.querySelector('.total-score-col').textContent)
            })).filter(s => s.playerId && s.hands.length === 5);
        };

        const homeScores = getScores('home-team-scorecard');
        const awayScores = getScores('away-team-scorecard');
        const bowledFirst = document.querySelector('input[name="bowled-first"]:checked')?.value;

        const errors = [];
        if (homeScores.length < 6) errors.push("Home team has incomplete scores.");
        if (awayScores.length < 6) errors.push("Away team has incomplete scores.");
        if (!bowledFirst) errors.push("Please select which team bowled first.");

        if (errors.length > 0) {
            alert("Please correct the following issues:\n\n- " + errors.join("\n- "));
            return;
        }
        
        const resultsData = {
            homeScore: parseInt(document.getElementById('home-team-total-display').textContent),
            awayScore: parseInt(document.getElementById('away-team-total-display').textContent),
            homeScores,
            awayScores,
            bowledFirst,
            status: 'completed'
        };

        try {
            await updateDoc(doc(db, "match_results", fixtureId), resultsData);

            const fixture = allFixtures.find(f => f.id === fixtureId);
            if (fixture) {
                await updateLeagueTable(fixture, resultsData);
            }

            alert('Results submitted and league table updated successfully!');
            await fetchScheduledFixtures(); 
            populateDateSelect(); 
            populateFixturePostponeSelect(); 
            matchSelect.innerHTML = '<option value="">Select a match</option>';
            matchSelect.disabled = true;
            resultsFormContainer.style.display = 'none';
        } catch (error) {
            console.error("Error submitting results:", error);
            alert('An error occurred while submitting results.');
        }
    });

    (async () => {
        await fetchPlayers();
        populateDateSelect();
    })();
}

// --- Update League Table with Max Score logic ---
async function updateLeagueTable(fixture, resultsData) {
    const { homeTeamId, awayTeamId, division, season } = fixture;
    const { homeScore, awayScore } = resultsData;

    let homeOutcome, awayOutcome;
    if (homeScore > awayScore) {
        homeOutcome = { result: 'won', points: 2 };
        awayOutcome = { result: 'lost', points: 0 };
    } else if (awayScore > homeScore) {
        homeOutcome = { result: 'lost', points: 0 };
        awayOutcome = { result: 'won', points: 2 };
    } else {
        homeOutcome = { result: 'drawn', points: 1 };
        awayOutcome = { result: 'drawn', points: 1 };
    }

    const leagueTableRef = doc(db, 'league_tables', season);
    const leagueTableSnap = await getDoc(leagueTableRef);

    if (!leagueTableSnap.exists()) {
        console.error(`League table for season ${season} not found.`);
        return;
    }

    const leagueTableData = leagueTableSnap.data();
    
    if (!leagueTableData[division]) {
        leagueTableData[division] = {
            leagueName: division.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            standings: []
        };
    }
    const standings = leagueTableData[division].standings || [];

    const updateStatsForTeam = (teamId, outcome, pinsFor, pinsAgainst) => {
        let teamIndex = standings.findIndex(t => t.teamId === teamId);
        
        if (teamIndex === -1) {
            standings.push({ teamId, teamName: teamsMap.get(teamId) });
            teamIndex = standings.length - 1;
        }
        
        const teamStats = standings[teamIndex];

        teamStats.played = (teamStats.played ?? 0) + 1;
        teamStats.won = (teamStats.won ?? 0) + (outcome.result === 'won' ? 1 : 0);
        teamStats.lost = (teamStats.lost ?? 0) + (outcome.result === 'lost' ? 1 : 0);
        teamStats.drawn = (teamStats.drawn ?? 0) + (outcome.result === 'drawn' ? 1 : 0);
        teamStats.points = (teamStats.points ?? 0) + outcome.points;
        teamStats.pinsFor = (teamStats.pinsFor ?? 0) + pinsFor;
        teamStats.pinsAgainst = (teamStats.pinsAgainst ?? 0) + pinsAgainst;

        // --- THIS IS THE FIX ---
        // Add or update the max_score field
        if (!teamStats.max_score || pinsFor > teamStats.max_score) {
            teamStats.max_score = pinsFor;
        }
        // --------------------

        standings[teamIndex] = teamStats;
    };

    updateStatsForTeam(homeTeamId, homeOutcome, homeScore, awayScore);
    updateStatsForTeam(awayTeamId, awayOutcome, awayScore, homeScore);

    const updatePayload = {
        [`${division}.standings`]: standings
    };
    await updateDoc(leagueTableRef, updatePayload);
}

function renderScorecard(teamId, container, allPlayers) {
    if(!container) return;
    const teamPlayers = Array.from(allPlayers.values()).filter(p => p.teamId === teamId);
    container.innerHTML = `
        <thead>
            <tr>
                <th class="player-name-col">Player</th>
                <th>H1</th><th>H2</th><th>H3</th><th>H4</th><th>H5</th>
                <th class="total-score-col">Total</th>
            </tr>
        </thead>
        <tbody>
            ${Array(6).fill().map(() => `
                <tr>
                    <td class="player-name-col">
                        <select class="player-select">
                            <option value="">Select player</option>
                            ${teamPlayers.map(p => `<option value="${p.id}">${p.firstName} ${p.lastName}</option>`).join('')}
                        </select>
                    </td>
                    ${Array(5).fill().map(() => `<td class="hand-score-col"><input type="number" class="hand-score" min="0" max="27"></td>`).join('')}
                    <td class="total-score-col">0</td>
                </tr>
            `).join('')}
        </tbody>`;

    container.addEventListener('input', (e) => {
        if (e.target.classList.contains('hand-score') || e.target.classList.contains('player-select')) {
            const row = e.target.closest('tr');
            if(row) {
                const handScores = Array.from(row.querySelectorAll('.hand-score')).map(input => parseInt(input.value) || 0);
                row.querySelector('.total-score-col').textContent = handScores.reduce((a, b) => a + b, 0);
                const totalDisplay = container.id.includes('home') ? document.getElementById('home-team-total-display') : document.getElementById('away-team-total-display');
                if(totalDisplay) {
                    updateTeamTotal(container, totalDisplay);
                }
            }
        }
    });
}

function updateTeamTotal(table, totalDisplay) {
    if(!table || !totalDisplay) return;
    const playerTotals = Array.from(table.querySelectorAll('tbody .total-score-col')).map(td => parseInt(td.textContent) || 0);
    totalDisplay.textContent = playerTotals.reduce((a, b) => a + b, 0);
}
