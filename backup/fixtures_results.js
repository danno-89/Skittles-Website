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
        const awayTeamId = match.awayTeamId || match.awayTeamis;
        const teamMatch = !teamFilter || match.homeTeamId === teamFilter || awayTeamId === teamFilter;
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
    const sortedWeekKeys = Object.keys(groupedFixtures).sort();

    for (const weekKey of sortedWeekKeys) {
        const group = groupedFixtures[weekKey];
        group.matches.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

        const weekStartDateFormatted = group.startDate.toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
        
        tableBodyHTML += `
            <tr class="week-header" data-week-key="${weekKey}">
                <td colspan="7">
                    <span class="arrow">▼</span> Week Commencing: ${weekStartDateFormatted}
                </td>
            </tr>
        `;

        let lastRenderedDate = null;
        let weekRowsHTML = '';

        for (const match of group.matches) {
            const awayTeamId = match.awayTeamId || match.awayTeamis;
            const [homeTeamName, awayTeamName] = await Promise.all([
                getTeamName(match.homeTeamId),
                getTeamName(awayTeamId)
            ]);

            const hasResult = match.homeScore != null && match.awayScore != null;
            const score = hasResult ? `${match.homeScore} - ${match.awayScore}` : '-';
            const dateObj = new Date(match.scheduledDate);

            // Manual date formatting for consistency (d mmm yy)
            const day = dateObj.getUTCDate();
            const monthIndex = dateObj.getUTCMonth();
            const year = dateObj.getUTCFullYear().toString().slice(-2);
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const date = `${day} ${months[monthIndex]} ${year}`;
            
            const time = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });

            const competition = competitionCache.get(match.division);
            const divisionName = competition ? competition.name : 'N/A';
            
            let statusCell = '';
            if (hasResult) {
                statusCell = `<a href="match_details.html?matchId=${match.id}" class="btn-details">Details</a>`;
            } else if (match.status === 'postponed') {
                statusCell = `<span class="status-postponed">postponed</span>`;
            }

            const dateCell = (date === lastRenderedDate) ? '' : date;
            if (date !== lastRenderedDate) {
                lastRenderedDate = date;
            }

            weekRowsHTML += `
                <tr class="week-row week-${weekKey}">
                    <td>${dateCell}</td>
                    <td>${time}</td>
                    <td>${homeTeamName}</td>
                    <td>${awayTeamName}</td>
                    <td class="score">${score}</td>
                    <td class="status-cell">${statusCell}</td>
                    <td>${divisionName}</td>
                </tr>
            `;
        }
        
        tableBodyHTML += weekRowsHTML;
    }

    resultsContainer.innerHTML = `
        <table class="results-table">
            <thead class="sticky-header">
                <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Home Team</th>
                    <th>Away Team</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Competition</th>
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

    let currentSeason = null;
    try {
        // Query the 'seasons' collection to find the document with status 'current'
        const seasonsSnapshot = await db.collection("seasons").where("status", "==", "current").limit(1).get();
        if (!seasonsSnapshot.empty) {
            // The document ID is expected to be the season name (e.g., "2024-25")
            currentSeason = seasonsSnapshot.docs[0].id;
        }
    } catch (error) {
        console.error("Error fetching current season:", error);
        // We can continue without a current season and fallback to the most recent one.
    }

    const uniqueSeasons = [...new Set(allFixtures.map(fixture => fixture.season).filter(Boolean))];
    
    uniqueSeasons.sort((a, b) => b.localeCompare(a)); // Sort descending to have the most recent season first

    seasonFilterSelect.innerHTML = ''; // Clear existing options before populating

    // If no 'current' season was found in the collection, use the most recent season from the fixtures as a fallback.
    if (!currentSeason && uniqueSeasons.length > 0) {
        currentSeason = uniqueSeasons[0]; 
    }

    uniqueSeasons.forEach(season => {
        const option = document.createElement('option');
        option.value = season;
        option.textContent = season;
        // Set the 'selected' attribute if the season matches the determined current season
        if (season === currentSeason) {
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

    const toggleBtn = document.getElementById('toggle-all-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const isCollapsed = toggleBtn.textContent === 'Expand All';
            if (isCollapsed) {
                document.querySelectorAll('.week-row').forEach(row => row.style.display = '');
                document.querySelectorAll('.arrow').forEach(arrow => arrow.textContent = '▼');
                toggleBtn.textContent = 'Collapse All';
            } else {
                document.querySelectorAll('.week-row').forEach(row => row.style.display = 'none');
                document.querySelectorAll('.arrow').forEach(arrow => arrow.textContent = '►');
                toggleBtn.textContent = 'Expand All';
            }
        });
    }
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
