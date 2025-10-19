
/**
 * Admin Page Management Script
 * 
 * This script handles all functionality on the admin page, including:
 * - Authorisation checks to ensure only committee members can access it.
 * - Tabbed navigation for different admin functions.
 * - Data fetching for teams, fixtures, and players.
 * - UI initialisation for all admin tabs (Results Input, Edit Fixture, etc.).
 * 
 * The entire script is wrapped in a DOMContentLoaded listener to ensure
 * the HTML is fully loaded before any code attempts to interact with the DOM.
 */

import { db, collection, doc, getDocs, updateDoc, query, where, orderBy, getDoc, Timestamp, runTransaction } from './firebase.config.js';
import { authReady } from './auth-manager.js';
import { initAdminEditFixture } from './admin-edit-fixture.js';
import { initRescheduleFixture } from './admin-reschedule.js';
import { initNewsManagement } from './news-management.js';
import { initCorrectionTool } from './admin-correction.js';

// --- Globals for Admin Page Data ---
const teamsMap = new Map();
let allFixtures = [];
let allPlayersData = new Map();
let teamAverages = {};

// --- Main Initialisation on DOM Ready ---
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase Auth to be ready
    authReady.then(({ user, publicData }) => {
        const adminContent = document.getElementById('tab-content-container');
        if (!adminContent) {
            console.error("Admin page content container not found.");
            return;
        }

        // Check if user is a committee member
        if (user && publicData?.committee) {
            initializeAdminPage();
        } else {
            // If not authorised, display a message and do nothing else
            adminContent.innerHTML = '<p>You do not have the necessary permissions to view this page.</p>';
        }
    });
});

/**
 * Kicks off the setup for the entire admin page after authorisation is confirmed.
 * Fetches all necessary data and then initialises each UI component.
 */
async function initializeAdminPage() {
    try {
        // Fetch core data first
        await fetchTeams();
        await fetchScheduledFixtures();
        await fetchAllPlayersData();

        // Then, initialise all the interactive tabs and forms
        initializeTabs();
        initializeResultsInput();
        initializePostponeFixture();
        initializeAmendPlayerTab();
        
        // Initialise modules for specific tabs
        initAdminEditFixture();
        initRescheduleFixture(teamsMap);
        initNewsManagement();
        initCorrectionTool();

    } catch (error) {
        console.error("An error occurred during admin page initialisation:", error);
        const adminContent = document.getElementById('tab-content-container');
        if (adminContent) {
            adminContent.innerHTML = '<p>A critical error occurred while loading the admin page. Please try again later.</p>';
        }
    }
}


// --- Data Fetching Functions ---

async function fetchTeams() {
    const teamsSnapshot = await getDocs(collection(db, "teams"));
    teamsSnapshot.forEach(doc => teamsMap.set(doc.id, doc.data().name));
}

async function fetchScheduledFixtures() {
    const fixturesQuery = query(collection(db, "match_results"), where("status", "in", ["scheduled", "rescheduled"]), orderBy("scheduledDate"));
    const fixturesSnapshot = await getDocs(fixturesQuery);
    allFixtures = fixturesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function fetchAllPlayersData() {
    const publicPlayersSnapshot = await getDocs(collection(db, "players_public"));
    publicPlayersSnapshot.forEach(doc => allPlayersData.set(doc.id, { id: doc.id, public: doc.data() }));

    const privatePlayersSnapshot = await getDocs(collection(db, "players_private"));
    privatePlayersSnapshot.forEach(doc => {
        if (allPlayersData.has(doc.id)) {
            allPlayersData.get(doc.id).private = doc.data();
        } else {
            allPlayersData.set(doc.id, { id: doc.id, private: doc.data() });
        }
    });
}

/**
 * Fetches team averages for handicap calculation from the ssc_cup collection.
 * @param {string} season - The season to fetch averages for.
 */
async function fetchTeamAverages(season) {
    try {
        const docRef = doc(db, 'ssc_cup', season);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            teamAverages = docSnap.data().teamAverages || {};
        } else {
            console.warn(`No ssc_cup data found for season: ${season}`);
            teamAverages = {};
        }
    } catch (error) {
        console.error("Error fetching team averages:", error);
        teamAverages = {};
    }
}

