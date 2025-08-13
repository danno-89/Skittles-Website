import { firebaseConfig } from './firebase.config.js';

// Initialize Firebase using compat libs
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const competitionCache = new Map();
let allFixtures = [];

// --- Helper Functions ---

function getWeekStartDate(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

// --- Firestore & Data Functions ---

async function populateCompetitionCache() {
    try {
        const snapshot = await db.collection("competitions").get();
        snapshot.forEach(doc => {
            competitionCache.set(doc.id, doc.data());
        });
    } catch (error) {
        console.error("Error populating competition cache:", error);
    }
}

async function getTeamName(teamId) {
    if (!teamId) return "N/A";
    try {
        const teamDoc = await db.collection("teams").doc(teamId).get();
        return teamDoc.exists ? teamDoc.data().name : "Unknown Team";
    } catch (error) {
        console.error(`Error getting team name for ID ${teamId}:`, error);
        return "Error";
    }
}

async function fetchAllFixtures() {
    try {
        // Sort by ascending date to show oldest first
        const snapshot = await db.collection("match_results").orderBy("scheduledDate", "asc").get();
        allFixtures = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching all fixtures:", error);
        allFixtures = [];
    }
}

// --- Main Display Logic ---

async function displayMatchResults() {
    const resultsContainer = document.getElementById('results-container');
    const teamFilter = document.getElementById('team-filter').value;
    const competitionFilter = document.getElementById('competition-filter').value;
    const seasonFilter = document.getElementById('season-filter').value;
    const excludePostponed = document.getElementById('exclude-postponed-filter').checked;
    const onlyPostponed = document.getElementById('only-postponed-filter').checked;

    if (!resultsContainer) return;
    resultsContainer.innerHTML = '<p>Loading fixtures...</p>';

    const filteredFixtures = allFixtures.filter(match => {
        const teamMatch = !teamFilter || match.homeTeamId === teamFilter || match.awayTeamId === teamFilter;
        const competitionMatch = !competitionFilter || match.division === competitionFilter;
        const seasonMatch = !seasonFilter || match.season === seasonFilter;
        const statusMatch = (!excludePostponed || match.status !== 'postponed') && (!onlyPostponed || match.status === 'postponed');
        return teamMatch && competitionMatch && seasonMatch && statusMatch;
    });

    if (filteredFixtures.length === 0) {
        resultsContainer.innerHTML = '<p>No fixtures found matching your criteria.</p>';
        return;
    }
    
    const groupedFixtures = filteredFixtures.reduce((groups, match) => {
        const matchDate = new Date(match.scheduledDate);
        const weekStartDate = getWeekStartDate(matchDate);
        const weekKey = weekStartDate.toISOString().split('T')[0];

        if (!groups[weekKey]) {
            groups[weekKey] = {
                startDate: weekStartDate,
                matches: []
            };
        }
        groups[weekKey].matches.push(match);
        return groups;
    }, {});

    let tableBodyHTML = '';
    let isFirstWeek = true;
    for (const weekKey in groupedFixtures) {
        const group = groupedFixtures[weekKey];
        const weekStartDateFormatted = group.startDate.toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
        
        tableBodyHTML += `
            <tr class="week-header" data-week-key="${weekKey}">
                <td colspan="7">
                    <span class="arrow">${isFirstWeek ? '▼' : '►'}</span> Week Commencing: ${weekStartDateFormatted}
                </td>
            </tr>
        `;

        const matchRowPromises = group.matches.map(async (match) => {
            const [homeTeamName, awayTeamName] = await Promise.all([
                getTeamName(match.homeTeamId),
                getTeamName(match.awayTeamId)
            ]);

            const hasResult = match.homeScore !== null && match.awayScore !== null;
            const score = hasResult ? `${match.homeScore} - ${match.awayScore}` : 'vs';
            const dateObj = new Date(match.scheduledDate);
            const date = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
            const time = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            const competition = competitionCache.get(match.division);
            const divisionName = competition ? competition.name : 'N/A';
            const status = match.status || 'scheduled';
            
            const statusCell = hasResult
                ? `<a href="match_details.html?matchId=${match.id}" class="btn-details">Details</a>`
                : `<span class="status-${status}">${status}</span>`;

            return `
                <tr class="week-row week-${weekKey}" ${isFirstWeek ? '' : 'style="display: none;"'}>
                    <td>${date}</td>
                    <td>${time}</td>
                    <td>${divisionName}</td>
                    <td>${homeTeamName}</td>
                    <td>${awayTeamName}</td>
                    <td class="score">${score}</td>
                    <td class="status-cell">${statusCell}</td>
                </tr>
            `;
        });
        
        const resolvedRows = await Promise.all(matchRowPromises);
        tableBodyHTML += resolvedRows.join('');
        isFirstWeek = false;
    }

    resultsContainer.innerHTML = `
        <table class="results-table">
            <thead class="sticky-header">
                <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Division</th>
                    <th>Home Team</th>
                    <th>Away Team</th>
                    <th>Score</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>${tableBodyHTML}</tbody>
        </table>
    `;
}

// --- Filter Population ---

async function populateTeamFilter() {
    const teamFilterSelect = document.getElementById('team-filter');
    if (!teamFilterSelect) return;
    try {
        const snapshot = await db.collection("teams").orderBy("name").get();
        snapshot.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data().name;
            teamFilterSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error populating team filter:", error);
    }
}

async function populateCompetitionFilter() {
    const competitionFilterSelect = document.getElementById('competition-filter');
    if (!competitionFilterSelect) return;
    competitionCache.forEach((competition, id) => {
        if (competition.fixtures === true) {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = competition.name;
            competitionFilterSelect.appendChild(option);
        }
    });
}

async function populateSeasonFilter() {
    const seasonFilterSelect = document.getElementById('season-filter');
    if (!seasonFilterSelect) return;

    const uniqueSeasons = [...new Set(allFixtures.map(fixture => fixture.season).filter(Boolean))];
    
    uniqueSeasons.sort((a, b) => b.localeCompare(a));

    seasonFilterSelect.innerHTML = '';

    uniqueSeasons.forEach(season => {
        const option = document.createElement('option');
        option.value = season;
        option.textContent = season;
        if (season === '2024-25') {
            option.selected = true;
        }
        seasonFilterSelect.appendChild(option);
    });
}

// --- Event Listeners & Initialization ---

function setupEventListeners() {
    document.getElementById('season-filter')?.addEventListener('change', displayMatchResults);
    document.getElementById('team-filter')?.addEventListener('change', displayMatchResults);
    document.getElementById('competition-filter')?.addEventListener('change', displayMatchResults);
    
    const excludePostponed = document.getElementById('exclude-postponed-filter');
    const onlyPostponed = document.getElementById('only-postponed-filter');

    excludePostponed?.addEventListener('change', () => {
        if (excludePostponed.checked) onlyPostponed.checked = false;
        displayMatchResults();
    });

    onlyPostponed?.addEventListener('change', () => {
        if (onlyPostponed.checked) excludePostponed.checked = false;
        displayMatchResults();
    });
    
    document.getElementById('results-container').addEventListener('click', function(event) {
        const headerRow = event.target.closest('.week-header');
        if (headerRow) {
            const weekKey = headerRow.dataset.weekKey;
            const rows = document.querySelectorAll(`.week-row.week-${weekKey}`);
            const arrow = headerRow.querySelector('.arrow');
            
            let isVisible = false;
            rows.forEach(row => {
                const currentDisplay = window.getComputedStyle(row).display;
                if (currentDisplay !== 'none') {
                    isVisible = true;
                }
                row.style.display = currentDisplay === 'none' ? '' : 'none';
            });

            if (arrow) {
                arrow.textContent = isVisible ? '►' : '▼';
            }
        }
    });
}

async function initializePage() {
    await populateCompetitionCache();
    await populateTeamFilter();
    await populateCompetitionFilter();
    await fetchAllFixtures();
    await populateSeasonFilter();
    await displayMatchResults();
    setupEventListeners();
}

initializePage();
