
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

import { db, collection, doc, getDocs, updateDoc, query, where, orderBy, getDoc, Timestamp } from './firebase.config.js';
import { authReady } from './auth-manager.js';
import { initAdminEditFixture } from './admin-edit-fixture.js';
import { initRescheduleFixture } from './admin-reschedule.js';
import { initNewsManagement } from './news-management.js';

// --- Globals for Admin Page Data ---
const teamsMap = new Map();
let allFixtures = [];
let allPlayersData = new Map();

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


// --- Tab Management ---

/**
 * Sets up the tabbed navigation.
 */
function initializeTabs() {
    const tabsContainer = document.getElementById('admin-tabs-container');
    const tabContentContainer = document.getElementById('tab-content-container');
    const tabsToggleBtn = document.getElementById('tabs-toggle-btn');

    if (!tabsContainer || !tabContentContainer || !tabsToggleBtn) {
        console.error("Tab containers or toggle button not found. Tab functionality will be disabled.");
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
            if (window.innerWidth <= 768) {
                tabsContainer.classList.remove('visible');
            }
        });
    });

    tabsToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        tabsContainer.classList.toggle('visible');
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

    matchSelect.addEventListener('change', () => {
        resultsFormContainer.style.display = 'none';
        const fixture = allFixtures.find(f => f.id === matchSelect.value);
        if (fixture) {
            document.getElementById('home-team-name-header').textContent = teamsMap.get(fixture.homeTeamId);
            document.getElementById('away-team-name-header').textContent = teamsMap.get(fixture.awayTeamId);
            document.getElementById('home-bowled-first').value = fixture.homeTeamId;
            document.getElementById('away-bowled-first').value = fixture.awayTeamId;
            
            renderScorecard(fixture.homeTeamId, document.getElementById('home-team-scorecard'), allPlayers);
            renderScorecard(fixture.awayTeamId, document.getElementById('away-team-scorecard'), allPlayers);
            resultsFormContainer.style.display = 'block';
        }
    });

    submitBtn.addEventListener('click', async () => {
        const fixtureId = matchSelect.value;
        const getScores = (containerId) => {
            return Array.from(document.querySelectorAll(`#${containerId} tbody tr`)).map(row => {
                const playerId = row.querySelector('.player-select').value;
                const hands = Array.from(row.querySelectorAll('.hand-score')).map(input => parseInt(input.value) || 0);
                const score = hands.reduce((a, b) => a + b, 0);
                return { playerId, hands, score };
            }).filter(s => s.playerId && s.hands.length === 5);
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
                // Future implementation: await updateLeagueTable(fixture, resultsData);

                const playersInMatch = new Set([...homeScores.map(s => s.playerId), ...awayScores.map(s => s.playerId)]);
                playersInMatch.delete("sixthPlayer"); 

                const matchDate = fixture.scheduledDate.toDate();
                const recentFixtureTimestamp = Timestamp.fromDate(matchDate);
                const expiryDate = new Date(matchDate);
                expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                const registerExpiryTimestamp = Timestamp.fromDate(expiryDate);

                for (const playerId of playersInMatch) {
                    await updateDoc(doc(db, "players_public", playerId), {
                        recentFixture: recentFixtureTimestamp,
                        registerExpiry: registerExpiryTimestamp
                    });
                }
            }

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

function renderScorecard(teamId, container, allPlayers) {
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
                    <td class="player-name-col"><select class="player-select"></select></td>
                    ${Array(5).fill().map(() => `<td class="hand-score-col"><input type="number" class="hand-score" min="0" max="27"></td>`).join('')}
                    <td class="total-score-col">0</td>
                </tr>
            `).join('')}
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
            updateTeamTotal(container);
        }
    });
}

function updateTeamTotal(container) {
    const playerTotals = Array.from(container.querySelectorAll('tbody .total-score-col')).map(td => parseInt(td.textContent) || 0);
    const teamTotal = playerTotals.reduce((a, b) => a + b, 0);
    const totalDisplay = container.id.includes('home') ? document.getElementById('home-team-total-display') : document.getElementById('away-team-total-display');
    totalDisplay.textContent = teamTotal;
}

// --- Amend Player Tab ---

function initializeAmendPlayerTab() {
    // Placeholder for amend player tab logic
}