/**
 * Fetches the name of a competition from Firestore and displays it.
 * @param {string} competitionId - The ID of the competition document.
 * @param {string} elementId - The ID of the HTML element to display the name in.
 */
async function fetchAndDisplayCompetitionName(competitionId, elementId) {
    const competitionNameElem = document.getElementById(elementId);
    if (!competitionNameElem) return;

    if (!competitionId) {
        competitionNameElem.textContent = '';
        return;
    }

    try {
        const competitionRef = doc(db, "competitions", competitionId);
        const competitionSnap = await getDoc(competitionRef);

        if (competitionSnap.exists()) {
            competitionNameElem.textContent = competitionSnap.data().name;
        } else {
            competitionNameElem.textContent = "Competition details not found.";
        }
    } catch (error) {
        console.error("Error fetching competition name:", error);
        competitionNameElem.textContent = "Error loading competition name.";
    }
}


// --- Tab Management ---

/**
 * Sets up the tabbed navigation.
 */
function initializeTabs() {
    const tabsContainer = document.getElementById('admin-tabs-container');
    const tabContentContainer = document.getElementById('tab-content-container');

    if (!tabsContainer || !tabContentContainer) {
        console.error("Tab containers not found. Tab functionality will be disabled.");
        return;
    }

    const tabs = tabsContainer.querySelectorAll('.tab-link');
    const tabPanes = tabContentContainer.querySelectorAll('.tab-pane');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabPanes.forEach(pane => {
                pane.classList.toggle('active', pane.id === `${tabName}-content`);
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

    if (!fixtureSelect || !teamSelect || !dateInput || !statusDiv) return;

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
    const matchSelect = document.getElementById('match-select');
    const resultsFormContainer = document.getElementById('results-form-container');
    const submitBtn = document.getElementById('submit-results-btn');

    if (!dateSelect || !matchSelect || !resultsFormContainer || !submitBtn) {
        console.error("One or more elements for results input are missing.");
        return;
    }

    let allPlayers = new Map();

    const fetchPlayers = async () => {
        const playersSnapshot = await getDocs(collection(db, "players_public"));
        playersSnapshot.forEach(doc => {
            const data = doc.data();
            allPlayers.set(doc.id, { id: doc.id, name: `${data.firstName} ${data.lastName}`, teamId: data.teamId });
        });
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
        resultsFormContainer.style.display = 'none';
        fetchAndDisplayCompetitionName(null, 'competition-name');
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
        matchSelect.disabled = !matchesOnDate.length;
    });

    matchSelect.addEventListener('change', async () => {
        resultsFormContainer.style.display = 'none';
        const fixture = allFixtures.find(f => f.id === matchSelect.value);
        if (fixture) {
            await fetchAndDisplayCompetitionName(fixture.division, 'competition-name');

            if (fixture.division === 'ssc-cup') {
                await fetchTeamAverages(fixture.season);
            }

            document.getElementById('home-team-name-header').textContent = teamsMap.get(fixture.homeTeamId);
            document.getElementById('away-team-name-header').textContent = teamsMap.get(fixture.awayTeamId);
            document.getElementById('home-bowled-first').value = fixture.homeTeamId;
            document.getElementById('away-bowled-first').value = fixture.awayTeamId;
            
            renderScorecard('home', fixture, allPlayers);
            renderScorecard('away', fixture, allPlayers);
            resultsFormContainer.style.display = 'block';
        } else {
            fetchAndDisplayCompetitionName(null, 'competition-name');
        }
    });

    submitBtn.addEventListener('click', async () => {
        const fixtureId = matchSelect.value;
        const getScores = (containerId) => {
            return Array.from(document.querySelectorAll(`#${containerId} tbody tr`)).map(row => {
                if (row.id.endsWith('-handicap-row')) return null;
                const playerId = row.querySelector('.player-select').value;
                const hands = Array.from(row.querySelectorAll('.hand-score')).map(input => parseInt(input.value) || 0);
                const score = hands.reduce((a, b) => a + b, 0);
                return { playerId, hands, score };
            }).filter(s => s && s.playerId && s.hands.length === 5);
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
            const fixture = allFixtures.find(f => f.id === fixtureId);
            
            await runTransaction(db, async (transaction) => {
                // Phase 1: READS
                let leagueRef, leagueSnap, cupRef, cupSnap;
                if (['premier-division', 'first-division'].includes(fixture.division)) {
                    leagueRef = doc(db, "league_tables", `${fixture.season}_${fixture.division}`);
                    leagueSnap = await transaction.get(leagueRef);
                } else if (fixture.division === 'ssc-cup') {
                    cupRef = doc(db, "ssc_cup", fixture.season);
                    cupSnap = await transaction.get(cupRef);
                }

                // Phase 2: LOGIC/CALCULATIONS
                const fixtureRef = doc(db, "match_results", fixtureId);
                const playersInMatch = new Set([...homeScores.map(s => s.playerId), ...awayScores.map(s => s.playerId)]);
                playersInMatch.delete("sixthPlayer");
                const matchDate = fixture.scheduledDate.toDate();
                const recentFixtureTimestamp = Timestamp.fromDate(matchDate);
                const expiryDate = new Date(matchDate);
                expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                const registerExpiryTimestamp = Timestamp.fromDate(expiryDate);

                let updatedLeagueData, updatedCupData;
                if (leagueRef && leagueSnap.exists()) {
                    updatedLeagueData = updateLeagueTable(fixture, resultsData, leagueSnap.data());
                }
                if (cupRef && cupSnap.exists()) {
                    updatedCupData = updateSscCupStandings(fixture, resultsData, cupSnap.data());
                }

                // Phase 3: WRITES
                transaction.update(fixtureRef, resultsData);

                if (updatedLeagueData) {
                    transaction.update(leagueRef, { teams: updatedLeagueData });
                }
                if (updatedCupData) {
                    transaction.update(cupRef, updatedCupData);
                }

                for (const playerId of playersInMatch) {
                    const playerRef = doc(db, "players_public", playerId);
                    transaction.update(playerRef, {
                        recentFixture: recentFixtureTimestamp,
                        registerExpiry: registerExpiryTimestamp,
                    });
                }
            });

            alert('Results submitted successfully!');
            await fetchScheduledFixtures(); 
            populateDateSelect(); 
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

function renderScorecard(teamType, fixture, allPlayers) {
    const container = document.getElementById(`${teamType}-team-scorecard`);
    const teamId = fixture[`${teamType}TeamId`];
    const teamPlayers = Array.from(allPlayers.values()).filter(p => p.teamId === teamId);

    const updateSelectOptions = (selectElement) => {
        const selectedPlayers = Array.from(container.querySelectorAll('.player-select')).map(s => s.value);
        const currentValue = selectElement.value;

        selectElement.innerHTML = '<option value="">Select player</option><option value="sixthPlayer">6th Player</option>';
        teamPlayers.forEach(p => {
            if (!selectedPlayers.includes(p.id) || p.id === currentValue) {
                const option = document.createElement('option');
                option.value = p.id;
                option.textContent = p.name;
                selectElement.appendChild(option);
            }
        });
        selectElement.value = currentValue;
    };

    let handicapRow = '';
    let handicapValue = 0;
    if (fixture.division === 'ssc-cup') {
        const homeAvg = teamAverages[fixture.homeTeamId] || 0;
        const awayAvg = teamAverages[fixture.awayTeamId] || 0;
        const handicap = Math.round(Math.abs(homeAvg - awayAvg) * 0.95);
        
        if ((teamType === 'home' && homeAvg < awayAvg) || (teamType === 'away' && awayAvg < homeAvg)) {
            handicapValue = handicap;
        }

        if (handicapValue > 0) {
            handicapRow = `
                <tr id="${teamType}-handicap-row">
                    <td class="player-name-col"><strong>Handicap</strong></td>
                    <td colspan="5"></td>
                    <td class="total-score-col">${handicapValue}</td>
                </tr>
            `;
        }
    }

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
                    <td class="player-name-col"><select class="form-select player-select"></select></td>
                    ${Array(5).fill().map(() => `<td class="hand-score-col"><input type="number" class="hand-score" min="0" max="27"></td>`).join('')}
                    <td class="total-score-col">0</td>
                </tr>
            `).join('')}
            ${handicapRow}
        </tbody>`;
    
    const playerSelects = container.querySelectorAll('.player-select');
    playerSelects.forEach(updateSelectOptions);

    container.addEventListener('change', (e) => {
        if (e.target.classList.contains('player-select')) {
            playerSelects.forEach(sel => {
                if (sel !== e.target) updateSelectOptions(sel);
            });
        }
    });

    container.addEventListener('input', (e) => {
        if (e.target.classList.contains('hand-score')) {
            const row = e.target.closest('tr');
            const handScores = Array.from(row.querySelectorAll('.hand-score')).map(input => parseInt(input.value) || 0);
            row.querySelector('.total-score-col').textContent = handScores.reduce((a, b) => a + b, 0);
            updateTeamTotal(container, handicapValue);
        }
    });

    updateTeamTotal(container, handicapValue);
}

function updateTeamTotal(container, handicap = 0) {
    const playerTotals = Array.from(container.querySelectorAll('tbody tr:not([id*="-handicap-row"]) .total-score-col')).map(td => parseInt(td.textContent) || 0);
    const teamTotal = playerTotals.reduce((a, b) => a + b, 0) + handicap;
    const totalDisplay = container.id.includes('home') ? document.getElementById('home-team-total-display') : document.getElementById('away-team-total-display');
    totalDisplay.textContent = teamTotal;
}

// --- League Table and Cup Standings Updates ---

function updateLeagueTable(fixture, results, leagueData) {
    const { homeTeamId, awayTeamId } = fixture;
    const { homeScore, awayScore, bowledFirst } = results;

    const homeTeam = leagueData.teams.find(t => t.id === homeTeamId);
    const awayTeam = leagueData.teams.find(t => t.id === awayTeamId);

    // Determine winner and points
    let homePoints = 0, awayPoints = 0;
    if (homeScore > awayScore) {
        homePoints = 2; // Win
    } else if (awayScore > homeScore) {
        awayPoints = 2; // Win
    } else {
        homePoints = 1; // Draw
        awayPoints = 1;
    }
    
    // Bonus point for bowled first
    if (bowledFirst === homeTeamId && homeScore < awayScore) {
        homePoints++;
    } else if (bowledFirst === awayTeamId && awayScore < homeScore) {
        awayPoints++;
    }

    // Update team stats
    const updateTeamStats = (team, points, scoreFor, scoreAgainst) => {
        team.played = (team.played || 0) + 1;
        team.won = (team.won || 0) + (points >= 2 ? 1 : 0);
        team.drawn = (team.drawn || 0) + (points === 1 ? 1 : 0);
        team.lost = (team.lost || 0) + (points < 1 ? 1 : 0);
        team.points = (team.points || 0) + points;
        team.pinsFor = (team.pinsFor || 0) + scoreFor;
        team.pinsAgainst = (team.pinsAgainst || 0) + scoreAgainst;
    };

    if (homeTeam) updateTeamStats(homeTeam, homePoints, homeScore, awayScore);
    if (awayTeam) updateTeamStats(awayTeam, awayPoints, awayScore, homeScore);
    
    return leagueData.teams;
}


function updateSscCupStandings(fixture, results, cupData) {
    const { homeTeamId, awayTeamId, round } = fixture;
    const { homeScore, awayScore } = results;
    
    const groupName = round.replace('Group Stage - ', 'Group_');
    const groupData = cupData[groupName];

    const homeTeam = groupData.standings.find(t => t.teamName === homeTeamId);
    const awayTeam = groupData.standings.find(t => t.teamName === awayTeamId);

    // Determine winner and points
    let homePoints = 0, awayPoints = 0;
    if (homeScore > awayScore) {
        homePoints = 2;
    } else if (awayScore > homeScore) {
        awayPoints = 2;
    } else {
        homePoints = 1;
        awayPoints = 1;
    }

    const updateTeamStandings = (team, points) => {
        team.played = (team.played || 0) + 1;
        team.won = (team.won || 0) + (points === 2 ? 1 : 0);
        team.drawn = (team.drawn || 0) + (points === 1 ? 1 : 0);
        team.lost = (team.lost || 0) + (points === 0 ? 1 : 0);
        team.points = (team.points || 0) + points;
    };

    if (homeTeam) updateTeamStandings(homeTeam, homePoints);
    if (awayTeam) updateTeamStandings(awayTeam, awayPoints);

    cupData[groupName] = groupData;
    return cupData;
}


// --- Amend Player Tab ---

function initializeAmendPlayerTab() {
    // Placeholder for amend player tab logic
}
